import {
  ACCESORIO_ALEATORIO,
  ARQUETIPOS,
  ARQUETIPO_ALEATORIO,
  BADGE_ALEATORIO,
  GAFAS_ALEATORIAS,
  MARCOS,
  PALETA_ALEATORIA,
  PERFILES,
  PLANOS,
  buildApiPrompt,
  cerebroPostura,
  generatePrompt,
  resolverAccesorio,
  resolverArquetipo,
  resolverBadge,
  resolverGafas,
  resolverPaleta,
  type EmocionAB,
  type PromptInput,
} from "@/lib/prompt-config";
import { ARQUETIPOS_ALTA, PLANO_ALTA, PROFESIONES_ALTA, type Prioridad } from "@/lib/prioridad";
import { auditarPrompt } from "@/lib/prohibidos";

/**
 * Instrucciones de composición que TexTube aplica POR CÓDIGO sobre la imagen (la imagen se genera SIN texto).
 * Viven aquí, en MiniTube, para que TexTube no tenga copia de las reglas de miniatura.
 */
export const COMPOSICION = {
  ancho: 1280,
  alto: 720,
  marcaDeAgua: { texto: "ResetEnLinea.com", esquina: "inferior-izquierda", opacidad: 0.35 },
  ventanaError: { esquina: "inferior-izquierda" },
  zonasLibres: ["inferior-izquierda", "inferior-derecha"],
  textoPrincipal: { evitarEsquina: "inferior-derecha", estilo: "3d-contorno-sombra-alto-contraste" },
} as const;

// MOTOR DE MINIATURAS (única fuente de verdad): a partir de Marca, Modelo y Error decide la persona, la escena y
// arma los dos prompts con las MISMAS funciones que usa el panel web. La API pública (/api/v1/thumbnail) solo llama aquí.

export type Enfoque = "error" | "solucion";

export type Solicitud = {
  marca: string;
  modelo: string;
  error: string;
  enfoque: Enfoque;
  generarImagen: boolean;
  semilla?: number;
};

export type Validacion = { ok: true; solicitud: Solicitud } | { ok: false; mensaje: string; campos: string[] };

const TEXTO_SEGURO = /^[\p{L}\p{N} .\-_/+()]+$/u;

/** Normaliza la marca: «EPSON», «epson», «Epson-SC» → «Epson»; «canon» → «Canon»; otras marcas con la primera en mayúscula. */
export function normalizarMarca(marca: string): string {
  const limpia = marca.trim().replace(/[-_\s]*sc$/i, "").trim();
  return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

/** Valida el cuerpo de la petición. Los mensajes van en español. */
export function validarSolicitud(cuerpo: unknown): Validacion {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return { ok: false, mensaje: "El cuerpo debe ser un objeto JSON con marca, modelo y error.", campos: ["cuerpo"] };
  }
  const c = cuerpo as Record<string, unknown>;
  const campos: string[] = [];
  const texto = (campo: string, max: number): string => {
    const v = c[campo];
    if (typeof v !== "string" || !v.trim() || v.trim().length > max || !TEXTO_SEGURO.test(v.trim())) {
      campos.push(campo);
      return "";
    }
    return v.trim();
  };
  const marca = texto("marca", 30);
  const modelo = texto("modelo", 40);
  const error = texto("error", 60);

  let enfoque: Enfoque = "error";
  if (c.enfoque !== undefined) {
    if (c.enfoque === "error" || c.enfoque === "solucion") enfoque = c.enfoque;
    else campos.push("enfoque");
  }
  let generarImagen = true;
  if (c.generarImagen !== undefined) {
    if (typeof c.generarImagen === "boolean") generarImagen = c.generarImagen;
    else campos.push("generarImagen");
  }
  let semilla: number | undefined;
  if (c.semilla !== undefined) {
    if (typeof c.semilla === "number" && Number.isInteger(c.semilla) && c.semilla >= 0 && c.semilla <= 2_147_483_647) semilla = c.semilla;
    else campos.push("semilla");
  }

  // Palabras que nunca deben llegar a un prompt de imagen (WhatsApp, teléfonos, «reparar», «tutorial»)
  const conPalabraProhibida: string[] = [];
  for (const campo of ["marca", "modelo", "error"] as const) {
    if (typeof c[campo] === "string" && auditarPrompt(c[campo] as string).length && !campos.includes(campo)) {
      campos.push(campo);
      conPalabraProhibida.push(campo);
    }
  }
  if (campos.length) {
    const detalle: Record<string, string> = {
      cuerpo: "el cuerpo",
      marca: "marca (texto de 1 a 30 caracteres)",
      modelo: "modelo (texto de 1 a 40 caracteres)",
      error: "error (texto de 1 a 60 caracteres)",
      enfoque: "enfoque (debe ser «error» o «solucion»)",
      generarImagen: "generarImagen (debe ser verdadero o falso)",
      semilla: "semilla (número entero entre 0 y 2147483647)",
    };
    const describir = (k: string) => (conPalabraProhibida.includes(k) ? `${k} (contiene una palabra no permitida en prompts de imagen)` : (detalle[k] ?? k));
    return { ok: false, mensaje: `Datos inválidos o incompletos: ${campos.map(describir).join("; ")}.`, campos };
  }
  return { ok: true, solicitud: { marca: normalizarMarca(marca), modelo, error, enfoque, generarImagen, semilla } };
}

/** Generador pseudoaleatorio reproducible (mulberry32): la misma semilla produce siempre la misma escena. */
export function crearRnd(semilla: number): () => number {
  let a = (semilla >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PersonajeResumen = {
  arquetipo: string;
  genero: string;
  edad: string;
  anios: string;
  origen: string;
  cabello: string;
  rasgos: string;
  gafas: string;
  postura: string;
};

export type Plan = {
  semilla: number;
  entrada: PromptInput;
  profesion: string;
  plano: string;
  emocion: EmocionAB;
  personaje: PersonajeResumen;
  /** Prompt en inglés para la API de imágenes (sin texto dentro de la imagen) */
  promptImagen: string;
  /** Prompt completo en español para copiar a Gemini a mano */
  promptGemini: string;
};

const elegir = <T>(lista: readonly T[], rnd: () => number): T => lista[Math.floor(rnd() * lista.length)];

/** Sortea la escena y arma los prompts. Misma semilla + mismos datos = mismo resultado. */
export function planificar(s: Solicitud, prioridad: Prioridad = "normal"): Plan {
  const semilla = s.semilla ?? Math.floor(Math.random() * 2_147_483_647);
  const rnd = crearRnd(semilla);

  // Prioridad ALTA (plotters): mujer joven de 20 a 30 años, plano detalle y una profesión de gran formato.
  const alta = prioridad === "alta";
  const profesion = alta ? elegir(PROFESIONES_ALTA, rnd) : elegir(Object.keys(PERFILES), rnd);
  const arquetipo = alta ? resolverArquetipo(ARQUETIPO_ALEATORIO, rnd(), ARQUETIPOS_ALTA) : resolverArquetipo(ARQUETIPO_ALEATORIO, rnd());
  const a = ARQUETIPOS[arquetipo];
  const plano = alta ? PLANO_ALTA : elegir(PLANOS, rnd).es;
  const emocion: EmocionAB = s.enfoque === "solucion" ? "alivio" : "panico"; // error → pánico · solución → alivio
  const gafas = resolverGafas(GAFAS_ALEATORIAS, rnd);
  const accesorio = resolverAccesorio(ACCESORIO_ALEATORIO, profesion, rnd());

  const entrada: PromptInput = {
    marca: s.marca,
    modelo: s.modelo,
    error: s.error,
    genero: a.genero,
    edad: a.edad as PromptInput["edad"],
    etnia: a.etnia,
    profesion,
    marco: elegir(MARCOS, rnd).es,
    plano,
    idioma: "Español",
    badge: resolverBadge(BADGE_ALEATORIO, rnd),
    gafas,
    accesorio,
    paleta: resolverPaleta(PALETA_ALEATORIA, rnd),
    arquetipo,
    emocion,
    ...(alta ? { plotter: true } : {}),
  };
  return {
    semilla,
    entrada,
    profesion,
    plano,
    emocion,
    personaje: {
      arquetipo,
      genero: a.genero,
      edad: a.edad,
      anios: a.edadAnios.replace(" to ", "-"),
      origen: a.origen?.es ?? a.etnia,
      cabello: a.cabello.es,
      rasgos: a.rasgosEs,
      gafas,
      postura: cerebroPostura(accesorio).manosEs,
    },
    promptImagen: buildApiPrompt(entrada, { texto3d: false }),
    promptGemini: generatePrompt(entrada).promptText,
  };
}
