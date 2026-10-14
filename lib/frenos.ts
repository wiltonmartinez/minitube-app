// Frena los intentos repetidos (por dirección, en memoria del servidor): contraseñas adivinadas, pedidos de correo, etc.
const registro = new Map<string, { n: number; hasta: number }>();

export const quienEs = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** ¿Ya hay demasiados fallos recientes de esta clave? */
export function bloqueado(clave: string, max = 5): boolean {
  const e = registro.get(clave);
  return !!e && e.n >= max && e.hasta > Date.now();
}
export function falloRegistrado(clave: string, ventanaMs = 60_000): void {
  const e = registro.get(clave);
  registro.set(clave, { n: (e && e.hasta > Date.now() ? e.n : 0) + 1, hasta: Date.now() + ventanaMs });
}
export const olvidarFallos = (clave: string) => registro.delete(clave);
