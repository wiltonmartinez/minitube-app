import "server-only";
// Une el acceso por variables de entorno (GESTOR_EMAIL, GESTOR_CLAVE) con la cuenta guardada desde la app:
// lo que se guarda en la cuenta manda; si no hay cuenta (o no hay dónde guardarla), valen las variables.
import { claveCorrecta, correoPermitido, correosPermitidos } from "./acceso";
import { claveCoincide, leerCuenta } from "./cuenta";

/** Correos que pueden entrar: el de la cuenta guardada o, si no hay, los de GESTOR_EMAIL. */
export async function correosAutorizados(): Promise<string[]> {
  const c = await leerCuenta();
  return c?.correo ? [c.correo.toLowerCase()] : correosPermitidos();
}
export const correoAutorizado = async (correo: string) => (await correosAutorizados()).includes(String(correo ?? "").trim().toLowerCase());

/** ¿Es correcta la contraseña? La elegida en la app o, si nunca se cambió, GESTOR_CLAVE. */
export async function claveValida(intento: string): Promise<boolean> {
  const c = await leerCuenta();
  return c?.clave ? claveCoincide(intento, c.clave) : claveCorrecta(intento);
}

export { correoPermitido };

/** ¿La petición trae una sesión válida (y abierta después del último cambio de contraseña)? */
export async function sesionActiva(req: Request): Promise<boolean> {
  const { cookieDe, sesionValida } = await import("./acceso");
  const { sesionesDesde } = await import("./cuenta");
  return sesionValida(cookieDe(req), Date.now(), await sesionesDesde());
}
