import { NextResponse } from "next/server";
import { correosPermitidos } from "@/lib/acceso";
import { claveValida, sesionActiva } from "@/lib/acceso-cuenta";
import { ErrorCuenta, almacenamiento, guardarCuenta, leerCuenta, validarPerfil, type Cuenta } from "@/lib/cuenta";
import { bloqueado, falloRegistrado, olvidarFallos, quienEs } from "@/lib/frenos";

const noSesion = () => NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });

/** Datos de la cuenta para mostrar en el panel (nunca la contraseña, ni su huella). */
export async function GET(req: Request) {
  if (!(await sesionActiva(req))) return noSesion();
  const c = await leerCuenta();
  const modo = almacenamiento();
  return NextResponse.json({
    perfil: { nombre: c?.nombre ?? "", apellido: c?.apellido ?? "", correo: c?.correo ?? correosPermitidos()[0] ?? "", telefono: c?.telefono ?? "" },
    claveDeLaApp: !!c?.clave,
    almacenamiento: modo,
    puedeGuardar: modo !== "ninguno",
    actualizado: c?.actualizado ?? null,
  });
}

/** Guarda nombre, apellido, correo y teléfono. Cambiar el correo exige la contraseña actual. */
export async function PUT(req: Request) {
  if (!(await sesionActiva(req))) return noSesion();
  const quien = "cuenta:" + quienEs(req);
  if (bloqueado(quien)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const perfil = validarPerfil(d);
    const actual = await leerCuenta();
    const correoAnterior = (actual?.correo ?? correosPermitidos()[0] ?? "").toLowerCase();
    if (correoAnterior && perfil.correo !== correoAnterior) {
      if (!(await claveValida(String(d.claveActual ?? "")))) {
        falloRegistrado(quien);
        throw new ErrorCuenta("Para cambiar el correo escribe tu contraseña actual (y debe ser correcta).");
      }
      olvidarFallos(quien);
    }
    const nueva: Cuenta = { ...perfil, clave: actual?.clave, sesionesDesde: actual?.sesionesDesde ?? 0, actualizado: new Date().toISOString() };
    await guardarCuenta(nueva);
    return NextResponse.json({ ok: true, perfil });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo guardar." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
