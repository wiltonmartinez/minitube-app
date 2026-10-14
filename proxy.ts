import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, accesoLibre, leerSesion } from "@/lib/acceso";
import { moduloDeRuta, primeraRuta, puedeAcceder } from "@/lib/modulos";
import { leerUsuarios, usuarioPorId } from "@/lib/usuarios";

// Todo Gestor TUBE pide iniciar sesión, y cada módulo solo se abre a los usuarios que lo tienen permitido (los administradores, a todos).
// Quedan libres solo: la pantalla de acceso, los archivos internos de Next, las imágenes públicas /Assets
// (los prompts las enlazan y Gemini, ChatGPT y fal.ai tienen que poder descargarlas) y la API v1 (lleva su propio token).
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // Al renovar el permiso de YouTube, Google vuelve a la raíz del sitio (http://localhost:PUERTO/) con ?code=…&state=…
  // (la ruta de destino vuelve a comprobar la sesión y que sea administrador)
  if (pathname === "/" && searchParams.has("code") && searchParams.has("state") && req.cookies.has("gt_oauth_state")) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/youtube/callback";
    return NextResponse.rewrite(url);
  }
  const esApi = pathname.startsWith("/api/");
  const sinSesion = () => {
    if (esApi) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
    const url = new URL("/acceso", req.url);
    url.searchParams.set("volver", pathname);
    return NextResponse.redirect(url);
  };

  // desarrollo sin contraseña configurada: entra el propietario
  let u = accesoLibre() ? ((await usuarioPorId("propietario")) ?? (await leerUsuarios())[0] ?? null) : null;
  if (!u) {
    const s = await leerSesion(req.cookies.get(COOKIE_SESION)?.value);
    if (!s) return sinSesion();
    const x = await usuarioPorId(s.uid);
    if (!x || !x.activo || s.emitidaMs < x.sesionesDesde) return sinSesion(); // borrado, desactivado o con la contraseña cambiada después
    u = x;
  }

  const modulo = moduloDeRuta(pathname);
  if (modulo === null) return NextResponse.next();
  const permitido = modulo === "admin" ? u.rol === "admin" : puedeAcceder(u, modulo);
  if (permitido) return NextResponse.next();
  if (esApi) return NextResponse.json({ error: modulo === "admin" ? "Solo un administrador puede hacer esto." : "No tienes acceso a este módulo." }, { status: 403 });
  // la página de inicio es PrompTUBE: a quien no la tiene se le manda a su primer módulo permitido
  const destino = pathname === "/" ? primeraRuta(u) : "/sin-acceso";
  const url = new URL(destino, req.url);
  if (destino === "/sin-acceso") url.searchParams.set("modulo", String(modulo));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|acceso|api/acceso|api/v1/|Assets/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
