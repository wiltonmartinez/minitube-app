"use client";

import { Download, ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
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
import { ASPECTO, MODELOS, MODELO_POR_DEFECTO, buscarModelo, type ModeloId } from "@/lib/image-models";

type Estado = "reposo" | "generando" | "listo" | "error";

const ESPERA_MAX_MS = 240_000; // tiempo máximo esperando a fal.ai
const SONDEO_MS = 2_000;

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Genera la imagen del prompt actual con el modelo elegido (o una simulación si no hay FAL_KEY). */
export function ImageGenerator({ prompt }: { prompt: string }) {
  const [modeloId, setModeloId] = useState<ModeloId>(MODELO_POR_DEFECTO);
  const [estado, setEstado] = useState<Estado>("reposo");
  const [mensaje, setMensaje] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [simulacion, setSimulacion] = useState(false);
  const [imagenModelo, setImagenModelo] = useState<ModeloId>(MODELO_POR_DEFECTO);
  // Evita que una respuesta antigua pise a una generación más nueva
  const intento = useRef(0);

  const modelo = buscarModelo(modeloId)!;

  async function generar() {
    if (!prompt) return;
    const mio = ++intento.current;
    setEstado("generando");
    setMensaje("Enviando el prompt…");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelo: modeloId, aspectRatio: ASPECTO }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "No se pudo generar la imagen.");

      if (j.estado === "completado") {
        if (mio !== intento.current) return;
        setImagenUrl(j.imagenUrl);
        setSimulacion(!!j.simulacion);
        setImagenModelo(modeloId);
        setEstado("listo");
        toast.success(j.simulacion ? "Imagen de simulación lista" : "Imagen lista");
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
          setImagenUrl(d.imagenUrl);
          setSimulacion(false);
          setImagenModelo(modeloId);
          setEstado("listo");
          toast.success("Imagen lista");
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
        <Select value={modeloId} onValueChange={(v) => setModeloId(v as ModeloId)}>
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

      <Button className="w-full" onClick={generar} disabled={!prompt || estado === "generando"}>
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
    </section>
  );
}
