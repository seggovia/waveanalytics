require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waveanalytics',
    waitForConnections: true,
    connectionLimit: 10,
  });

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const sessions = Array.from({ length: 10 }, (_, index) => ({
      nombre: `Sesión dummy ${index + 1}`,
      descripcion: `Datos de prueba para verificación ${index + 1}`,
    }));

    for (const [index, session] of sessions.entries()) {
      const [result] = await conn.execute(
        'INSERT INTO sesiones (nombre, descripcion) VALUES (?, ?)',
        [session.nombre, session.descripcion]
      );
      const sesionId = result.insertId;

      await conn.execute(
        'INSERT INTO configuraciones (sesion_id, parametro, comando_scpi, valor) VALUES (?, ?, ?, ?)',
        [sesionId, 'Timebase', 'TIMEBASE', '5ms']
      );
      await conn.execute(
        'INSERT INTO configuraciones (sesion_id, parametro, comando_scpi, valor) VALUES (?, ?, ?, ?)',
        [sesionId, 'Volts/Div', 'VOLT_DIV', '1V']
      );

      await conn.execute(
        `INSERT INTO mediciones (sesion_id, canal, frecuencia_hz, periodo_s, vpp, vmax, vmin, vrms, vmedio, amplitud, ciclo_trabajo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sesionId, 'CH1', 1000, 0.001, 2.5, 1.25, -1.25, 0.88, 0.0, 2.5, 50.0]
      );

      if ((index + 1) % 2 === 0) {
        await conn.execute(
          `INSERT INTO mediciones (sesion_id, canal, frecuencia_hz, periodo_s, vpp, vmax, vmin, vrms, vmedio, amplitud, ciclo_trabajo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sesionId, 'CH2', 500, 0.002, 1.8, 0.9, -0.9, 0.64, 0.0, 1.8, 45.0]
        );
      }

      const points = [];
      for (let j = 0; j < 20; j += 1) {
        const tiempo = j * 0.0005;
        const voltaje = Number((1.5 * Math.sin((2 * Math.PI * j) / 20) + 0.1 * (index + 1)).toFixed(4));
        points.push([sesionId, 'CH1', j, tiempo, voltaje]);
      }
      await conn.query(
        'INSERT INTO waveform_points (sesion_id, canal, muestra, tiempo_s, voltaje_v) VALUES ?',
        [points]
      );

      if ((index + 1) % 2 === 0) {
        const points2 = [];
        for (let j = 0; j < 20; j += 1) {
          const tiempo = j * 0.0005;
          const voltaje = Number((1.0 * Math.cos((2 * Math.PI * j) / 20) - 0.05 * (index + 1)).toFixed(4));
          points2.push([sesionId, 'CH2', j, tiempo, voltaje]);
        }
        await conn.query(
          'INSERT INTO waveform_points (sesion_id, canal, muestra, tiempo_s, voltaje_v) VALUES ?',
          [points2]
        );
      }
    }

    await conn.commit();
    console.log('Seed complete: 10 sesiones, 200 waveform points, configuraciones y mediciones generadas.');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err.message || err);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
