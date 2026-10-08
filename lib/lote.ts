import type { GeneratedPrompt } from "@/lib/prompt-config";

// Elementos del lote descargable: el prompt de siempre y, opcionalmente, la imagen generada.
export type LoteItem = GeneratedPrompt & {
  /** Etiqueta legible (p. ej. «A-panico» o el nombre del modelo) */
  etiqueta?: string;
  /** Imagen generada (URL de fal.ai o data URI de la simulación) */
  imagenUrl?: string;
  /** Prompt en inglés que se envió a la API de imágenes */
  promptApi?: string;
};

/** Texto seguro para nombres de archivo. */
export function slug(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "imagen"
  );
}

export type NombresLote = { txt: string; api?: string; imagen?: string };

/** Nombres de archivo del ZIP: prompt-01.txt, prompt-01.api.txt y imagenes/imagen-01-<etiqueta>.png (todos únicos). */
export function nombresLote(items: LoteItem[]): NombresLote[] {
  const ancho = Math.max(2, String(items.length).length);
  return items.map((it, i) => {
    const n = String(i + 1).padStart(ancho, "0");
    return {
      txt: `prompt-${n}.txt`,
      api: it.promptApi ? `prompt-${n}.api.txt` : undefined,
      imagen: it.imagenUrl ? `imagenes/imagen-${n}-${slug(it.etiqueta ?? "")}.png` : undefined,
    };
  });
}
