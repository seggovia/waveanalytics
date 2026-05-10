import styles from "../app/page.module.css";

export default function MedicionesCard({ label, value, unit, color, index = 0, tooltip }) {
  const colors = {
    accent: { bg: "rgba(79,142,247,0.1)", border: "rgba(79,142,247,0.3)", text: "#4f8ef7" },
    green:  { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  text: "#22c55e" },
    amber:  { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" },
    purple: { bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)", text: "#7c3aed" },
    red:    { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.3)",  text: "#ef4444" },
  };
  const c = colors[color] || colors.accent;

  const fmt = (v) => {
    if (v == null) return "N/D";
    const number = Number(v);
    if (!Number.isFinite(number)) return "N/D";
    if (Math.abs(number) >= 1000) return (number / 1000).toFixed(2) + "k";
    if (Math.abs(number) < 0.001 && number !== 0) return (number * 1000).toFixed(2) + "m";
    return number.toFixed(4);
  };

  return (
    <div
      className={styles.metricCard}
      data-tooltip={tooltip}
      title={tooltip}
      style={{
        "--metric-bg": c.bg,
        "--metric-border": c.border,
        "--metric-text": c.text,
        "--metric-delay": `${index * 60}ms`,
      }}
    >
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>
        {fmt(value)}
        <span>{unit}</span>
      </p>
    </div>
  );
}
