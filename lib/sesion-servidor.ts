import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESION } from "./acceso";
import { usuarioDeCookie } from "./acceso-cuenta";
import { modulosDe, type Modulo, type Rol } from "./modulos";

export type UsuarioActual = { nombre: string; correo: string; rol: Rol; modulos: Modulo[] };

/** Quién tiene la sesión abierta en esta visita (para armar la barra y las páginas); null si nadie. */
export async function usuarioActual(): Promise<UsuarioActual | null> {
  const u = await usuarioDeCookie((await cookies()).get(COOKIE_SESION)?.value);
  return u ? { nombre: [u.nombre, u.apellido].filter(Boolean).join(" ") || u.correo || "Propietario", correo: u.correo, rol: u.rol, modulos: modulosDe(u) } : null;
}
