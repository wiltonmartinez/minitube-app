import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";

// TexTUBE y sus rutas de YouTube solo se abren con la contraseña (en producción) para que nadie más pueda tocar el canal.
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  // Al renovar el permiso de YouTube, Google vuelve a la raíz del sitio (http://localhost:PUERTO/) con ?code=…&state=…
  if (pathname === "/") {
    if (searchParams.has("code") && searchParams.has("state") && req.cookies.has("gt_oauth_state")) {
      const url = req.nextUrl.clone();
      url.pathname = "/api/youtube/callback";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }
  if (await sesionValida(req.cookies.get(COOKIE_SESION)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  const url = new URL("/acceso", req.url);
  url.searchParams.set("volver", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/", "/textube/:path*", "/api/youtube/:path*"] };
