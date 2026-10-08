// Historial local de miniaturas generadas y referencias guardadas (solo miniaturas pequeñas o URLs, nunca imágenes pesadas).

export const CLAVE_HISTORIAL = "minitube.historial.v1";
export const CLAVE_REFERENCIAS = "minitube.referencias.v1";
export const MAX_HISTORIAL = 24;
export const MAX_REFERENCIAS_GUARDADAS = 8;
/** Lado largo de la miniatura del historial y de las referencias guardadas (px) */
export const LADO_MINIATURA = 320;
export const LADO_REFERENCIA_GUARDADA = 512;
/** Lado largo de las fotos de referencia que se envían a la API (px) */
export const LADO_REFERENCIA_ENVIO = 1024;

export type ItemHistorial = {
  id: string;
  fecha: string; // ISO
  modelo: string; // nombre visible del modelo
  texto3d: boolean;
  simulacion: boolean;
  /** Miniatura pequeña (data URI JPEG) */
  thumb?: string;
  /** URL de la imagen en fal.ai (solo imágenes reales) */
  url?: string;
};

export type ReferenciaGuardada = { id: string; nombre: string; imagen: string };

const esTexto = (x: unknown): x is string => typeof x === "string";
const esHttps = (x: unknown) => esTexto(x) && x.startsWith("https://");
const esDataImagen = (x: unknown) => esTexto(x) && /^data:image\/(jpeg|png|webp);base64,/.test(x) && x.length < 200_000;

export function esItemHistorial(x: unknown): x is ItemHistorial {
  const v = x as ItemHistorial;
  return (
    !!v &&
    esTexto(v.id) &&
    esTexto(v.fecha) &&
    esTexto(v.modelo) &&
    typeof v.texto3d === "boolean" &&
    typeof v.simulacion === "boolean" &&
    (v.thumb === undefined || esDataImagen(v.thumb)) &&
    (v.url === undefined || esHttps(v.url)) &&
    (v.thumb !== undefined || v.url !== undefined)
  );
}

export function esReferenciaGuardada(x: unknown): x is ReferenciaGuardada {
  const v = x as ReferenciaGuardada;
  return !!v && esTexto(v.id) && esTexto(v.nombre) && esDataImagen(v.imagen);
}

export const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
