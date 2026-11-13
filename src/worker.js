// Worker: atiende /api/* con las funciones y deja que Cloudflare sirva el resto desde /public.
import { onRequestPost as ruta } from "../functions/api/ruta.js";
import { onRequestGet as precio } from "../functions/api/precio.js";

const nf = () => new Response(JSON.stringify({ error: "No encontrado" }),
  { status: 404, headers: { "Content-Type": "application/json" } });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/ruta" && request.method === "POST") return ruta({ request, env });
    if (pathname === "/api/precio" && request.method === "GET") return precio({ request, env });
    if (pathname.startsWith("/api/")) return nf();
    return env.ASSETS.fetch(request);
  },
};
