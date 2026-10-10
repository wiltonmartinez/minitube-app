"use client";

import { ClipboardCopy, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generarEscenario, promptParaIA } from "@/lib/guion";

/** Escenario del video (miniatura, gancho, desarrollo y llamado a la acción) con los datos de los bloques 1 y 3. No cuesta nada. */
export function GuionEscenario({
  marca,
  modelo,
  error,
  profesion,
  fondo,
}: {
  marca: string;
  modelo: string;
  error: string;
  profesion: string;
  fondo?: string;
}) {
  const [semilla, setSemilla] = useState(0);
  const listo = !!modelo.trim() && !!error.trim();
  const e = useMemo(
    () => (listo ? generarEscenario({ marca, modelo, error, profesion, fondoCatalogo: fondo, semilla }) : null),
    [listo, marca, modelo, error, profesion, fondo, semilla],
  );

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${que} copiado`);
    } catch {
      toast.error("No se pudo copiar: selecciona el texto a mano.");
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="Guion del video">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4" />
        Guion del video (escenario)
      </h3>
      <p className="text-xs text-muted-foreground">
        Usa el problema técnico (bloque 1) y la profesión (bloque 3). Se genera al instante y sin costo. Para una versión más creativa, copia el prompt y
        pégalo en Claude o ChatGPT.
      </p>

      {!e && <p className="text-sm text-muted-foreground">Escribe el modelo y el error (bloque 1) para ver el escenario.</p>}

      {e && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSemilla((s) => s + 1)}>
              <Shuffle className="size-4" />
              Otra variante
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void copiar(e.texto, "Guion")}>
              <ClipboardCopy className="size-4" />
              Copiar guion
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void copiar(promptParaIA(marca, modelo, error, profesion), "Prompt")}>
              <ClipboardCopy className="size-4" />
              Copiar prompt para Claude / ChatGPT
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {e.equipo} · {error.trim()} · {profesion}
          </p>

          {e.avisos.map((a) => (
            <p key={a} className="rounded-md border border-amber-500/50 p-2 text-xs text-amber-500">
              ⚠️ {a}
            </p>
          ))}

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold">1. 🎨 El gancho visual (miniatura)</h4>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Personaje y emoción:</strong> {e.visual.personaje}
                </li>
                <li>
                  <strong className="text-foreground">Fondo y contexto:</strong> {e.visual.fondo}
                </li>
                <li>
                  <strong className="text-foreground">Elemento clave:</strong> {e.visual.elemento}
                </li>
                <li>
                  <strong className="text-foreground">Texto corto:</strong> {e.visual.textoCorto}
                  {e.visual.alternativas.length > 0 && <> (alternativas: {e.visual.alternativas.join(" · ")})</>}
                </li>
              </ul>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">2. 🔥 El gancho narrativo (primeros 5 segundos)</h4>
              <p className="rounded-md bg-muted/40 p-2 italic text-muted-foreground">«{e.gancho}»</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">3. 📉 El desarrollo (mostrando el problema)</h4>
              <p className="text-xs font-medium">En pantalla (b-roll):</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {e.desarrollo.broll.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ol>
              <p className="pt-1 text-xs font-medium">Qué decir:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {e.desarrollo.explicacion.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold">4. 💻 El call to action (la solución inmediata)</h4>
              <p className="rounded-md bg-muted/40 p-2 italic text-muted-foreground">«{e.cta}»</p>
              <p className="text-xs text-muted-foreground">{e.cierre}</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
