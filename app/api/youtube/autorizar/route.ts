import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/acceso";

/**
 * Renovar el permiso de YouTube (solo desde tu PC, en local): manda a Google a pedirte permiso.
 * Al volver, /api/youtube/callback guarda el permiso nuevo en .env.local.
 */
export async function GET(req: Request) {
  if (!(await exigirSesion(req))) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "El permiso de YouTube se renueva desde tu PC (en local) y luego se copia a Vercel." }, { status: 400 });
  const id = process.env.YT_CLIENT_ID;
  if (!id) return NextResponse.json({ error: "Falta YT_CLIENT_ID en .env.local." }, { status: 503 });
  const origen = new URL(req.url).origin;
  const estado = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: id,
    redirect_uri: origen + "/",
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube",
    access_type: "offline",
    prompt: "consent",
    state: estado,
  }).toString();
  const r = NextResponse.redirect(url);
  r.cookies.set("gt_oauth_state", estado, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return r;
}
