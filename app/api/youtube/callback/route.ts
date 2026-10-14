import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/acceso-cuenta";
import { olvidarTokenDeAcceso } from "@/lib/textube/youtube";

/** Vuelta de Google al renovar el permiso: cambia el código por el permiso permanente y lo guarda en .env.local (solo en local). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (mensaje: string, bien = false) => {
    const r = NextResponse.redirect(new URL(`/textube?${bien ? "autorizado=1" : "autorizacion=" + encodeURIComponent(mensaje)}`, url.origin));
    r.cookies.set("gt_oauth_state", "", { path: "/", maxAge: 0 });
    return r;
  };
  if (!(await exigirAdmin(req))) return NextResponse.json({ error: "Solo un administrador puede renovar el permiso de YouTube." }, { status: 403 });
  if (process.env.NODE_ENV !== "development") return volver("El permiso se renueva desde tu PC (en local).");
  const guardado = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith("gt_oauth_state="))?.slice(15);
  if (url.searchParams.get("error")) return volver("No diste el permiso en Google, así que no se cambió nada.");
  if (!guardado || guardado !== url.searchParams.get("state")) return volver("La respuesta de Google no coincide con tu solicitud. Vuelve a intentarlo.");
  const code = url.searchParams.get("code");
  if (!code) return volver("Google no devolvió el permiso.");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: process.env.YT_CLIENT_ID ?? "", client_secret: process.env.YT_CLIENT_SECRET ?? "", redirect_uri: url.origin + "/", grant_type: "authorization_code" }),
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.refresh_token) return volver("Google no entregó un permiso renovable. Inténtalo de nuevo y acepta todos los permisos.");
  // se guarda en .env.local (reemplaza la línea anterior) y se usa ya, sin reiniciar
  const archivo = path.join(process.cwd(), ".env.local");
  let texto = "";
  try {
    texto = await fs.readFile(archivo, "utf-8");
  } catch {
    /* no existía */
  }
  const linea = `YT_REFRESH_TOKEN=${d.refresh_token}`;
  texto = /^YT_REFRESH_TOKEN=.*$/m.test(texto) ? texto.replace(/^YT_REFRESH_TOKEN=.*$/m, () => linea) : texto.replace(/\n?$/, "\n") + linea + "\n";
  await fs.writeFile(archivo, texto, "utf-8");
  process.env.YT_REFRESH_TOKEN = d.refresh_token;
  olvidarTokenDeAcceso();
  return volver("", true);
}
