require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const mysql   = require("mysql2/promise");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─────────────────────────────────────────────
//  CONEXIÓN DB
// ─────────────────────────────────────────────

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
});

// ─────────────────────────────────────────────
//  RUTAS
// ─────────────────────────────────────────────

// POST /api/capturas — recibe datos de Python y los guarda
app.post("/api/capturas", async (req, res) => {
  const { nombre, descripcion, configuracion, mediciones, waveforms } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Crear sesión
    const [sesionResult] = await conn.execute(
      "INSERT INTO sesiones (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );
    const sesionId = sesionResult.insertId;

    // 2. Guardar configuración
    if (configuracion && configuracion.length > 0) {
      const configValues = configuracion.map(c => [sesionId, c.parametro, c.comando_scpi, c.valor]);
      await conn.query(
        "INSERT INTO configuraciones (sesion_id, parametro, comando_scpi, valor) VALUES ?",
        [configValues]
      );
    }

    // 3. Guardar mediciones
    if (mediciones && mediciones.length > 0) {
      for (const m of mediciones) {
        await conn.execute(
          `INSERT INTO mediciones 
           (sesion_id, canal, frecuencia_hz, periodo_s, vpp, vmax, vmin, vrms, vmedio, amplitud)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sesionId, m.canal, m.frecuencia_hz, m.periodo_s,
           m.vpp, m.vmax, m.vmin, m.vrms, m.vmedio, m.amplitud]
        );
      }
    }

    // 4. Guardar puntos de onda
    for (const [canal, data] of Object.entries(waveforms || {})) {
      if (!data || !data.tiempos) continue;
      const puntos = data.tiempos.map((t, i) => [sesionId, canal, i, t, data.voltajes[i]]);
      const BATCH = 1000;
      for (let i = 0; i < puntos.length; i += BATCH) {
        const lote = puntos.slice(i, i + BATCH);
        await conn.query(
          "INSERT INTO waveform_points (sesion_id, canal, muestra, tiempo_s, voltaje_v) VALUES ?",
          [lote]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ ok: true, sesion_id: sesionId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/sesiones — lista todas las sesiones
app.get("/api/sesiones", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.nombre, s.descripcion, s.created_at,
              COUNT(DISTINCT wp.id) AS total_puntos,
              GROUP_CONCAT(DISTINCT m.canal) AS canales
       FROM sesiones s
       LEFT JOIN waveform_points wp ON wp.sesion_id = s.id
       LEFT JOIN mediciones m ON m.sesion_id = s.id
       GROUP BY s.id, s.nombre, s.descripcion, s.created_at
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sesiones/:id — detalle de una sesión
app.get("/api/sesiones/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [[sesion]]   = await pool.query("SELECT * FROM sesiones WHERE id = ?", [id]);
    const [config]     = await pool.query("SELECT * FROM configuraciones WHERE sesion_id = ?", [id]);
    const [mediciones] = await pool.query("SELECT * FROM mediciones WHERE sesion_id = ?", [id]);
    res.json({ sesion, config, mediciones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sesiones/:id/waveform?canal=CH1 — puntos de onda
app.get("/api/sesiones/:id/waveform", async (req, res) => {
  const { id }    = req.params;
  const { canal } = req.query;
  try {
    const where = canal ? "sesion_id = ? AND canal = ?" : "sesion_id = ?";
    const params = canal ? [id, canal] : [id];
    const [rows] = await pool.query(
      `SELECT muestra, tiempo_s, voltaje_v, canal FROM waveform_points WHERE ${where} ORDER BY canal, muestra`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sesiones/:id — eliminar sesión
app.delete("/api/sesiones/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM sesiones WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health
app.get("/api/health", (_, res) => res.json({ status: "ok", timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`WaveAnalytics backend corriendo en http://localhost:${PORT}`);
});
