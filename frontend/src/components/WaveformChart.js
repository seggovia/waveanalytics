"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from "chart.js";
import styles from "../app/page.module.css";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export default function WaveformChart({ data, data2, canal, label1, label2 }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [range, setRange] = useState({ start: 0, end: 100 });

  useEffect(() => {
    setRange({ start: 0, end: 100 });
  }, [data, canal]);

  const visibleData = useMemo(() => {
    if (!data?.length) return [];
    const startIndex = Math.floor((range.start / 100) * data.length);
    const endIndex = Math.max(startIndex + 1, Math.ceil((range.end / 100) * data.length));
    return data.slice(startIndex, endIndex);
  }, [data, range]);

  const visibleData2 = useMemo(() => {
    if (!data2?.length) return [];
    const startIndex = Math.floor((range.start / 100) * data2.length);
    const endIndex = Math.max(startIndex + 1, Math.ceil((range.end / 100) * data2.length));
    return data2.slice(startIndex, endIndex);
  }, [data2, range]);

  useEffect(() => {
    if (!canvasRef.current || !visibleData.length) return;

    if (chartRef.current) chartRef.current.destroy();

    const MAX_POINTS = 2000;
    const paso = Math.max(1, Math.floor(visibleData.length / MAX_POINTS));
    const sampled = visibleData.filter((_, i) => i % paso === 0);

    const labels   = sampled.map(p => Number(p.tiempo_s).toExponential(2));
    const voltajes = sampled.map(p => p.voltaje_v);

    const datasets = [{
      label:           label1 || canal,
      data:            voltajes,
      borderColor:     "#4f8ef7",
      backgroundColor: "rgba(79,142,247,0.08)",
      borderWidth:     1.5,
      pointRadius:     0,
      fill:            true,
      tension:         0.3,
    }];

    if (visibleData2.length) {
      const paso2 = Math.max(1, Math.floor(visibleData2.length / MAX_POINTS));
      const sampled2 = visibleData2.filter((_, i) => i % paso2 === 0);
      datasets.push({
        label:       label2 || "Comparacion",
        data:        sampled2.map(p => p.voltaje_v),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.05)",
        borderWidth: 1.5,
        pointRadius: 0,
        fill:        false,
        tension:     0.3,
      });
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        animation:   false,
        responsive:  true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 20 }
          },
          tooltip: {
            backgroundColor: "#1a1d27",
            borderColor:     "#2e3347",
            borderWidth:     1,
            titleColor:      "#e2e8f0",
            bodyColor:       "#94a3b8",
            callbacks: {
              title: items => `t = ${items[0].label} s`,
              label: item => ` ${item.dataset.label}: ${Number(item.raw).toFixed(4)} V`,
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#64748b", maxTicksLimit: 10, font: { size: 11 },
              maxRotation: 0,
            },
            grid: { color: "rgba(46,51,71,0.8)" },
            title: { display: true, text: "Tiempo (s)", color: "#64748b", font: { size: 12 } }
          },
          y: {
            ticks: { color: "#64748b", font: { size: 11 } },
            grid: { color: "rgba(46,51,71,0.8)" },
            title: { display: true, text: "Voltaje (V)", color: "#64748b", font: { size: 12 } }
          }
        }
      }
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [visibleData, visibleData2, label1, label2, canal]);

  const updateStart = (value) => {
    const nextStart = Math.min(Number(value), range.end - 1);
    setRange(current => ({ ...current, start: nextStart }));
  };

  const updateEnd = (value) => {
    const nextEnd = Math.max(Number(value), range.start + 1);
    setRange(current => ({ ...current, end: nextEnd }));
  };

  if (!data?.length) {
    return (
      <div className={styles.chartEmpty}>
        Sin datos de forma de onda para esta sesion.
      </div>
    );
  }

  return (
    <div className={styles.chartShell}>
      <div className={styles.chartCanvas}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.zoomControls}>
        <div className={styles.zoomHeader}>
          <span>Zoom de muestras</span>
          <strong>{range.start}% - {range.end}%</strong>
        </div>
        <label className={styles.rangeRow}>
          Inicio
          <input
            type="range"
            min="0"
            max="99"
            value={range.start}
            onChange={e => updateStart(e.target.value)}
          />
        </label>
        <label className={styles.rangeRow}>
          Fin
          <input
            type="range"
            min="1"
            max="100"
            value={range.end}
            onChange={e => updateEnd(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
