"use client";

import { ImageUp, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { enviarAlEditor, nombreImagenEnvio } from "@/lib/envio-editor";

/**
 * Paso final de PromptTUBE: la imagen que generaste en Gemini o ChatGPT (pegada o elegida) se manda al Editor de capas,
 * donde queda guardada en la carpeta de su enfoque y puesta como fondo (Capa #1).
 */
export function EnviarAlEditor({ enfoque, profesion }: { enfoque: number | null; profesion: string }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [imagen, setImagen] = useState<{ blob: Blob; url: string; nombre: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  function tomar(f: File | null | undefined) {
    if (!f || !f.type.startsWith("image/")) return toast.error("Elige una imagen PNG, JPG o WebP.");
    const ext = f.type === "image/jpeg" ? "jpg" : f.type === "image/webp" ? "webp" : "png";
    setImagen((previa) => {
      if (previa) URL.revokeObjectURL(previa.url);
      return { blob: f, url: URL.createObjectURL(f), nombre: `${nombreImagenEnvio(enfoque, profesion)}.${ext}` };
    });
  }

  // Ctrl+V en cualquier parte de la página: pega la imagen copiada desde Gemini o ChatGPT
  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      const it = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (!it) return;
      e.preventDefault();
      tomar(it.getAsFile());
    };
    document.addEventListener("paste", alPegar);
    return () => document.removeEventListener("paste", alPegar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfoque, profesion]);

  async function enviar() {
    if (!imagen) return;
    setEnviando(true);
    try {
      await enviarAlEditor({ blob: imagen.blob, nombre: imagen.nombre, enfoque, proyecto: "" });
      router.push("/editor");
    } catch {
      toast.error("No se pudo preparar la imagen para el editor.");
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagen generada → Editor de capas</CardTitle>
        <CardDescription>
          Cuando Gemini o ChatGPT te dé la imagen, pégala aquí con Ctrl+V (o elige el archivo). Se guarda en la carpeta del{" "}
          {enfoque ? `Enfoque ${enfoque}` : "enfoque"} y queda como fondo del editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { tomar(e.target.files?.[0]); e.target.value = ""; }} />
        {imagen ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagen.url} alt="Imagen generada" className="w-full rounded-md border" />
            <p className="break-all text-xs text-muted-foreground">Se guardará como «{imagen.nombre}» en {enfoque ? `la carpeta del Enfoque ${enfoque}` : "la carpeta de entrada"}.</p>
          </div>
        ) : (
          <button type="button" onClick={() => entrada.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-accent">
            <ImageUp className="size-5" />
            Pega la imagen con Ctrl+V o haz clic para elegirla
          </button>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={enviar} disabled={!imagen || enviando}>
            <Layers className="size-4" />
            Enviar al Editor de capas
          </Button>
          {imagen && (
            <Button variant="outline" onClick={() => entrada.current?.click()}>
              Cambiar imagen
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          ¿Ya tienes la imagen guardada? En el editor, la tarjeta «Entrada» las muestra por enfoque y la eliges con un clic.
        </p>
      </CardContent>
    </Card>
  );
}
