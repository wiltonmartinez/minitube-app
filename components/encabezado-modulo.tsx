"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** La preferencia «ocultar la descripción» se guarda en el navegador y vale para los tres módulos (CapaTUBE lee la misma llave). */
const LLAVE = "gt_ocultar_descripcion";
const EVENTO = "gt-descripcion";

const leer = () => {
  try {
    return localStorage.getItem(LLAVE) === "1";
  } catch {
    return false;
  }
};
const suscribir = (aviso: () => void) => {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso); // otra pestaña o el marco de CapaTUBE
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
};

/**
 * Encabezado común de los tres módulos (TexTUBE, PrompTUBE y CapaTUBE): icono + nombre y la descripción debajo, que se puede ocultar
 * para ganar espacio. CapaTUBE vive en una página aparte (public/editor/index.html) y repite estas mismas medidas en su CSS: si cambias algo aquí, cámbialo allí.
 */
export function EncabezadoModulo({ icono, nombre, children, pie }: { icono: string; nombre: string; children: ReactNode; pie?: ReactNode }) {
  const oculta = useSyncExternalStore(suscribir, leer, () => false);
  const alternar = () => {
    try {
      localStorage.setItem(LLAVE, oculta ? "0" : "1");
    } catch {
      /* sin almacenamiento: el cambio vale solo hasta recargar */
    }
    window.dispatchEvent(new Event(EVENTO));
  };
  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {icono} {nombre}
        </h1>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!oculta}
          title={oculta ? "Mostrar la descripción del módulo" : "Ocultar la descripción para tener más espacio"}
          className="rounded-md border border-input bg-input/30 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground"
        >
          {oculta ? "▼ Mostrar descripción" : "▲ Ocultar descripción"}
        </button>
      </div>
      {!oculta && <p className="mt-2 max-w-3xl text-muted-foreground">{children}</p>}
      {pie && <div className="mt-2 text-xs text-muted-foreground">{pie}</div>}
    </header>
  );
}

/** Contenedor común de los módulos: mismo ancho, mismo margen y misma separación entre bloques. */
export const CONTENEDOR_MODULO = "mx-auto w-full max-w-6xl flex-1 px-4 py-8";
