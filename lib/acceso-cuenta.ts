import "server-only";
// Une la sesión (cookie firmada) con el usuario guardado: quién es, si sigue activo y a qué módulos puede entrar.
import { accesoLibre, cookieDe, leerSesion } from "./acceso";
import { puedeAcceder, type Modulo } from "./modulos";
import { ID_PROPIETARIO, leerUsuarios, usuarioPorId, type Usuario } from "./usuarios";

/** El usuario de una cookie de sesión, o null si la sesión no vale (firma, fecha, usuario borrado o desactivado, contraseña cambiada después). */
export async function usuarioDeCookie(valor: string | undefined | null): Promise<Usuario | null> {
  if (accesoLibre()) return (await usuarioPorId(ID_PROPIETARIO)) ?? (await leerUsuarios())[0] ?? null; // desarrollo sin contraseña: entra el propietario
  const s = await leerSesion(valor);
  if (!s) return null;
  const u = await usuarioPorId(s.uid);
  return u && u.activo && s.emitidaMs >= u.sesionesDesde ? u : null;
}

export const usuarioDeSolicitud = (req: Request) => usuarioDeCookie(cookieDe(req));

/** El usuario de la petición si puede entrar a ese módulo (los administradores, a todos); si no, null. */
export async function exigirModulo(req: Request, modulo: Modulo): Promise<Usuario | null> {
  const u = await usuarioDeSolicitud(req);
  return u && puedeAcceder(u, modulo) ? u : null;
}

/** El usuario de la petición si es administrador activo; si no, null. */
export async function exigirAdmin(req: Request): Promise<Usuario | null> {
  const u = await usuarioDeSolicitud(req);
  return u && u.activo && u.rol === "admin" ? u : null;
}
