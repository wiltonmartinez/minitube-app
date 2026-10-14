import { NextResponse } from "next/server";
import { COOKIE_RECUPERACION, COOKIE_SESION, DURACION_RECUPERACION_S, DURACION_SESION_S, crearPermisoRecuperacion, crearSesion, verificarEnlaceAcceso } from "@/lib/acceso";
import { usuarioPorCorreo } from "@/lib/usuarios";

// Enlaces ya usados en esta instancia del servidor (mejor esfuerzo: cada enlace sirve una vez mientras la instancia siga viva).
const usados = new Set<string>();

/** Abre la sesión con el enlace que llegó por correo y lleva a la página de inicio. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const correo = await verificarEnlaceAcceso(token, Date.now(), async (c) => !!(await usuarioPorCorreo(c)));
  const usuario = correo ? await usuarioPorCorreo(correo) : null;
  const invalido = () => NextResponse.redirect(new URL("/acceso?enlace=invalido", url.origin));
  if (!usuario || !token || usados.has(token)) return invalido();
  usados.add(token);
  const r = NextResponse.redirect(new URL("/cuenta?recuperar=1", url.origin));
  r.cookies.set(COOKIE_SESION, await crearSesion(Date.now(), usuario.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
  r.cookies.set(COOKIE_RECUPERACION, await crearPermisoRecuperacion(usuario.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_RECUPERACION_S });
  return r;
}
