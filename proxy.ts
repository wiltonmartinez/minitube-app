import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import { sesionesDesde } from "@/lib/cuenta";

// Todo Gestor TUBE pide la contraseña (en producción siempre; en tu PC, si hay GESTOR_CLAVE en .env.local).
// Quedan libres solo: la pantalla de acceso, los archivos internos de Next, las imágenes públicas /Assets
// (los prompts las enlazan y Gemini, ChatGPT y fal.ai tienen que poder descargarlas) y la API v1 (lleva su propio token).
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // Al renovar el permiso de YouTube, Google vuelve a la raíz del sitio (http://localhost:PUERTO/) con ?code=…&state=…
  // (la ruta de destino vuelve a comprobar la sesión por su cuenta)
  if (pathname === "/" && searchParams.has("code") && searchParams.has("state") && req.cookies.has("gt_oauth_state")) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/youtube/callback";
    return NextResponse.rewrite(url);
  }
  if (await sesionValida(req.cookies.get(COOKIE_SESION)?.value, Date.now(), await sesionesDesde())) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  const url = new URL("/acceso", req.url);
  url.searchParams.set("volver", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|acceso|api/acceso|api/v1/|Assets/|favicon\.ico|robots\.txt|sitemap\.xml).*)"],
};
