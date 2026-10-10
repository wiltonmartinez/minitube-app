"use client";

import { ClipboardCopy, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generarEscenario, promptParaIA } from "@/lib/guion";
import { ERRORES, MARCAS, OTRO } from "@/lib/prompt-config";

const ESTILO_SELECT = "h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Escenario del video (miniatura, gancho, desarrollo y llamado a la acción). No cuesta nada.
 * El panel de imágenes ya no pide marca, modelo ni error: aquí son datos OPCIONALES solo para el guion (la imagen no los usa).
 */
export function GuionEscenario({
  plotter,
  profesion,
  fondo,
  genero,
  edadAnios,
  dispositivo,
  enfoque,
  experto,
}: {
  plotter: boolean;
  profesion: string;
  fondo?: string;
  genero?: string;
  edadAnios?: number;
  dispositivo?: string;
  enfoque?: 1 | 2 | 3 | 4;
  experto?: boolean;
}) {
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [errorSel, setErrorSel] = useState<string>(ERRORES[0]);
  const [errorOtro, setErrorOtro] = useState("");
  const [semilla, setSemilla] = useState(0);

  const error = errorSel === OTRO ? errorOtro.trim() : errorSel;
  const e = useMemo(
    () => (error ? generarEscenario({ marca, modelo, error, profesion, plotter, genero, edadAnios, dispositivo, enfoque, experto, fondoCatalogo: fondo, semilla }) : null),
    [marca, modelo, error, profesion, plotter, genero, edadAnios, dispositivo, enfoque, experto, fondo, semilla],
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
        Usa la profesión, la edad exacta, el género y el dispositivo del panel (si los eliges). Se genera al instante y sin costo. Para una versión más creativa, copia el prompt y pégalo en Claude o ChatGPT. Los
        datos del equipo son opcionales y solo se usan en este guion: la imagen no los necesita.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="guion-marca">Marca (opcional)</Label>
          <select id="guion-marca" className={ESTILO_SELECT} value={marca} onChange={(ev) => setMarca(ev.target.value)}>
            <option value="">Sin indicar</option>
            {MARCAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="guion-modelo">Modelo (opcional)</Label>
          <Input id="guion-modelo" placeholder="L3250, G6010, F570…" value={modelo} onChange={(ev) => setModelo(ev.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="guion-error">Error</Label>
          <select id="guion-error" className={ESTILO_SELECT} value={errorSel} onChange={(ev) => setErrorSel(ev.target.value)}>
            {ERRORES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>
      {errorSel === OTRO && (
        <div className="space-y-1">
          <Label htmlFor="guion-error-otro">Otro error</Label>
          <Input id="guion-error-otro" placeholder="Escribe el código o error" value={errorOtro} onChange={(ev) => setErrorOtro(ev.target.value)} />
        </div>
      )}

      {!e && <p className="text-sm text-muted-foreground">Escribe el error para ver el escenario.</p>}

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
            {e.equipo} · {error} · {profesion}
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
                {e.visual.edadGenero && (
                  <li>
                    <strong className="text-foreground">Edad y género:</strong> {e.visual.edadGenero}
                  </li>
                )}
                {e.visual.manos && (
                  <li>
                    <strong className="text-foreground">Dispositivo y postura de manos:</strong> {e.visual.manos}
                  </li>
                )}
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
