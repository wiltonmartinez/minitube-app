"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { LISTAS_BASE, type CampoLista, type Listas, type Opcion } from "@/lib/rostro";

// Listas del personaje editables y persistidas en localStorage (solo las que el usuario modifica).
const KEY = "minitube.listas.v1";
const listeners = new Set<() => void>();

function leer(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const opcionValida = (x: unknown): x is Opcion => {
  const v = x as Opcion;
  return !!v && typeof v.es === "string" && v.es.trim() !== "" && typeof v.en === "string";
};

export function useListas() {
  const raw = useSyncExternalStore(subscribe, leer, () => null);

  const { listas, modificadas } = useMemo(() => {
    const out: Listas = { ...LISTAS_BASE };
    const mod = new Set<CampoLista>();
    if (!raw) return { listas: out, modificadas: mod };
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      for (const campo of Object.keys(LISTAS_BASE) as CampoLista[]) {
        const arr = obj[campo];
        if (Array.isArray(arr) && arr.length > 0 && arr.every(opcionValida)) {
          out[campo] = arr as Opcion[];
          mod.add(campo);
        }
      }
    } catch {
      /* datos dañados: se usan las listas de fábrica */
    }
    return { listas: out, modificadas: mod };
  }, [raw]);

  /** Guarda una lista editada (o la restablece si `opciones` es null). */
  const guardar = useCallback(
    (campo: CampoLista, opciones: Opcion[] | null) => {
      try {
        const actual = (() => {
          try {
            return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
          } catch {
            return {};
          }
        })();
        if (opciones) actual[campo] = opciones;
        else delete actual[campo];
        if (Object.keys(actual).length) window.localStorage.setItem(KEY, JSON.stringify(actual));
        else window.localStorage.removeItem(KEY);
      } catch {
        /* sin almacenamiento: el cambio no persiste */
      }
      listeners.forEach((l) => l());
    },
    [],
  );

  return { listas, modificadas, guardar };
}
