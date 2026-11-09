// Cloudflare Pages Function: GET /api/precio?provincia=41[&municipio=Sevilla]
// Devuelve, para la provincia (o un municipio), el precio medio y el más barato de cada combustible,
// más la lista de municipios para rellenar el desplegable. Datos oficiales del Ministerio.
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
  const mun = (u.searchParams.get("municipio") || "").slice(0, 80);
  if (!/^\d{2}$/.test(prov)) return json({ error: "Parámetros no válidos" }, 400);

  try {
    const r = await fetch(BASE + prov, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("minetur");
    const data = await r.json();
    const todas = data.ListaEESSPrecio || [];

    const municipios = [...new Set(todas.map(e => e.Municipio).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "es"));
    const lista = mun ? todas.filter(e => e.Municipio === mun) : todas;
    if (!lista.length) return json({ error: "No hay gasolineras en ese municipio" }, 404);

    const precios = {};
    for (const [clave, campo] of Object.entries(FIELDS)) {
      let suma = 0, n = 0, min = Infinity, barata = null;
      for (const e of lista) {
        const v = parseFloat(String(e[campo] || "").replace(",", "."));
        if (!(v > 0)) continue;
        suma += v; n++;
        if (v < min) { min = v; barata = e; }
      }
      if (n) precios[clave] = {
        media: Math.round((suma / n) * 1000) / 1000,
        minimo: min,
        n,
        barata: {
          rotulo: barata["Rótulo"] || "",
          direccion: [barata["Dirección"], barata.Localidad].filter(Boolean).join(", "),
        },
      };
    }
    return json({ fecha: data.Fecha || null, ambito: mun || "la provincia", municipios, precios });
  } catch {
    return json({ error: "No se pudo obtener el precio" }, 502);
  }
}
