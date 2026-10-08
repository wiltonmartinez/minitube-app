// Listas guardadas en localStorage (historial y referencias). Lógica pura con un «almacén» inyectable para poder probarla.
// Todo va con try/catch: localStorage puede faltar, estar bloqueado o llenarse.

export type AlmacenLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Lee una lista guardada; descarta lo que no pase la validación. Nunca lanza. */
export function leerLista<T>(almacen: AlmacenLike | null, clave: string, valido: (x: unknown) => x is T): T[] {
  if (!almacen) return [];
  try {
    const bruto = almacen.getItem(clave);
    if (!bruto) return [];
    const datos = JSON.parse(bruto);
    return Array.isArray(datos) ? datos.filter(valido) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda la lista (la más nueva primero) con un máximo de elementos. Si el navegador se queda sin espacio,
 * descarta los más antiguos hasta que quepa. Devuelve lo que realmente quedó guardado.
 */
export function escribirLista<T>(almacen: AlmacenLike | null, clave: string, lista: T[], max: number): T[] {
  let actual = lista.slice(0, max);
  if (!almacen) return actual;
  while (true) {
    try {
      if (actual.length) almacen.setItem(clave, JSON.stringify(actual));
      else almacen.removeItem(clave);
      return actual;
    } catch {
      if (actual.length <= 1) {
        try {
          almacen.removeItem(clave);
        } catch {
          /* sin almacenamiento */
        }
        return [];
      }
      actual = actual.slice(0, actual.length - 1); // quita el más antiguo y reintenta
    }
  }
}

/** Almacén real del navegador, o null si no está disponible. */
export function almacenDelNavegador(): AlmacenLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
