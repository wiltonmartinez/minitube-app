import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, crearSesion } from "@/lib/acceso";
import { claveValida, sesionActiva } from "@/lib/acceso-cuenta";
import { ErrorCuenta, crearClave, guardarCuenta, leerCuenta, problemaClaveNueva, type Cuenta } from "@/lib/cuenta";
import { bloqueado, falloRegistrado, olvidarFallos, quienEs } from "@/lib/frenos";
import { correosPermitidos } from "@/lib/acceso";

/** Cambia la contraseña: pide la actual, guarda la nueva (solo su huella) y cierra las demás sesiones abiertas. */
export async function POST(req: Request) {
  if (!(await sesionActiva(req))) return NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });
  const quien = "clave:" + quienEs(req);
  if (bloqueado(quien)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const actual = String(d.actual ?? "");
    const nueva = String(d.nueva ?? "");
    if (!(await claveValida(actual))) {
      falloRegistrado(quien);
      throw new ErrorCuenta("La contraseña actual no es correcta.");
    }
    olvidarFallos(quien);
    const problema = problemaClaveNueva(nueva, actual);
    if (problema) throw new ErrorCuenta(problema);
    const c = await leerCuenta();
    const ahora = Math.floor(Date.now() / 1000) * 1000; // las sesiones abiertas antes de este segundo dejan de valer
    const guardada: Cuenta = { nombre: c?.nombre ?? "", apellido: c?.apellido ?? "", correo: c?.correo ?? correosPermitidos()[0] ?? "", telefono: c?.telefono ?? "", clave: await crearClave(nueva), sesionesDesde: ahora, actualizado: new Date().toISOString() };
    await guardarCuenta(guardada);
    const r = NextResponse.json({ ok: true, mensaje: "Contraseña cambiada. Las demás sesiones abiertas se cerraron." });
    r.cookies.set(COOKIE_SESION, await crearSesion(ahora + 1000), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
    return r;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
