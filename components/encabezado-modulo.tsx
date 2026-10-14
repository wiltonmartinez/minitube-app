import type { ReactNode } from "react";

/**
 * Encabezado común de los tres módulos (TexTUBE, PrompTUBE y CapaTUBE): icono + nombre y la descripción debajo.
 * CapaTUBE vive en una página aparte (public/editor/index.html) y repite estas mismas medidas en su CSS: si cambias algo aquí, cámbialo allí.
 */
export function EncabezadoModulo({ icono, nombre, children, pie }: { icono: string; nombre: string; children: ReactNode; pie?: ReactNode }) {
  return (
    <header>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {icono} {nombre}
      </h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">{children}</p>
      {pie && <div className="mt-2 text-xs text-muted-foreground">{pie}</div>}
    </header>
  );
}

/** Contenedor común de los módulos: mismo ancho, mismo margen y misma separación entre bloques. */
export const CONTENEDOR_MODULO = "mx-auto w-full max-w-6xl flex-1 px-4 py-8";
