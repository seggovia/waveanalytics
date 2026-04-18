export default function ConfigTable({ config }) {
  const con_valor = config.filter(c => c.valor && c.valor !== "N/D");
  const sin_valor = config.filter(c => !c.valor || c.valor === "N/D");

  return (
    <div style={{ overflowX: "auto", padding: "0.5rem 1rem 1rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Parámetro", "Comando SCPI", "Valor"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "8px 12px",
                color: "var(--text3)", fontWeight: 600, fontSize: 11,
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: "1px solid var(--border)"
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {con_valor.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "7px 12px", color: "var(--text2)" }}>{row.parametro}</td>
              <td style={{ padding: "7px 12px", color: "var(--text3)", fontFamily: "monospace" }}>{row.comando_scpi}</td>
              <td style={{ padding: "7px 12px", color: "var(--accent)", fontWeight: 500 }}>{row.valor}</td>
            </tr>
          ))}
          {sin_valor.map((row, i) => (
            <tr key={`nd-${i}`} style={{ opacity: 0.4 }}>
              <td style={{ padding: "5px 12px", color: "var(--text3)" }}>{row.parametro}</td>
              <td style={{ padding: "5px 12px", color: "var(--text3)", fontFamily: "monospace" }}>{row.comando_scpi}</td>
              <td style={{ padding: "5px 12px", color: "var(--text3)" }}>N/D</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
