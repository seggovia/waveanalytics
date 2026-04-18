"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import WaveformChart from "../components/WaveformChart";
import MedicionesCard from "../components/MedicionesCard";
import ConfigTable from "../components/ConfigTable";
import styles from "./page.module.css";

export default function Dashboard() {
  const [sesiones, setSesiones]       = useState([]);
  const [sesionId, setSesionId]       = useState(null);
  const [detalle, setDetalle]         = useState(null);
  const [waveform, setWaveform]       = useState([]);
  const [canalActivo, setCanalActivo] = useState("CH1");
  const [loading, setLoading]         = useState(false);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [comparar, setComparar]       = useState(false);
  const [sesion2Id, setSesion2Id]     = useState(null);
  const [waveform2, setWaveform2]     = useState([]);

  const BASE = "http://localhost:3001/api";

  const fetchSesiones = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/sesiones`);
      const data = await res.json();
      setSesiones(data);
      if (data.length > 0 && !sesionId) setSesionId(data[0].id);
    } catch {}
  }, [sesionId]);

  useEffect(() => { fetchSesiones(); }, [fetchSesiones]);

  useEffect(() => {
    if (!sesionId) return;
    setLoading(true);
    Promise.all([
      fetch(`${BASE}/sesiones/${sesionId}`).then(r => r.json()),
      fetch(`${BASE}/sesiones/${sesionId}/waveform?canal=${canalActivo}`).then(r => r.json()),
    ]).then(([det, wav]) => {
      setDetalle(det);
      setWaveform(wav);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [sesionId, canalActivo]);

  useEffect(() => {
    if (!comparar || !sesion2Id) { setWaveform2([]); return; }
    fetch(`${BASE}/sesiones/${sesion2Id}/waveform?canal=${canalActivo}`)
      .then(r => r.json()).then(setWaveform2).catch(() => setWaveform2([]));
  }, [comparar, sesion2Id, canalActivo]);

  const sesionesFiltradas = filtroFecha
    ? sesiones.filter(s => s.created_at?.startsWith(filtroFecha))
    : sesiones;

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta sesión?")) return;
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

  return (
    <div className={styles.layout}>

      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⌇</span>
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
                  {s.created_at ? format(new Date(s.created_at), "dd MMM HH:mm", { locale: es }) : "—"}
                  &nbsp;·&nbsp;{s.total_puntos?.toLocaleString()} pts
                </div>
                <button
                  className={styles.btnDelete}
                  onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                >✕</button>
              </div>
            ))}
            {sesionesFiltradas.length === 0 && (
              <p className={styles.empty}>Sin capturas aún.<br/>Ejecuta el script Python.</p>
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

        {/* MÉTRICAS */}
        {medicionSesion && (
          <div className={styles.metricsGrid}>
            <MedicionesCard label="Frecuencia" value={medicionSesion.frecuencia_hz} unit="Hz" color="accent" />
            <MedicionesCard label="Vpp" value={medicionSesion.vpp} unit="V" color="green" />
            <MedicionesCard label="Vrms" value={medicionSesion.vrms} unit="V" color="amber" />
            <MedicionesCard label="Amplitud" value={medicionSesion.amplitud} unit="V" color="purple" />
            <MedicionesCard label="Vmax" value={medicionSesion.vmax} unit="V" color="green" />
            <MedicionesCard label="Vmin" value={medicionSesion.vmin} unit="V" color="red" />
          </div>
        )}

        {/* GRÁFICO ONDA */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Forma de onda — {canalActivo}</span>
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
            <div className={styles.cardHeader}>Configuración del osciloscopio</div>
            <ConfigTable config={detalle.config} />
          </div>
        )}

      </main>
    </div>
  );
}
