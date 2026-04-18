export default function MedicionesCard({ label, value, unit, color }) {
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
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + "k";
    if (Math.abs(v) < 0.001) return (v * 1000).toFixed(2) + "m";
    return v.toFixed(4);
  };

  return (
    <div style={{
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      borderRadius: "var(--radius-lg)",
      padding:      "14px 16px",
    }}>
      <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: c.text, lineHeight: 1 }}>
        {fmt(value)}
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text3)", marginLeft: 4 }}>{unit}</span>
      </p>
    </div>
  );
}
