"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { PERFILES, type Perfil } from "@/lib/prompt-config";

const KEY = "minitube.catalogo.v1";
const listeners = new Set<() => void>();

// localStorage puede no existir o lanzar (modo privado, SSR): siempre con try/catch
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

function valido(p: unknown): p is Perfil {
  const x = p as Perfil;
  return (
    !!x &&
    typeof x.vestimenta === "string" &&
    typeof x.emocion === "string" &&
    typeof x.manos === "string" &&
    typeof x.manos1 === "string" &&
    typeof x.fondo === "string" &&
    !!x.en &&
    typeof x.en.role === "string" &&
    typeof x.en.clothing?.f === "string" &&
    typeof x.en.clothing?.m === "string" &&
    typeof x.en.emotion === "string" &&
    typeof x.en.hands === "string" &&
    typeof x.en.hands1 === "string" &&
    typeof x.en.scene === "string" &&
    typeof x.en.props === "string"
  );
}

/** Catálogo de perfiles (Profesión → vestimenta, emoción, manos, fondo) editable y persistido en localStorage. */
export function useCatalogo() {
  const raw = useSyncExternalStore(subscribe, leer, () => null);

  const catalogo = useMemo<Record<string, Perfil>>(() => {
    if (!raw) return PERFILES;
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const limpio: Record<string, Perfil> = {};
      for (const [k, v] of Object.entries(obj)) if (valido(v)) limpio[k] = v;
      return Object.keys(limpio).length ? limpio : PERFILES;
    } catch {
      return PERFILES;
    }
  }, [raw]);

  const guardar = useCallback((nuevo: Record<string, Perfil> | null) => {
    try {
      if (nuevo) window.localStorage.setItem(KEY, JSON.stringify(nuevo));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* sin almacenamiento: el cambio no persiste */
    }
    listeners.forEach((l) => l());
  }, []);

  return { catalogo, guardar, personalizado: raw !== null };
}
