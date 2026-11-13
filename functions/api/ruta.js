// Cloudflare Pages Function: POST /api/ruta
// Recibe { places: ["Sevilla","Córdoba"], roundTrip: false } y devuelve los km de cada tramo.
// Usa OpenRouteService (clave en la variable de entorno ORS_API_KEY, nunca en el navegador).
const ORS = "https://api.heigit.org"; // la URL antigua api.openrouteservice.org está retirada

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  if (!env.ORS_API_KEY) return json({ error: "Falta configurar ORS_API_KEY" }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Petición no válida" }, 400); }

  const places = Array.isArray(body.places) ? body.places.map(p => String(p).trim()).filter(Boolean) : [];
  if (places.length < 2 || places.length > 8) return json({ error: "Indica entre 2 y 8 lugares" }, 400);
  if (places.some(p => p.length > 120)) return json({ error: "Nombre de lugar demasiado largo" }, 400);

  try {
    // 1) Geocodificar cada lugar
    const coords = await Promise.all(places.map(async (text) => {
      const url = `${ORS}/pelias/v1/search?api_key=${encodeURIComponent(env.ORS_API_KEY)}&size=1&text=${encodeURIComponent(text)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("geocodificación " + r.status + ": " + (await r.text()).slice(0, 150));
      const data = await r.json();
      const f = data.features && data.features[0];
      if (!f) throw new Error("notfound:" + text);
      return f.geometry.coordinates;
    }));

    const points = coords.slice();
    const names = places.slice();
    if (body.roundTrip) { points.push(points[0]); names.push(places[0]); }

    // 2) Ruta en coche pasando por todos los puntos (formato GeoJSON)
    const r = await fetch(`${ORS}/openrouteservice/v2/directions/driving-car/geojson`, {
      method: "POST",
      headers: { "Authorization": env.ORS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: points, instructions: false }),
    });
    if (!r.ok) throw new Error("ruta " + r.status + ": " + (await r.text()).slice(0, 150));
    const data = await r.json();
    const f = data.features && data.features[0];
    if (!f) throw new Error("directions");

    const legs = f.properties.segments.map((s, i) => ({
      desde: names[i], hasta: names[i + 1], km: Math.round(s.distance / 100) / 10,
    }));
    const total = Math.round(f.properties.summary.distance / 100) / 10;
    const minutos = Math.round(f.properties.summary.duration / 60);

    // Aligerar la línea del mapa (máx. ~800 puntos)
    let g = f.geometry.coordinates;
    const paso = Math.ceil(g.length / 800);
    g = g.filter((_, i) => i % paso === 0 || i === g.length - 1)
         .map(c => [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]);

    return json({ legs, total, minutos, geometry: g, puntos: points });
  } catch (e) {
    if (String(e.message).startsWith("notfound:"))
      return json({ error: "No encuentro el lugar: " + e.message.slice(9) }, 404);
    return json({ error: "No se pudo calcular la ruta (" + String(e.message).slice(0, 200) + ")" }, 502);
  }
}
