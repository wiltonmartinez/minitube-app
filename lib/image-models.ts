// Catálogo de modelos de imagen de fal.ai (identificadores verificados en la documentación oficial, oct-2026).
// Este archivo se usa en el navegador y en el servidor: NO contiene ninguna clave.

export type ModeloId = "gpt-image-2" | "nano-banana-pro" | "seedream-5-pro" | "flux-2-pro";

export type ModeloIA = {
  id: ModeloId;
  nombre: string;
  /** Identificador exacto del endpoint en fal.ai */
  endpoint: string;
  descripcion: string;
  /** Costo aproximado por imagen (USD) o null si fal no lo publica */
  costoUsd: number | null;
  /** Texto de costo que ve el usuario */
  costoTexto: string;
  /** Escribe bien texto 3D dentro de la imagen (se usa en la Fase 2) */
  textoEnImagen: boolean;
  /** Tamaño real que se pide, para mostrarlo en la interfaz */
  resolucion: string;
  /** Construye la entrada del modelo (16:9) a partir del prompt */
  entrada: (prompt: string) => Record<string, unknown>;
};

export const ASPECTO = "16:9" as const;

export const MODELOS: ModeloIA[] = [
  {
    id: "gpt-image-2",
    nombre: "GPT Image 2",
    endpoint: "openai/gpt-image-2",
    descripcion: "El mejor para texto 3D dentro de la imagen.",
    costoUsd: null,
    costoTexto: "Precio por imagen no publicado por fal (depende de la calidad); se mide en la prueba real",
    textoEnImagen: true,
    resolucion: "1280×720",
    // Dimensiones múltiplos de 16, entre 655 360 y 8 294 400 píxeles totales
    entrada: (prompt) => ({
      prompt,
      image_size: { width: 1280, height: 720 },
      quality: "high",
      num_images: 1,
      output_format: "png",
    }),
  },
  {
    id: "nano-banana-pro",
    nombre: "Nano Banana Pro",
    endpoint: "fal-ai/nano-banana-pro",
    descripcion: "Retratos tipo estudio y consistencia con referencias.",
    costoUsd: 0.15,
    costoTexto: "≈ USD 0.15 por imagen (4K cuesta el doble)",
    textoEnImagen: true,
    resolucion: "16:9 · 1K",
    entrada: (prompt) => ({
      prompt,
      aspect_ratio: ASPECTO,
      resolution: "1K",
      num_images: 1,
      output_format: "png",
    }),
  },
  {
    id: "seedream-5-pro",
    nombre: "Seedream 5.0 Pro",
    endpoint: "bytedance/seedream/v5/pro/text-to-image",
    descripcion: "Mucho detalle de piel y buen precio.",
    costoUsd: 0.0675,
    costoTexto: "≈ USD 0.07 por imagen",
    textoEnImagen: false,
    resolucion: "1920×1080",
    // Exige entre 1024×1024 y 2048×2048 píxeles totales: 1280×720 no cumple, 1920×1080 sí
    entrada: (prompt) => ({
      prompt,
      image_size: { width: 1920, height: 1080 },
      num_images: 1,
      output_format: "png",
    }),
  },
  {
    id: "flux-2-pro",
    nombre: "FLUX.2 Pro",
    endpoint: "fal-ai/flux-2-pro",
    descripcion: "Fotorrealismo barato.",
    costoUsd: 0.03,
    costoTexto: "≈ USD 0.03 por imagen",
    textoEnImagen: false,
    resolucion: "16:9",
    entrada: (prompt) => ({
      prompt,
      image_size: "landscape_16_9",
      output_format: "png",
    }),
  },
];

export const MODELO_POR_DEFECTO: ModeloId = "flux-2-pro";

export const buscarModelo = (id: string): ModeloIA | undefined => MODELOS.find((m) => m.id === id);
