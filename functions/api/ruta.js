// Cloudflare Pages Function: POST /api/ruta
// Recibe { places: ["Sevilla","Córdoba"], roundTrip: false } y devuelve los km de cada tramo.
// Usa OpenRouteService (clave en la variable de entorno ORS_API_KEY, nunca en el navegador).
const ORS = "https://api.openrouteservice.org";

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
      const url = `${ORS}/geocode/search?api_key=${encodeURIComponent(env.ORS_API_KEY)}&size=1&text=${encodeURIComponent(text)}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("geocode");
      const data = await r.json();
      const f = data.features && data.features[0];
      if (!f) throw new Error("notfound:" + text);
      return f.geometry.coordinates;
    }));

    const points = coords.slice();
    const names = places.slice();
    if (body.roundTrip) { points.push(points[0]); names.push(places[0]); }

    // 2) Ruta en coche pasando por todos los puntos
    const r = await fetch(`${ORS}/v2/directions/driving-car`, {
      method: "POST",
      headers: { "Authorization": env.ORS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: points, geometry: false, instructions: false }),
    });
    if (!r.ok) throw new Error("directions");
    const data = await r.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error("directions");

    const legs = route.segments.map((s, i) => ({
      desde: names[i], hasta: names[i + 1], km: Math.round(s.distance / 100) / 10,
    }));
    const total = Math.round(route.summary.distance / 100) / 10;
    return json({ legs, total });
  } catch (e) {
    if (String(e.message).startsWith("notfound:"))
      return json({ error: "No encuentro el lugar: " + e.message.slice(9) }, 404);
    return json({ error: "No se pudo calcular la ruta" }, 502);
  }
}
