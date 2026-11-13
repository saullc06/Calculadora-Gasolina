// Genera las páginas "Cuánto cuesta ir de X a Y" + sitemap.xml + robots.txt.
// Uso (PowerShell):  $env:ORS_API_KEY="tu_token"; $env:DOMINIO="https://tudominio.es"; node generar-rutas.mjs
// Uso (Mac/Linux):   ORS_API_KEY=tu_token DOMINIO=https://tudominio.es node generar-rutas.mjs
// Necesita Node 18 o superior. Las distancias se guardan en rutas-datos.json para no repetir consultas.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.ORS_API_KEY;
const DOM = (process.env.DOMINIO || "").replace(/\/$/, "");
if (!KEY || !DOM) { console.error("Faltan ORS_API_KEY y/o DOMINIO (ver cabecera del archivo)."); process.exit(1); }

const ORS = "https://api.heigit.org";
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rutas = JSON.parse(await readFile("rutas.json", "utf8"));
let cache = {};
try { cache = JSON.parse(await readFile("rutas-datos.json", "utf8")); } catch {}

async function geocode(t) {
  const r = await fetch(`${ORS}/pelias/v1/search?api_key=${KEY}&size=1&text=${encodeURIComponent(t)}`);
  const f = (await r.json()).features?.[0];
  if (!f) throw new Error("No encuentro " + t);
  return f.geometry.coordinates;
}
async function medir(a, b) {
  const pts = [await geocode(a), await geocode(b)];
  const r = await fetch(`${ORS}/openrouteservice/v2/directions/driving-car/geojson`, {
    method: "POST", headers: { Authorization: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: pts, instructions: false }),
  });
  if (!r.ok) throw new Error("Ruta " + a + "-" + b + " falló (" + r.status + ")");
  const s = (await r.json()).features[0].properties.summary;
  return { km: Math.round(s.distance / 100) / 10, min: Math.round(s.duration / 60) };
}

for (const r of rutas) {
  const id = slug(r.desde) + "-" + slug(r.hasta);
  if (!cache[id]) { console.log("Calculando", r.desde, "→", r.hasta); cache[id] = await medir(r.desde, r.hasta); await sleep(2000); }
}
await writeFile("rutas-datos.json", JSON.stringify(cache, null, 1));

const hm = m => (m >= 60 ? Math.floor(m / 60) + " h " : "") + (m % 60) + " min";
const CSS = `:root{color-scheme:light dark}body{font-family:"Segoe UI",system-ui,sans-serif;line-height:1.6;max-width:720px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.6rem}h2{font-size:1.15rem;margin-top:1.6em}.caja{border:1px solid #8886;border-radius:12px;padding:16px;margin:16px 0}input{font:inherit;padding:8px;width:6em}a.btn{display:inline-block;padding:12px 16px;border-radius:8px;background:#1f6f54;color:#fff;text-decoration:none;font-weight:600}footer{font-size:.85rem;margin-top:32px}`;
const foot = `<footer><a href="/">Calculadora</a> · <a href="/rutas/">Rutas</a> · <a href="/aviso-legal.html">Aviso legal</a> · <a href="/privacidad.html">Privacidad</a> · <a href="/cookies.html">Cookies</a></footer>`;

function pagina(r, d, id) {
  const t = `Cuánto cuesta ir de ${r.desde} a ${r.hasta} en coche`;
  const desc = `${r.desde} - ${r.hasta}: ${d.km} km y unos ${hm(d.min)} en coche. Calcula la gasolina y cuánto paga cada pasajero.`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} (gasolina y reparto)</title><meta name="description" content="${desc}">
<link rel="canonical" href="${DOM}/rutas/${id}.html">
<!-- ADSENSE: pega aquí el código de AdSense cuando te lo den -->
<style>${CSS}</style></head><body>
<p><a href="/">← Calculadora de gasolina</a></p>
<h1>${t}</h1>
<p>${r.desde} y ${r.hasta} están a unos <strong>${d.km} km</strong> por carretera, un trayecto de unos <strong>${hm(d.min)}</strong> sin paradas. Con esos kilómetros, el gasto de combustible depende sobre todo del consumo de tu coche y del precio del litro ese día.</p>
<div class="caja"><h2 style="margin-top:0">Coste estimado de gasolina (solo ida)</h2>
<p><label>Consumo (L/100 km) <input id="c" type="number" value="6.5" step="0.1" min="1"></label>
 <label>Personas <input id="n" type="number" value="1" min="1" max="8"></label></p>
<p>Precio medio gasolina 95 en la provincia de salida: <strong id="p">…</strong></p>
<p>Gasolina necesaria: <strong id="l"></strong> · Coste: <strong id="t"></strong> · Por persona: <strong id="e"></strong></p></div>
<p><a class="btn" href="/?ruta=${encodeURIComponent(r.desde + "|" + r.hasta)}">Calcular con mi coche, mis paradas y el mapa</a></p>
<h2>Cómo ahorrar en este viaje</h2>
<p>Compartir coche es la forma más directa de reducir el coste por persona. Mantener una velocidad constante, llevar bien la presión de los neumáticos y repostar en gasolineras baratas de la zona también marca la diferencia. Los peajes y el parking no están incluidos en esta estimación.</p>
<p style="font-size:.85rem">Distancia y tiempo estimados con OpenRouteService; pueden variar según el tráfico y la ruta elegida.</p>
${foot}
<script>
const KM=${d.km}, PROV="${r.provincia}"; let precio=1.55;
const $=i=>document.getElementById(i), f=(n,x=2)=>n.toLocaleString("es-ES",{maximumFractionDigits:x});
function up(){const l=KM*$("c").value/100,t=l*precio;$("p").textContent=f(precio,3)+" €/L";$("l").textContent=f(l,1)+" L";$("t").textContent=f(t)+" €";$("e").textContent=f(t/Math.max(1,$("n").value))+" €";}
$("c").oninput=$("n").oninput=up; up();
fetch("/api/precio?provincia="+PROV).then(r=>r.json()).then(d=>{if(d.precios&&d.precios.gasolina95){precio=d.precios.gasolina95.media;up();}}).catch(()=>{$("p").textContent+=" (orientativo)";});
</script></body></html>`;
}

await mkdir("public/rutas", { recursive: true });
const urls = ["/", "/rutas/", "/aviso-legal.html", "/privacidad.html", "/cookies.html"];
let lista = "";
for (const r of rutas) {
  const id = slug(r.desde) + "-" + slug(r.hasta);
  await writeFile(`public/rutas/${id}.html`, pagina(r, cache[id], id));
  urls.push(`/rutas/${id}.html`);
  lista += `<li><a href="/rutas/${id}.html">De ${r.desde} a ${r.hasta}</a> (${cache[id].km} km)</li>`;
}
await writeFile("public/rutas/index.html", `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rutas frecuentes en coche: distancia y gasolina</title><meta name="description" content="Distancia, tiempo y coste de gasolina de las rutas en coche más habituales en España."><style>${CSS}</style></head><body><p><a href="/">← Calculadora de gasolina</a></p><h1>Rutas frecuentes</h1><ul>${lista}</ul>${foot}</body></html>`);
await writeFile("public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${DOM}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile("public/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${DOM}/sitemap.xml\n`);
console.log("Listo:", rutas.length, "páginas de rutas + sitemap.xml + robots.txt en /public");
