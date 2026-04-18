const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function getSesiones() {
  const res = await fetch(`${BASE}/sesiones`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al obtener sesiones");
  return res.json();
}

export async function getSesion(id) {
  const res = await fetch(`${BASE}/sesiones/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al obtener sesión");
  return res.json();
}

export async function getWaveform(id, canal) {
  const url = canal
    ? `${BASE}/sesiones/${id}/waveform?canal=${canal}`
    : `${BASE}/sesiones/${id}/waveform`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Error al obtener waveform");
  return res.json();
}

export async function deleteSesion(id) {
  const res = await fetch(`${BASE}/sesiones/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar sesión");
  return res.json();
}
