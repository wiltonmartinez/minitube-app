"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { almacenDelNavegador, escribirLista, leerLista } from "@/lib/almacen";

// Hook genérico: una lista guardada en localStorage que se actualiza sola en toda la página (y entre pestañas).
const escuchas = new Map<string, Set<() => void>>();

export function useListaLocal<T>(clave: string, valido: (x: unknown) => x is T, max: number) {
  const suscribir = useCallback(
    (cb: () => void) => {
      if (!escuchas.has(clave)) escuchas.set(clave, new Set());
      escuchas.get(clave)!.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        escuchas.get(clave)?.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    [clave],
  );
  const bruto = useSyncExternalStore(
    suscribir,
    () => {
      try {
        return window.localStorage.getItem(clave);
      } catch {
        return null;
      }
    },
    () => null,
  );

  const lista = useMemo<T[]>(
    () => leerLista({ getItem: () => bruto, setItem: () => {}, removeItem: () => {} }, clave, valido),
    [bruto, clave, valido],
  );

  /** Reemplaza la lista (la más nueva primero). Devuelve cuántos elementos pudieron guardarse. */
  const guardar = useCallback(
    (nueva: T[]) => {
      const guardados = escribirLista(almacenDelNavegador(), clave, nueva, max);
      escuchas.get(clave)?.forEach((f) => f());
      return guardados.length;
    },
    [clave, max],
  );

  return [lista, guardar] as const;
}
