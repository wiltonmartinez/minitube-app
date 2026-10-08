"use client";

import { Download, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CLAVE_HISTORIAL,
  CLAVE_REFERENCIAS,
  LADO_MINIATURA,
  LADO_REFERENCIA_ENVIO,
  LADO_REFERENCIA_GUARDADA,
  MAX_HISTORIAL,
  MAX_REFERENCIAS_GUARDADAS,
  esItemHistorial,
  esReferenciaGuardada,
  nuevoId,
  type ItemHistorial,
} from "@/lib/historial";
import { reducirArchivo, reducirImagen } from "@/lib/imagen-cliente";
import { ASPECTO, MAX_REFERENCIAS, MODELOS, MODELO_POR_DEFECTO, buscarModelo, type ModeloId } from "@/lib/image-models";
import { useListaLocal } from "@/lib/use-lista-local";
import { buildApiPrompt, type PromptInput } from "@/lib/prompt-config";

type Estado = "reposo" | "generando" | "listo" | "error";

const ESPERA_MAX_MS = 240_000; // tiempo máximo esperando a fal.ai
const SONDEO_MS = 2_000;
const MAX_ARCHIVO_MB = 15;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Genera la imagen con el modelo elegido (o una simulación si no hay FAL_KEY). Envía el prompt en inglés de la API. */
export function ImageGenerator({ entrada }: { entrada: PromptInput | null }) {
  const [modeloId, setModeloId] = useState<ModeloId>(MODELO_POR_DEFECTO);
  const [texto3d, setTexto3d] = useState(false);
  const [usarRef, setUsarRef] = useState(false);
  const [refs, setRefs] = useState<string[]>([]); // fotos de esta sesión (1024 px, solo en memoria)
  const [estado, setEstado] = useState<Estado>("reposo");
  const [mensaje, setMensaje] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [simulacion, setSimulacion] = useState(false);
  const [imagenModelo, setImagenModelo] = useState<ModeloId>(MODELO_POR_DEFECTO);
  const [historial, guardarHistorial] = useListaLocal<ItemHistorial>(CLAVE_HISTORIAL, esItemHistorial, MAX_HISTORIAL);
  const [guardadas, guardarGuardadas] = useListaLocal(CLAVE_REFERENCIAS, esReferenciaGuardada, MAX_REFERENCIAS_GUARDADAS);
  const inputArchivo = useRef<HTMLInputElement>(null);
  // Evita que una respuesta antigua pise a una generación más nueva
  const intento = useRef(0);

  const modelo = buscarModelo(modeloId)!;
  const admiteRef = !!modelo.endpointRef;
  const refActiva = usarRef && admiteRef;
  const refsEnvio = refActiva ? refs : [];
  // Prompt en inglés para la API; se actualiza solo con cada cambio del formulario o de los interruptores
  const prompt = useMemo(
    () => (entrada ? buildApiPrompt(entrada, { texto3d, referencia: refsEnvio.length > 0 }) : ""),
    [entrada, texto3d, refsEnvio.length],
  );
  const faltanFotos = refActiva && refs.length === 0;

  function elegirModelo(id: ModeloId) {
    setModeloId(id);
    setTexto3d(buscarModelo(id)!.textoEnImagen); // recomendado solo con los modelos que escriben bien el texto
  }

  /* ───────── fotos de referencia ───────── */
  async function subirFotos(archivos: FileList | null) {
    if (!archivos?.length) return;
    const libres = MAX_REFERENCIAS - refs.length;
    if (libres <= 0) return toast.error(`Máximo ${MAX_REFERENCIAS} fotos de referencia.`);
    const nuevas: string[] = [];
    for (const f of Array.from(archivos).slice(0, libres)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        toast.error(`«${f.name}» no es una imagen JPG, PNG o WebP.`);
        continue;
      }
      if (f.size > MAX_ARCHIVO_MB * 1024 * 1024) {
        toast.error(`«${f.name}» pesa más de ${MAX_ARCHIVO_MB} MB.`);
        continue;
      }
      try {
        nuevas.push(await reducirArchivo(f, LADO_REFERENCIA_ENVIO, 0.85));
      } catch {
        toast.error(`No se pudo leer «${f.name}».`);
      }
    }
    if (archivos.length > libres) toast.message(`Solo caben ${MAX_REFERENCIAS} fotos: se añadieron las primeras.`);
    if (nuevas.length) setRefs((r) => [...r, ...nuevas]);
    if (inputArchivo.current) inputArchivo.current.value = "";
  }

  async function guardarReferencia(imagen: string) {
    try {
      const pequena = await reducirImagen(imagen, LADO_REFERENCIA_GUARDADA, 0.8);
      const n = guardarGuardadas([{ id: nuevoId(), nombre: `Referencia ${guardadas.length + 1}`, imagen: pequena }, ...guardadas]);
      if (n === 0) toast.error("No hay espacio en el navegador para guardar la referencia.");
      else toast.success("Referencia guardada en este navegador");
    } catch {
      toast.error("No se pudo guardar la referencia.");
    }
  }

  /* ───────── historial ───────── */
  async function registrar(url: string, esSimulacion: boolean, id: ModeloId, conTexto: boolean) {
    let thumb: string | undefined;
    try {
      thumb = await reducirImagen(url, LADO_MINIATURA, 0.7);
    } catch {
      thumb = undefined; // p. ej. el servidor de la imagen no permite copiarla: se guarda solo la URL
    }
    const remota = !esSimulacion && url.startsWith("https://") ? url : undefined;
    if (!thumb && !remota) return;
    const item: ItemHistorial = {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      modelo: buscarModelo(id)!.nombre,
      texto3d: conTexto,
      simulacion: esSimulacion,
      thumb,
      url: remota,
    };
    guardarHistorial([item, ...historial]);
  }

  function verDelHistorial(item: ItemHistorial) {
    setImagenUrl(item.url ?? item.thumb ?? null);
    setSimulacion(item.simulacion);
    setEstado("listo");
  }

  /* ───────── generación ───────── */
  async function generar() {
    if (!prompt || faltanFotos) return;
    const mio = ++intento.current;
    const id = modeloId;
    const conTexto = texto3d;
    setEstado("generando");
    setMensaje(refsEnvio.length ? "Subiendo las fotos de referencia y enviando el prompt…" : "Enviando el prompt…");
    const terminar = (url: string, esSim: boolean) => {
      setImagenUrl(url);
      setSimulacion(esSim);
      setImagenModelo(id);
      setEstado("listo");
      toast.success(esSim ? "Imagen de simulación lista" : "Imagen lista");
      void registrar(url, esSim, id, conTexto);
    };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelo: id,
          aspectRatio: ASPECTO,
          ...(refsEnvio.length ? { imagenesReferencia: refsEnvio } : {}),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "No se pudo generar la imagen.");

      if (j.estado === "completado") {
        if (mio === intento.current) terminar(j.imagenUrl, !!j.simulacion);
        return;
      }

      const inicio = Date.now();
      while (Date.now() - inicio < ESPERA_MAX_MS) {
        await pausa(SONDEO_MS);
        if (mio !== intento.current) return; // se lanzó otra generación
        const q = new URLSearchParams({ statusUrl: j.statusUrl, responseUrl: j.responseUrl });
        const r = await fetch(`/api/generate?${q}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "No se pudo consultar el estado.");
        if (d.estado === "completado") {
          terminar(d.imagenUrl, false);
          return;
        }
        setMensaje(d.estado === "en_cola" ? "En cola en fal.ai…" : "Generando la imagen…");
      }
      throw new Error("La imagen tardó demasiado. Vuelve a intentar o prueba con otro modelo.");
    } catch (e) {
      if (mio !== intento.current) return;
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo generar la imagen.");
    }
  }

  // Descarga PNG: se dibuja la imagen en un canvas (sirve también para la simulación SVG)
  async function descargar() {
    if (!imagenUrl) return;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((ok, fallo) => {
        img.onload = () => ok();
        img.onerror = () => fallo(new Error("carga"));
        img.src = imagenUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
      if (!blob) throw new Error("png");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miniatura-${imagenModelo}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Si el navegador bloquea la conversión, se abre la imagen para guardarla a mano
      window.open(imagenUrl, "_blank", "noopener");
      toast.message("Se abrió la imagen en otra pestaña: clic derecho → Guardar imagen como…");
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Generar imagen con IA</h3>

      <div className="space-y-2">
        <Label htmlFor="modelo-ia">Modelo de IA</Label>
        <Select value={modeloId} onValueChange={(v) => elegirModelo(v as ModeloId)}>
          <SelectTrigger id="modelo-ia" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELOS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {modelo.descripcion} Formato {ASPECTO} ({modelo.resolucion}). <strong>{modelo.costoTexto}.</strong>
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-md border p-3">
        <Switch id="texto3d" checked={texto3d} onCheckedChange={setTexto3d} />
        <div className="space-y-1">
          <Label htmlFor="texto3d">Texto 3D dentro de la imagen</Label>
          <p className="text-xs text-muted-foreground">
            {texto3d
              ? "Activado: la imagen incluye los textos 3D (RESET, error y modelo), el badge y la marca de agua."
              : "Desactivado: la imagen se pide SIN texto, con las zonas libres para ponerlo después."}{" "}
            {!modelo.textoEnImagen && texto3d && (
              <span className="text-amber-500">Este modelo suele escribir mal el texto; se recomienda desactivarlo.</span>
            )}
            {modelo.textoEnImagen && !texto3d && "Recomendado activarlo con este modelo."}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-start gap-3">
          <Switch id="usar-ref" checked={refActiva} onCheckedChange={setUsarRef} disabled={!admiteRef} />
          <div className="space-y-1">
            <Label htmlFor="usar-ref">Usar foto de referencia del personaje</Label>
            <p className="text-xs text-muted-foreground">
              {admiteRef
                ? `La IA mantiene la cara de las fotos (de 1 a ${MAX_REFERENCIAS}) y cambia el resto. Usa solo fotos tuyas o de personas que te dieron permiso. ${modelo.costoRefTexto ?? ""}`
                : `${modelo.nombre} no admite fotos de referencia. Elige Nano Banana Pro o FLUX.2 Pro para usarlas.`}
            </p>
          </div>
        </div>

        {refActiva && (
          <div className="space-y-3">
            <input
              ref={inputArchivo}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => void subirFotos(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputArchivo.current?.click()}
              disabled={refs.length >= MAX_REFERENCIAS}
            >
              <Upload className="size-4" />
              Subir fotos ({refs.length}/{MAX_REFERENCIAS})
            </Button>
            {refs.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {refs.map((r, i) => (
                  <li key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r} alt={`Referencia ${i + 1}`} className="size-20 rounded-md border object-cover" />
                    <button
                      type="button"
                      aria-label={`Quitar referencia ${i + 1}`}
                      onClick={() => setRefs((x) => x.filter((_, k) => k !== i))}
                      className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow ring-1 ring-border"
                    >
                      <X className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void guardarReferencia(r)}
                      className="mt-1 block w-full text-center text-[10px] text-muted-foreground underline"
                    >
                      Guardar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {guardadas.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Mis referencias guardadas (clic para usar):</p>
                <ul className="flex flex-wrap gap-2">
                  {guardadas.map((g) => (
                    <li key={g.id} className="relative">
                      <button
                        type="button"
                        aria-label={`Usar ${g.nombre}`}
                        disabled={refs.length >= MAX_REFERENCIAS}
                        onClick={() => setRefs((x) => [...x, g.imagen])}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.imagen} alt={g.nombre} className="size-14 rounded-md border object-cover" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Borrar ${g.nombre}`}
                        onClick={() => guardarGuardadas(guardadas.filter((x) => x.id !== g.id))}
                        className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow ring-1 ring-border"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground">Las guardadas se reducen a {LADO_REFERENCIA_GUARDADA} px para no llenar el navegador.</p>
              </div>
            )}
            {faltanFotos && <p className="text-xs text-amber-500">Sube al menos una foto para generar con referencia.</p>}
          </div>
        )}
      </div>

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver el prompt que se envía a la API (inglés)</summary>
        <Textarea readOnly value={prompt} className="mt-2 min-h-[200px] font-mono text-xs" />
      </details>

      <Button className="w-full" onClick={generar} disabled={!prompt || estado === "generando" || faltanFotos}>
        {estado === "generando" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        {estado === "generando" ? "Generando…" : "Generar imagen"}
      </Button>

      {estado === "generando" && <p className="text-xs text-muted-foreground">{mensaje}</p>}
      {estado === "error" && (
        <p role="alert" className="rounded-md border border-destructive/50 p-2 text-sm text-destructive">
          {mensaje}
        </p>
      )}

      {imagenUrl && estado !== "generando" && (
        <div className="space-y-2">
          {simulacion && (
            <p className="rounded-md border border-amber-500/50 p-2 text-sm text-amber-500">
              Modo simulación activo: no hay FAL_KEY configurada, esta imagen es de prueba y no tiene costo.
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagenUrl} alt="Miniatura generada" className="aspect-video w-full rounded-md border object-cover" />
          <Button variant="outline" className="w-full" onClick={descargar}>
            <Download className="size-4" />
            Descargar PNG
          </Button>
        </div>
      )}

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Historial de miniaturas ({historial.length})</summary>
        {historial.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Aún no hay miniaturas. Se guardan aquí, solo en este navegador.</p>
        ) : (
          <div className="mt-2 space-y-2">
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {historial.map((h) => (
                <li key={h.id} className="space-y-1">
                  <button type="button" onClick={() => verDelHistorial(h)} aria-label={`Ver miniatura de ${h.modelo}`} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.thumb ?? h.url} alt={`Miniatura ${h.modelo}`} className="aspect-video w-full rounded border object-cover" />
                  </button>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {h.modelo}
                    {h.simulacion ? " · simulación" : ""} · {new Date(h.fecha).toLocaleDateString("es")}
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground underline"
                    onClick={() => guardarHistorial(historial.filter((x) => x.id !== h.id))}
                  >
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" onClick={() => guardarHistorial([])}>
              <Trash2 className="size-4" />
              Vaciar historial
            </Button>
          </div>
        )}
      </details>
    </section>
  );
}
