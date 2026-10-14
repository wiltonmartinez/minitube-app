// Los módulos de Gestor TUBE y quién puede entrar a cada uno. Lógica pura (sin servidor): la usan la barra, el proxy, las rutas y las pruebas.

export type Modulo = "textube" | "promptube" | "capatube";
export type Rol = "admin" | "usuario";

export const MODULOS: readonly { id: Modulo; icono: string; nombre: string; ruta: string; numero: string }[] = [
  { id: "textube", icono: "✍️", nombre: "TexTUBE", ruta: "/textube", numero: "01" },
  { id: "promptube", icono: "🎨", nombre: "PrompTUBE", ruta: "/", numero: "02" },
  { id: "capatube", icono: "🧩", nombre: "CapaTUBE", ruta: "/editor", numero: "03" },
] as const;

export const TODOS_LOS_MODULOS: Modulo[] = MODULOS.map((m) => m.id);
export const esModulo = (v: unknown): v is Modulo => typeof v === "string" && (TODOS_LOS_MODULOS as string[]).includes(v);

/** Lo mínimo que hace falta saber de un usuario para decidir accesos. */
export type Permisos = { rol: Rol; modulos: Modulo[]; activo: boolean };

/** El administrador entra a todo; un usuario solo a los módulos que se le dieron. Un usuario desactivado, a nada. */
export const puedeAcceder = (u: Permisos | null | undefined, modulo: Modulo): boolean => !!u && u.activo && (u.rol === "admin" || u.modulos.includes(modulo));
export const modulosDe = (u: Permisos | null | undefined): Modulo[] => (u && u.activo ? (u.rol === "admin" ? TODOS_LOS_MODULOS : TODOS_LOS_MODULOS.filter((m) => u.modulos.includes(m))) : []);

/**
 * Qué parte de la app es una dirección:
 *   un módulo → solo quien tenga ese módulo; «admin» → solo administradores; null → cualquier usuario con sesión.
 */
export function moduloDeRuta(pathname: string): Modulo | "admin" | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/textube" || p.startsWith("/textube/") || p.startsWith("/api/youtube")) return "textube";
  if (p === "/editor" || p.startsWith("/editor/") || p.startsWith("/fuentes/")) return "capatube";
  if (p === "/" || p === "/api/generate" || p === "/api/chat" || p === "/api/credits" || p === "/api/assets") return "promptube";
  if (p === "/usuarios" || p.startsWith("/api/usuarios")) return "admin";
  return null; // /cuenta, /cambios, /sin-acceso, /api/cuenta…
}

/** Primera dirección a la que puede entrar (para mandarlo ahí si pide una que no le toca); «/sin-acceso» si no tiene ninguna. */
export function primeraRuta(u: Permisos | null | undefined): string {
  const m = modulosDe(u)[0];
  return m ? (MODULOS.find((x) => x.id === m)?.ruta ?? "/sin-acceso") : "/sin-acceso";
}
