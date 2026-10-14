// Historial de versiones de los datos de un módulo (menús, plantillas, catálogos…): «fotos» de lo guardado en el navegador a las que se puede volver.
// Lógica pura con un almacén inyectable (localStorage en la app) para poder probarla.
export type AlmacenVersiones = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Version = { id: string; fecha: string; motivo: string; auto: boolean; datos: Record<string, string | null> };

export const MAX_VERSIONES = 20;
/** Entre una foto automática y la siguiente pasan al menos 10 minutos: guarda cómo estaba todo antes de empezar a editar, no cada tecla. */
export const MINUTOS_ENTRE_AUTOMATICAS = 10;
const llave = (modulo: string) => `gt_versiones:${modulo}`;

export function leerVersiones(a: AlmacenVersiones | null, modulo: string): Version[] {
  if (!a) return [];
  try {
    const d = JSON.parse(a.getItem(llave(modulo)) ?? "[]");
    return Array.isArray(d) ? d.filter((v): v is Version => !!v && typeof v.id === "string" && typeof v.datos === "object" && v.datos !== null) : [];
  } catch {
    return [];
  }
}

function escribir(a: AlmacenVersiones, modulo: string, lista: Version[]): Version[] {
  let actual = lista.slice(0, MAX_VERSIONES);
  while (true) {
    try {
      if (actual.length) a.setItem(llave(modulo), JSON.stringify(actual));
      else a.removeItem(llave(modulo));
      return actual;
    } catch {
      if (actual.length <= 1) return [];
      actual = actual.slice(0, -1); // sin espacio: se quita la más antigua y se reintenta
    }
  }
}

export function capturar(a: AlmacenVersiones, claves: string[]): Record<string, string | null> {
  const r: Record<string, string | null> = {};
  for (const k of claves) {
    try {
      r[k] = a.getItem(k);
    } catch {
      r[k] = null;
    }
  }
  return r;
}
const iguales = (x: Record<string, string | null>, y: Record<string, string | null>) => Object.keys({ ...x, ...y }).every((k) => (x[k] ?? null) === (y[k] ?? null));

/** Guarda una versión con lo que hay ahora. Devuelve null si no hizo falta (idéntica a la última). */
export function guardarVersion(a: AlmacenVersiones | null, modulo: string, claves: string[], motivo: string, auto = false, ahora = new Date()): Version | null {
  if (!a) return null;
  const lista = leerVersiones(a, modulo);
  const datos = capturar(a, claves);
  if (lista[0] && iguales(lista[0].datos, datos)) return null;
  const v: Version = { id: `${ahora.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, fecha: ahora.toISOString(), motivo: motivo.slice(0, 80), auto, datos };
  escribir(a, modulo, [v, ...lista]);
  return v;
}

/** La foto automática «antes de editar»: solo si la última automática tiene más de 10 minutos. */
export function guardarAutomatica(a: AlmacenVersiones | null, modulo: string, claves: string[], motivo: string, ahora = new Date()): Version | null {
  const ultima = leerVersiones(a, modulo).find((v) => v.auto);
  if (ultima && ahora.getTime() - new Date(ultima.fecha).getTime() < MINUTOS_ENTRE_AUTOMATICAS * 60_000) return null;
  return guardarVersion(a, modulo, claves, motivo, true, ahora);
}

/** Vuelve a una versión. Antes guarda cómo estaba todo (para poder deshacer la vuelta). Devuelve false si la versión no existe. */
export function restaurarVersion(a: AlmacenVersiones | null, modulo: string, claves: string[], id: string): boolean {
  if (!a) return false;
  const v = leerVersiones(a, modulo).find((x) => x.id === id);
  if (!v) return false;
  guardarVersion(a, modulo, claves, "Antes de volver a una versión anterior");
  for (const k of claves) {
    const valor = v.datos[k] ?? null;
    if (valor === null) a.removeItem(k);
    else a.setItem(k, valor);
  }
  return true;
}

export function borrarVersion(a: AlmacenVersiones | null, modulo: string, id: string): void {
  if (a) escribir(a, modulo, leerVersiones(a, modulo).filter((v) => v.id !== id));
}
