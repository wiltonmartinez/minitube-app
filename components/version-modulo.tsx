"use client";

import { useState } from "react";
import { MODULOS, type Modulo } from "@/lib/modulos";
import { VERSIONES_MODULOS, versionActual } from "@/lib/versiones-modulos";

/** Versión del módulo («v1.4.0») y su historial de cambios, que se despliega al pulsar. */
export function VersionModulo({ modulo }: { modulo: Modulo }) {
  const [abierto, setAbierto] = useState(false);
  const nombre = MODULOS.find((m) => m.id === modulo)?.nombre ?? modulo;
  return (
    <div className="text-xs text-muted-foreground">
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="rounded-md px-1 py-0.5 underline-offset-2 hover:text-foreground hover:underline">
        {nombre} v{versionActual(modulo)} · {abierto ? "ocultar historial" : "ver historial de versiones"}
      </button>
      {abierto && (
        <ol className="mt-2 max-w-3xl space-y-2 rounded-lg border bg-card p-3">
          {VERSIONES_MODULOS[modulo].map((v, i) => (
            <li key={v.version}>
              <div className="flex flex-wrap items-baseline gap-2">
                <b className="text-sm text-foreground">v{v.version}</b>
                {i === 0 && <span className="rounded bg-primary px-1.5 text-[10px] text-primary-foreground">actual</span>}
                <span>{v.fecha}</span>
                <span className="font-medium text-foreground">{v.titulo}</span>
              </div>
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {v.cambios.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
