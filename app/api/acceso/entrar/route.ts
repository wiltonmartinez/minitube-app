import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, crearSesion, verificarEnlaceAcceso } from "@/lib/acceso";

// Enlaces ya usados en esta instancia del servidor (mejor esfuerzo: cada enlace sirve una vez mientras la instancia siga viva).
const usados = new Set<string>();

/** Abre la sesión con el enlace que llegó por correo y lleva a la página de inicio. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const correo = await verificarEnlaceAcceso(token);
  const invalido = () => NextResponse.redirect(new URL("/acceso?enlace=invalido", url.origin));
  if (!correo || !token || usados.has(token)) return invalido();
  usados.add(token);
  const r = NextResponse.redirect(new URL("/?entro=enlace", url.origin));
  r.cookies.set(COOKIE_SESION, await crearSesion(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
  return r;
}
