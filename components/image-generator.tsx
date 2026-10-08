"use client";

import { Download, ImageIcon, Loader2, Plus, Shuffle, Trash2, Upload, X } from "lucide-react";
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
import { CreditosFal } from "@/components/creditos-fal";
import { crearVariantes, type LetraAB } from "@/lib/ab";
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
import { reducirArchivo, reducirImagen, urlAPng } from "@/lib/imagen-cliente";
import { ASPECTO, MAX_REFERENCIAS, MODELOS, MODELO_POR_DEFECTO, buscarModelo, type ModeloId } from "@/lib/image-models";
import type { LoteItem } from "@/lib/lote";
import { useListaLocal } from "@/lib/use-lista-local";
import {
  BADGES_REALES,
  EMOCIONES_AB,
  PALETAS_FIJAS,
  buildApiPrompt,
  generatePrompt,
  type EmocionAB,
  type PromptInput,
} from "@/lib/prompt-config";

type Estado = "reposo" | "generando" | "listo" | "error";

type Variante = {
  letra: LetraAB;
  emocion: EmocionAB;
  entrada: PromptInput;
  promptApi: string;
  estado: "generando" | "listo" | "error";
  url?: string;
  simulacion?: boolean;
  mensaje?: string;
  modelo: ModeloId;
};

const ESPERA_MAX_MS = 240_000; // tiempo máximo esperando a fal.ai
const SONDEO_MS = 2_000;
const MAX_ARCHIVO_MB = 15;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Genera la imagen con el modelo elegido (o una simulación si no hay FAL_KEY). Envía el prompt en inglés de la API. */
export function ImageGenerator({
  entrada,
  bloqueos,
  onAgregarAlLote,
}: {
  entrada: PromptInput | null;
  /** Candados 🔒 de la paleta y el badge: las variantes A/B no los cambian */
  bloqueos: { paleta: boolean; badge: boolean };
  onAgregarAlLote: (items: LoteItem[]) => void;
}) {
  const [modeloId, setModeloId] = useState<ModeloId>(MODELO_POR_DEFECTO);
  const [texto3d, setTexto3d] = useState(false);
  const [usarRef, setUsarRef] = useState(false);
  const [refs, setRefs] = useState<string[]>([]); // fotos de esta sesión (1024 px, solo en memoria)
  const [estado, setEstado] = useState<Estado>("reposo");
  const [mensaje, setMensaje] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [simulacion, setSimulacion] = useState(false);
  const [imagenModelo, setImagenModelo] = useState<ModeloId>(MODELO_POR_DEFECTO);
  // Datos de la imagen que se ve ahora (para «Añadir al lote»); null si viene del historial
  const [ultima, setUltima] = useState<{ entrada: PromptInput; promptApi: string; modelo: ModeloId } | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [historial, guardarHistorial, agregarHistorial] = useListaLocal<ItemHistorial>(
    CLAVE_HISTORIAL,
    esItemHistorial,
    MAX_HISTORIAL,
  );
  const [guardadas, guardarGuardadas] = useListaLocal(CLAVE_REFERENCIAS, esReferenciaGuardada, MAX_REFERENCIAS_GUARDADAS);
  const inputArchivo = useRef<HTMLInputElement>(null);
  // Evitan que una respuesta antigua pise a una generación más nueva
  const intento = useRef(0);
  const lanzamiento = useRef(0);

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
  const ocupado = estado === "generando" || variantes.some((v) => v.estado === "generando");

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
  async function registrar(url: string, esSimulacion: boolean, id: ModeloId, conTexto: boolean, etiqueta = "") {
    let thumb: string | undefined;
    try {
      thumb = await reducirImagen(url, LADO_MINIATURA, 0.7);
    } catch {
      thumb = undefined; // p. ej. el servidor de la imagen no permite copiarla: se guarda solo la URL
    }
    const remota = !esSimulacion && url.startsWith("https://") ? url : undefined;
    if (!thumb && !remota) return;
    agregarHistorial({
      id: nuevoId(),
      fecha: new Date().toISOString(),
      modelo: `${buscarModelo(id)!.nombre}${etiqueta ? ` · ${etiqueta}` : ""}`,
      texto3d: conTexto,
      simulacion: esSimulacion,
      thumb,
      url: remota,
    });
  }

  function verDelHistorial(item: ItemHistorial) {
    setImagenUrl(item.url ?? item.thumb ?? null);
    setSimulacion(item.simulacion);
    setUltima(null);
    setEstado("listo");
  }

  /* ───────── petición a la API (una imagen) ───────── */
  async function pedirImagen(
    promptApi: string,
    id: ModeloId,
    fotos: string[],
    alMensaje: (m: string) => void,
    vigente: () => boolean,
  ): Promise<{ url: string; simulacion: boolean } | null> {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptApi,
        modelo: id,
        aspectRatio: ASPECTO,
        ...(fotos.length ? { imagenesReferencia: fotos } : {}),
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error ?? "No se pudo generar la imagen.");
    if (j.estado === "completado") return { url: j.imagenUrl, simulacion: !!j.simulacion };

    const inicio = Date.now();
    while (Date.now() - inicio < ESPERA_MAX_MS) {
      await pausa(SONDEO_MS);
      if (!vigente()) return null; // se lanzó otra generación
      const q = new URLSearchParams({ statusUrl: j.statusUrl, responseUrl: j.responseUrl });
      const r = await fetch(`/api/generate?${q}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo consultar el estado.");
      if (d.estado === "completado") return { url: d.imagenUrl, simulacion: false };
      alMensaje(d.estado === "en_cola" ? "En cola en fal.ai…" : "Generando la imagen…");
    }
    throw new Error("La imagen tardó demasiado. Vuelve a intentar o prueba con otro modelo.");
  }

  /* ───────── una imagen ───────── */
  async function generar() {
    if (!prompt || !entrada || faltanFotos) return;
    const mio = ++intento.current;
    const id = modeloId;
    const conTexto = texto3d;
    const usada = entrada;
    const promptUsado = prompt;
    setVariantes([]);
    setEstado("generando");
    setMensaje(refsEnvio.length ? "Subiendo las fotos de referencia y enviando el prompt…" : "Enviando el prompt…");
    try {
      const r = await pedirImagen(promptUsado, id, refsEnvio, (m) => mio === intento.current && setMensaje(m), () => mio === intento.current);
      if (!r || mio !== intento.current) return;
      setImagenUrl(r.url);
      setSimulacion(r.simulacion);
      setImagenModelo(id);
      setUltima({ entrada: usada, promptApi: promptUsado, modelo: id });
      setEstado("listo");
      toast.success(r.simulacion ? "Imagen de simulación lista" : "Imagen lista");
      void registrar(r.url, r.simulacion, id, conTexto);
    } catch (e) {
      if (mio !== intento.current) return;
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo generar la imagen.");
    }
  }

  /* ───────── 3 variantes A/B ───────── */
  async function consultarSimulacion(): Promise<boolean | null> {
    try {
      const r = await fetch("/api/generate?modo=1");
      return (await r.json()).simulacion === true;
    } catch {
      return null;
    }
  }

  async function generarVariantes() {
    if (!entrada || faltanFotos) return;
    // Antes de gastar dinero real se pide confirmación (en simulación no hace falta)
    const sim = await consultarSimulacion();
    if (sim === false) {
      const costo = modelo.costoUsd != null ? `≈ USD ${(modelo.costoUsd * 3).toFixed(2)}` : "costo no publicado por fal.ai";
      if (!window.confirm(`Se generarán 3 imágenes reales con ${modelo.nombre} (${costo}). ¿Continuar?`)) return;
    }
    const id = modeloId;
    const conTexto = texto3d;
    const fotos = [...refsEnvio];
    const mio = ++lanzamiento.current;
    ++intento.current; // cancela cualquier generación individual en curso
    setEstado("reposo");
    setImagenUrl(null);

    const vs = crearVariantes(entrada, {
      paletas: PALETAS_FIJAS,
      badges: BADGES_REALES,
      bloquearPaleta: bloqueos.paleta,
      bloquearBadge: bloqueos.badge,
    });
    const inicial: Variante[] = vs.map((v) => ({
      letra: v.letra,
      emocion: v.emocion,
      entrada: v.entrada,
      promptApi: buildApiPrompt(v.entrada, { texto3d: conTexto, referencia: fotos.length > 0 }),
      estado: "generando",
      modelo: id,
    }));
    setVariantes(inicial);

    await Promise.all(
      inicial.map(async (v, k) => {
        const actualizar = (cambio: Partial<Variante>) =>
          mio === lanzamiento.current && setVariantes((x) => x.map((y, j) => (j === k ? { ...y, ...cambio } : y)));
        try {
          const r = await pedirImagen(v.promptApi, id, fotos, (m) => actualizar({ mensaje: m }), () => mio === lanzamiento.current);
          if (!r || mio !== lanzamiento.current) return;
          actualizar({ estado: "listo", url: r.url, simulacion: r.simulacion, mensaje: undefined });
          void registrar(r.url, r.simulacion, id, conTexto, `${v.letra} ${EMOCIONES_AB[v.emocion].nombre}`);
        } catch (e) {
          actualizar({ estado: "error", mensaje: e instanceof Error ? e.message : "No se pudo generar la imagen." });
        }
      }),
    );
    if (mio === lanzamiento.current) toast.success("Variantes A/B terminadas");
  }

  /* ───────── descargas y lote ───────── */
  async function descargarPng(url: string, nombre: string) {
    try {
      const blob = await urlAPng(url);
      const objeto = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objeto;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(objeto);
    } catch {
      // Si el navegador bloquea la conversión, se abre la imagen para guardarla a mano
      window.open(url, "_blank", "noopener");
      toast.message("Se abrió la imagen en otra pestaña: clic derecho → Guardar imagen como…");
    }
  }

  function itemLote(e: PromptInput, promptApi: string, url: string, etiqueta: string): LoteItem {
    const g = generatePrompt(e, { baseUrl: typeof window !== "undefined" ? window.location.origin : "" });
    return { ...g, etiqueta, imagenUrl: url, promptApi };
  }

  function agregarUna() {
    if (!ultima || !imagenUrl) return;
    onAgregarAlLote([itemLote(ultima.entrada, ultima.promptApi, imagenUrl, buscarModelo(ultima.modelo)!.nombre)]);
    toast.success("Imagen añadida al lote");
  }

  function agregarVariantes(lista: Variante[]) {
    const items = lista
      .filter((v) => v.estado === "listo" && v.url)
      .map((v) => itemLote(v.entrada, v.promptApi, v.url!, `${v.letra} ${EMOCIONES_AB[v.emocion].nombre}`));
    if (!items.length) return;
    onAgregarAlLote(items);
    toast.success(items.length === 1 ? "Variante añadida al lote" : `${items.length} variantes añadidas al lote`);
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Generar imagen con IA</h3>
      <CreditosFal />

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

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={generar} disabled={!prompt || ocupado || faltanFotos}>
          {estado === "generando" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          {estado === "generando" ? "Generando…" : "Generar imagen"}
        </Button>
        <Button variant="secondary" onClick={() => void generarVariantes()} disabled={!prompt || ocupado || faltanFotos}>
          {variantes.some((v) => v.estado === "generando") ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
          Generar 3 variantes A/B
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Las 3 variantes comparten problema, plano, idioma y persona; cambian la emoción (pánico, sorpresa, alivio), la paleta y el
        badge, para «Probar y comparar» en YouTube Studio. Las paletas y badges con candado 🔒 no cambian.
      </p>

      {estado === "generando" && <p className="text-xs text-muted-foreground">{mensaje}</p>}
      {estado === "error" && (
        <p role="alert" className="rounded-md border border-destructive/50 p-2 text-sm text-destructive">
          {mensaje}
        </p>
      )}

      {imagenUrl && estado !== "generando" && variantes.length === 0 && (
        <div className="space-y-2">
          {simulacion && (
            <p className="rounded-md border border-amber-500/50 p-2 text-sm text-amber-500">
              Modo simulación activo: no hay FAL_KEY configurada, esta imagen es de prueba y no tiene costo.
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagenUrl} alt="Miniatura generada" className="aspect-video w-full rounded-md border object-cover" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => void descargarPng(imagenUrl, `miniatura-${imagenModelo}.png`)}>
              <Download className="size-4" />
              Descargar PNG
            </Button>
            <Button variant="outline" onClick={agregarUna} disabled={!ultima}>
              <Plus className="size-4" />
              Añadir imagen al lote
            </Button>
          </div>
        </div>
      )}

      {variantes.length > 0 && (
        <div className="space-y-3">
          {variantes.some((v) => v.simulacion) && (
            <p className="rounded-md border border-amber-500/50 p-2 text-sm text-amber-500">
              Modo simulación activo: no hay FAL_KEY configurada, estas imágenes son de prueba y no tienen costo.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-3">
            {variantes.map((v) => (
              <li key={v.letra} className="space-y-2 rounded-md border p-2" aria-label={`Variante ${v.letra}`}>
                <p className="text-sm font-semibold">
                  {v.letra} · {EMOCIONES_AB[v.emocion].nombre}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  {v.entrada.paleta} · {v.entrada.badge}
                </p>
                {v.estado === "generando" && (
                  <div className="flex aspect-video items-center justify-center rounded border text-xs text-muted-foreground">
                    <Loader2 className="mr-1 size-4 animate-spin" />
                    {v.mensaje ?? "Generando…"}
                  </div>
                )}
                {v.estado === "error" && (
                  <p role="alert" className="rounded border border-destructive/50 p-2 text-xs text-destructive">
                    {v.mensaje}
                  </p>
                )}
                {v.estado === "listo" && v.url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.url} alt={`Variante ${v.letra}`} className="aspect-video w-full rounded border object-cover" />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void descargarPng(v.url!, `miniatura-${v.letra}-${v.emocion}.png`)}
                      >
                        <Download className="size-3" />
                        PNG
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => agregarVariantes([v])}>
                        <Plus className="size-3" />
                        Lote
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => agregarVariantes(variantes)}
            disabled={!variantes.some((v) => v.estado === "listo")}
          >
            <Plus className="size-4" />
            Añadir las variantes terminadas al lote
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
