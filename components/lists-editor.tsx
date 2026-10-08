"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LISTAS_BASE, NOMBRE_LISTA, type CampoLista, type Listas, type Opcion } from "@/lib/rostro";

const CAMPOS = Object.keys(NOMBRE_LISTA) as CampoLista[];

/** Editor de las listas del personaje (forma del rostro, ojos, cabello, complexión…). Los cambios se guardan al instante. */
export function ListsEditor({
  listas,
  modificadas,
  onGuardar,
}: {
  listas: Listas;
  modificadas: Set<CampoLista>;
  onGuardar: (campo: CampoLista, opciones: Opcion[] | null) => void;
}) {
  const [campo, setCampo] = useState<CampoLista>("forma");
  const opciones = listas[campo];
  const editar = (i: number, cambio: Partial<Opcion>) =>
    onGuardar(campo, opciones.map((x, k) => (k === i ? { ...x, ...cambio } : x)));

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Listas del personaje</h3>
      <p className="text-xs text-muted-foreground">
        «Texto» es lo que ves en el menú; «Frase en inglés» es lo que se envía al prompt. Las opciones que añadas siempre
        se admiten en el sorteo; las de fábrica siguen las reglas de armonía.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="lista-sel">Lista a editar</Label>
          <select
            id="lista-sel"
            value={campo}
            onChange={(e) => setCampo(e.target.value as CampoLista)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {CAMPOS.map((c) => (
              <option key={c} value={c}>
                {NOMBRE_LISTA[c]}
                {modificadas.has(c) ? " (editada)" : ""}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onGuardar(campo, [...opciones, { es: "Nueva opción", en: "" }])}>
          Añadir opción
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!modificadas.has(campo)}
          onClick={() => onGuardar(campo, null)}
        >
          Restablecer esta lista
        </Button>
      </div>

      <div className="space-y-2">
        {opciones.map((x, i) => (
          <div key={`${x.id ?? "n"}-${i}`} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
            <Input aria-label="Texto" value={x.es} onChange={(e) => editar(i, { es: e.target.value })} />
            <Input
              aria-label="Frase en inglés"
              value={x.en}
              placeholder={campo === "estilo" ? "(opcional) rasgo extra" : "frase en inglés"}
              onChange={(e) => editar(i, { en: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={opciones.length <= 1}
              onClick={() => onGuardar(campo, opciones.filter((_, k) => k !== i))}
              aria-label={`Eliminar ${x.es}`}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
      {campo === "estilo" && (
        <p className="text-xs text-muted-foreground">
          Los estilos de fábrica rellenan forma, ojos, cejas, nariz y labios. Un estilo nuevo no rellena nada: usa los detalles.
        </p>
      )}
      <p className="text-xs text-muted-foreground">Lista de fábrica: {LISTAS_BASE[campo].length} opciones.</p>
    </div>
  );
}
