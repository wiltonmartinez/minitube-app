import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, crearSesion } from "@/lib/acceso";
import { usuarioDeSolicitud } from "@/lib/acceso-cuenta";
import { ErrorCuenta, problemaClaveNueva } from "@/lib/cuenta";
import { bloqueado, falloRegistrado, olvidarFallos, quienEs } from "@/lib/frenos";
import { actualizarUsuario, claveDeUsuario, crearClave } from "@/lib/usuarios";

/** Cambia la contraseña de quien tiene la sesión abierta: pide la actual, guarda la nueva (solo su huella) y cierra las demás sesiones suyas. */
export async function POST(req: Request) {
  const u = await usuarioDeSolicitud(req);
  if (!u) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  const quien = "clave:" + quienEs(req);
  if (bloqueado(quien)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const actual = String(d.actual ?? "");
    const nueva = String(d.nueva ?? "");
    if (!(await claveDeUsuario(u, actual))) {
      falloRegistrado(quien);
      throw new ErrorCuenta("La contraseña actual no es correcta.");
    }
    olvidarFallos(quien);
    const problema = problemaClaveNueva(nueva, actual);
    if (problema) throw new ErrorCuenta(problema);
    const ahora = Math.floor(Date.now() / 1000) * 1000; // las sesiones abiertas antes de este segundo dejan de valer
    const clave = await crearClave(nueva);
    await actualizarUsuario(u.id, (x) => ({ ...x, clave, sesionesDesde: ahora }));
    const r = NextResponse.json({ ok: true, mensaje: "Contraseña cambiada. Las demás sesiones abiertas se cerraron." });
    r.cookies.set(COOKIE_SESION, await crearSesion(ahora + 1000, u.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
    return r;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
