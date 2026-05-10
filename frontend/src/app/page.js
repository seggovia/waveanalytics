"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import WaveformChart from "../components/WaveformChart";
import MedicionesCard from "../components/MedicionesCard";
import ConfigTable from "../components/ConfigTable";
import styles from "./page.module.css";

const BASE = "http://localhost:3001/api";

const getNewestSession = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA || b.id - a.id;
  })[0];
};

export default function Dashboard() {
  const [sesiones, setSesiones]       = useState([]);
  const [sesionId, setSesionId]       = useState(null);
  const [detalle, setDetalle]         = useState(null);
  const [waveform, setWaveform]       = useState([]);
  const [canalActivo, setCanalActivo] = useState("CH1");
  const [loading, setLoading]         = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [comparar, setComparar]       = useState(false);
  const [sesion2Id, setSesion2Id]     = useState(null);
  const [waveform2, setWaveform2]     = useState([]);
  const [live, setLive]               = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const fetchSesiones = useCallback(async (selectNewest = false) => {
    try {
      const res = await fetch(`${BASE}/sesiones`);
      if (!res.ok) {
        console.error("Error al obtener sesiones", res.status);
        setSesiones([]);
        return;
      }
      const data = await res.json();
      const safeData = Array.isArray(data) ? data : [];
      const newest = getNewestSession(safeData);

      setSesiones(safeData);
      if (selectNewest && newest) {
        setSesionId(newest.id);
      } else if (newest) {
        setSesionId(prev => prev || newest.id);
      }
    } catch (err) {
      console.error("Error al obtener sesiones", err);
      setSesiones([]);
    }
  }, []);

  useEffect(() => { fetchSesiones(); }, [fetchSesiones]);

  useEffect(() => {
    if (!live) return;
    fetchSesiones(true);
    const interval = setInterval(() => fetchSesiones(true), 5000);
    return () => clearInterval(interval);
  }, [live, fetchSesiones]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${BASE}/health`);
        setBackendOnline(res.ok);
      } catch (err) {
        setBackendOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sesionId) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/sesiones/${sesionId}`),
      fetch(`${BASE}/sesiones/${sesionId}/waveform?canal=${canalActivo}`),
    ]).then(async ([detRes, wavRes]) => {
      if (!detRes.ok || !wavRes.ok) {
        throw new Error("Error al obtener detalles de sesion");
      }
      const det = await detRes.json();
      const wav = await wavRes.json();
      setDetalle(det);
      setWaveform(wav);
    }).catch(err => {
      console.error(err);
      setDetalle(null);
      setWaveform([]);
    }).finally(() => setLoading(false));
  }, [sesionId, canalActivo]);

  useEffect(() => {
    if (!comparar || !sesion2Id) { setWaveform2([]); return; }
    fetch(`${BASE}/sesiones/${sesion2Id}/waveform?canal=${canalActivo}`)
      .then(res => {
        if (!res.ok) throw new Error("Error al obtener waveform comparativa");
        return res.json();
      })
      .then(setWaveform2)
      .catch(err => {
        console.error(err);
        setWaveform2([]);
      });
  }, [comparar, sesion2Id, canalActivo]);

  const sesionesFiltradas = sesiones.filter(s => {
    const matchesDate = filtroFecha ? s.created_at?.startsWith(filtroFecha) : true;
    const matchesName = filtroNombre
      ? s.nombre?.toLowerCase().includes(filtroNombre.toLowerCase())
      : true;
    return matchesDate && matchesName;
  });

  const handleDelete = async (id) => {
    if (!confirm("Eliminar esta sesion?")) return;
    await fetch(`${BASE}/sesiones/${id}`, { method: "DELETE" });
    fetchSesiones();
    if (sesionId === id) { setSesionId(null); setDetalle(null); setWaveform([]); }
  };

  const exportExcel = () => {
    if (!waveform.length) return;
    import("xlsx").then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(waveform.map(p => ({
        Muestra: p.muestra,
        "Tiempo (s)": p.tiempo_s,
        "Voltaje (V)": p.voltaje_v,
        Canal: p.canal,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Waveform");
      XLSX.writeFile(wb, `waveanalytics_sesion_${sesionId}.xlsx`);
    });
  };

  const medicionSesion = detalle?.mediciones?.find(m => m.canal === canalActivo);
  const ultimaCaptura = getNewestSession(sesiones);
  const frecuencias = detalle?.mediciones
    ?.map(m => Number(m.frecuencia_hz))
    .filter(v => Number.isFinite(v)) || [];
  const frecuenciaPromedio = frecuencias.length
    ? frecuencias.reduce((acc, value) => acc + value, 0) / frecuencias.length
    : null;

  return (
    <div className={styles.layout}>

      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>W</span>
          <span
            className={`${styles.statusDot} ${backendOnline ? styles.statusOnline : styles.statusOffline}`}
            title={backendOnline ? "Backend conectado" : "Backend sin respuesta"}
          />
          <span>WaveAnalytics</span>
        </div>

        <div className={styles.sideSection}>
          <p className={styles.sideLabel}>Filtrar por fecha</p>
          <input
            type="date"
            className={styles.input}
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
          />
          <p className={styles.sideLabel}>Buscar por nombre</p>
          <input
            type="search"
            className={styles.input}
            placeholder="Nombre de captura"
            value={filtroNombre}
            onChange={e => setFiltroNombre(e.target.value)}
          />
        </div>

        <div className={styles.sideSection}>
          <p className={styles.sideLabel}>Capturas ({sesionesFiltradas.length})</p>
          <div className={styles.sesionList}>
            {sesionesFiltradas.map(s => (
              <div
                key={s.id}
                className={`${styles.sesionItem} ${sesionId === s.id ? styles.active : ""}`}
                onClick={() => setSesionId(s.id)}
              >
                <div className={styles.sesionNombre}>{s.nombre}</div>
                <div className={styles.sesionMeta}>
                  {s.created_at ? format(new Date(s.created_at), "dd MMM HH:mm", { locale: es }) : "-"}
                  &nbsp;-&nbsp;{s.total_puntos?.toLocaleString()} pts
                </div>
                <button
                  className={styles.btnDelete}
                  onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                >x</button>
              </div>
            ))}
            {sesionesFiltradas.length === 0 && (
              <p className={styles.empty}>Sin capturas aun.<br/>Ejecuta el script Python.</p>
            )}
          </div>
        </div>

        <div className={styles.sideSection}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={comparar} onChange={e => setComparar(e.target.checked)} />
            Comparar con otra captura
          </label>
          {comparar && (
            <select
              className={styles.input}
              value={sesion2Id || ""}
              onChange={e => setSesion2Id(Number(e.target.value))}
            >
              <option value="">Seleccionar...</option>
              {sesiones.filter(s => s.id !== sesionId).map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>

        {/* TOPBAR */}
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.title}>
              {detalle?.sesion?.nombre || "Selecciona una captura"}
            </h1>
            {detalle?.sesion?.created_at && (
              <p className={styles.subtitle}>
                {format(new Date(detalle.sesion.created_at), "dd 'de' MMMM yyyy, HH:mm:ss", { locale: es })}
              </p>
            )}
          </div>
          <div className={styles.topActions}>
            <button
              className={`${styles.btnLive} ${live ? styles.liveActive : ""}`}
              onClick={() => setLive(value => !value)}
              type="button"
            >
              <span className={`${styles.liveDot} ${live ? styles.liveDotActive : ""}`} />
              Live
            </button>
            <div className={styles.canalToggle}>
              {["CH1", "CH2"].map(ch => (
                <button
                  key={ch}
                  className={`${styles.canalBtn} ${canalActivo === ch ? styles.canalActive : ""}`}
                  onClick={() => setCanalActivo(ch)}
                >{ch}</button>
              ))}
            </div>
            <button className={styles.btnExport} onClick={exportExcel}>
              Exportar Excel
            </button>
          </div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Total capturas</span>
            <strong>{sesiones.length.toLocaleString()}</strong>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Última captura</span>
            <strong>
              {ultimaCaptura?.created_at
                ? format(new Date(ultimaCaptura.created_at), "dd MMM HH:mm", { locale: es })
                : "N/D"}
            </strong>
          </div>
          <div className={styles.statsCard}>
            <span className={styles.statsLabel}>Frecuencia promedio</span>
            <strong>
              {frecuenciaPromedio == null ? "N/D" : `${frecuenciaPromedio.toFixed(2)} Hz`}
            </strong>
          </div>
        </div>

        {/* METRICAS */}
        {medicionSesion && (
          <div className={styles.metricsGrid}>
            <MedicionesCard label="Frecuencia" value={medicionSesion.frecuencia_hz} unit="Hz" color="accent" index={0} tooltip="Frecuencia estimada de la senal seleccionada." />
            <MedicionesCard label="Vpp" value={medicionSesion.vpp} unit="V" color="green" index={1} tooltip="Diferencia entre el voltaje maximo y minimo." />
            <MedicionesCard label="Vrms" value={medicionSesion.vrms} unit="V" color="amber" index={2} tooltip="Voltaje eficaz de la senal en la captura." />
            <MedicionesCard label="Amplitud" value={medicionSesion.amplitud} unit="V" color="purple" index={3} tooltip="Mitad del voltaje pico a pico." />
            <MedicionesCard label="Vmax" value={medicionSesion.vmax} unit="V" color="green" index={4} tooltip="Voltaje maximo registrado en el canal activo." />
            <MedicionesCard label="Vmin" value={medicionSesion.vmin} unit="V" color="red" index={5} tooltip="Voltaje minimo registrado en el canal activo." />
          </div>
        )}

        {/* GRAFICO ONDA */}
        <div className={`${styles.card} ${styles.waveformCard}`}>
          <div className={styles.cardHeader}>
            <span>Forma de onda - {canalActivo}</span>
            {comparar && sesion2Id && <span className={styles.badge}>Comparando</span>}
          </div>
          {loading
            ? <div className={styles.loading}>Cargando datos...</div>
            : <WaveformChart
                data={waveform}
                data2={comparar ? waveform2 : []}
                canal={canalActivo}
                label1={detalle?.sesion?.nombre}
                label2={sesiones.find(s => s.id === sesion2Id)?.nombre}
              />
          }
        </div>

        {/* CONFIG */}
        {detalle?.config?.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>Configuracion del osciloscopio</div>
            <ConfigTable config={detalle.config} />
          </div>
        )}

      </main>
    </div>
  );
}
