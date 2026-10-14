import { NextResponse } from "next/server";
import { usuarioDeSolicitud } from "@/lib/acceso-cuenta";
import { ErrorCuenta, almacenamiento, validarPerfil } from "@/lib/cuenta";
import { bloqueado, falloRegistrado, olvidarFallos, quienEs } from "@/lib/frenos";
import { modulosDe } from "@/lib/modulos";
import { actualizarUsuario, claveDeUsuario } from "@/lib/usuarios";

const noSesion = () => NextResponse.json({ error: "Necesitas iniciar sesión." }, { status: 401 });

/** Los datos de quien tiene la sesión abierta (nunca la contraseña ni su huella), con su rol y sus módulos. */
export async function GET(req: Request) {
  const u = await usuarioDeSolicitud(req);
  if (!u) return noSesion();
  const modo = almacenamiento();
  return NextResponse.json({
    perfil: { nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono },
    rol: u.rol,
    modulos: modulosDe(u),
    claveDeLaApp: !!u.clave,
    almacenamiento: modo,
    puedeGuardar: modo !== "ninguno",
    actualizado: u.actualizado,
  });
}

/** Guarda nombre, apellido, correo y teléfono de quien tiene la sesión abierta. Cambiar el correo exige la contraseña actual. */
export async function PUT(req: Request) {
  const u = await usuarioDeSolicitud(req);
  if (!u) return noSesion();
  const quien = "cuenta:" + quienEs(req);
  if (bloqueado(quien)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const perfil = validarPerfil(d);
    if (u.correo && perfil.correo !== u.correo.toLowerCase()) {
      if (!(await claveDeUsuario(u, String(d.claveActual ?? "")))) {
        falloRegistrado(quien);
        throw new ErrorCuenta("Para cambiar el correo escribe tu contraseña actual (y debe ser correcta).");
      }
      olvidarFallos(quien);
    }
    await actualizarUsuario(u.id, (x) => ({ ...x, ...perfil }));
    return NextResponse.json({ ok: true, perfil });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo guardar." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
