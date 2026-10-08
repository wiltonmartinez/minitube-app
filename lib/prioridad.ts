import { MODELOS, MODELO_POR_DEFECTO, buscarModelo, type ModeloIA } from "@/lib/image-models";
import { ARQUETIPOS, ARQUETIPOS_LISTA, PLANOS } from "@/lib/prompt-config";

// ENRUTADOR DE PRIORIDAD (única fuente de verdad: lo usan la API y el panel web).
//   · ALTA   → plotters Epson SureColor F570, F571, T3170 y T3170X: Seedream 5.0 Pro, plano detalle, mujer joven (20–30)
//              y una profesión de gran formato (sublimación, vinilo o fotografía).
//   · NORMAL → el resto de modelos: el motor sortea persona y plano, y se genera con el modelo «normal» (ver abajo).
export type Prioridad = "alta" | "normal";

/** Plotters de prioridad alta (ya normalizados). T3170 y T3170X son distintos; ambos son alta. */
export const PLOTTERS_ALTA = ["F570", "F571", "T3170", "T3170X"] as const;

/** Profesiones de gran formato para los plotters. */
export const PROFESIONES_ALTA = ["Sublimación", "Impresión en vinilo", "Fotografía"] as const;

export const PLANO_ALTA = PLANOS[0].es; // Plano Detalle

/**
 * Normaliza un modelo antes de compararlo: ignora mayúsculas, espacios, guiones y prefijos comerciales.
 * «SC-F570», «SureColor F571», «sc t3170x», «Epson SureColor SC-T3170» → «F570», «F571», «T3170X», «T3170».
 */
export function normalizarModelo(texto: string): string {
  let t = texto.toUpperCase().replace(/[\s\-_.]+/g, "");
  // Se quitan los prefijos comerciales en cualquier orden: «EPSON», «SURECOLOR» y «SC». «SC» solo si le sigue una letra
  // y un dígito (SCF570 → F570), para no dañar otros modelos.
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    if (t.startsWith("EPSON") && t.length > 5) t = t.slice(5);
    else if (t.startsWith("SURECOLOR") && t.length > 9) t = t.slice(9);
    else if (/^SC[A-Z]\d/.test(t)) t = t.slice(2);
    else break;
  }
  return t;
}

export function esPrioridadAlta(modelo: string): boolean {
  return (PLOTTERS_ALTA as readonly string[]).includes(normalizarModelo(modelo));
}

/** Arquetipos de «mujer joven de 20 a 30 años» (prioridad alta). */
export const ARQUETIPOS_ALTA: string[] = ARQUETIPOS_LISTA.filter((n) => {
  const a = ARQUETIPOS[n];
  const [min, max] = a.edadAnios.split(" to ").map(Number);
  return a.genero === "Mujer" && min >= 20 && max <= 30;
});

/**
 * Modelo de la prioridad NORMAL. Por defecto FLUX.2 Pro (fal.ai, ≈ USD 0.03). Con MINITUBE_MODELO_NORMAL=manual no se
 * genera ninguna imagen y la API devuelve el prompt de Gemini para generarla a mano.
 */
export type ModoNormal = "fal" | "manual";

export type Ruta = {
  prioridad: Prioridad;
  modelo: ModeloIA;
  /** «fal»: se genera con fal.ai · «manual»: no se genera nada (se devuelve el promptGemini) */
  generacion: ModoNormal;
};

export function elegirRuta(modelo: string, entorno: Record<string, string | undefined> = process.env): Ruta {
  if (esPrioridadAlta(modelo)) {
    return { prioridad: "alta", modelo: buscarModelo("seedream-5-pro")!, generacion: "fal" };
  }
  const normal = buscarModelo(entorno.MINITUBE_MODELO_NORMAL ?? "") ?? buscarModelo(MODELO_POR_DEFECTO) ?? MODELOS[0];
  return { prioridad: "normal", modelo: normal, generacion: entorno.MINITUBE_MODELO_NORMAL === "manual" ? "manual" : "fal" };
}
