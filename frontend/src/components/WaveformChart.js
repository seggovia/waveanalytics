"use client";
import { useEffect, useRef } from "react";
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export default function WaveformChart({ data, data2, canal, label1, label2 }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;

    if (chartRef.current) chartRef.current.destroy();

    const MAX_POINTS = 2000;
    const paso = Math.max(1, Math.floor(data.length / MAX_POINTS));
    const sampled = data.filter((_, i) => i % paso === 0);

    const labels   = sampled.map(p => p.tiempo_s.toExponential(2));
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

    if (data2?.length) {
      const paso2 = Math.max(1, Math.floor(data2.length / MAX_POINTS));
      const sampled2 = data2.filter((_, i) => i % paso2 === 0);
      datasets.push({
        label:       label2 || "Comparación",
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
              label: item => ` ${item.dataset.label}: ${item.raw.toFixed(4)} V`,
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
  }, [data, data2, label1, label2, canal]);

  if (!data?.length) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
        Sin datos de forma de onda para esta sesión.
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", height: 320 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
