"use client";

/**
 * Pestañas de cada módulo, con el mismo aspecto que las de la barra superior (y las de CapaTUBE): la pestaña activa se une
 * a la línea de abajo y resalta con una raya arriba; las demás se iluminan al pasar el ratón.
 */
export function Pestanas<T extends string>({ valor, opciones, onCambio }: { valor: T; opciones: readonly (readonly [T, string])[]; onCambio: (v: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap items-end gap-1 border-b border-foreground/15">
      {opciones.map(([id, nombre]) => {
        const activa = valor === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambio(id)}
            className={`relative -mb-px h-9 rounded-t-lg border border-b-0 px-4 text-sm font-medium transition-colors duration-150 ${
              activa
                ? "border-foreground/15 bg-card text-foreground before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full before:bg-foreground/70 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-card"
                : "border-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
            }`}
          >
            {nombre}
          </button>
        );
      })}
    </div>
  );
}
