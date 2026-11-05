// Cloudflare Pages Function: GET /api/precio?provincia=41&combustible=gasolina95
// Precios oficiales del Ministerio (servicio REST de carburantes, abierto).
const FIELDS = {
  gasolina95: "Precio Gasolina 95 E5",
  gasolina98: "Precio Gasolina 98 E5",
  diesel: "Precio Gasoleo A",
  dieselplus: "Precio Gasoleo Premium",
};
const BASE = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" },
  });

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const prov = u.searchParams.get("provincia") || "";
  const field = FIELDS[u.searchParams.get("combustible") || ""];
  if (!/^\d{2}$/.test(prov) || !field) return json({ error: "Parámetros no válidos" }, 400);

  try {
    const r = await fetch(BASE + prov, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("minetur");
    const data = await r.json();
    const precios = (data.ListaEESSPrecio || [])
      .map(e => parseFloat(String(e[field] || "").replace(",", ".")))
      .filter(n => n > 0);
    if (!precios.length) return json({ error: "Sin datos para ese combustible" }, 404);
    const media = precios.reduce((a, b) => a + b, 0) / precios.length;
    return json({
      media: Math.round(media * 1000) / 1000,
      minimo: Math.min(...precios),
      n: precios.length,
      fecha: data.Fecha || null,
    });
  } catch {
    return json({ error: "No se pudo obtener el precio" }, 502);
  }
}
