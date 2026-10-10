// Edad del panel agrupada por papel y tono emocional. Sin dependencias (lo usan prompt-config, enfoques y el panel).
//   18 a 25 y 26 a 35 años → operarios y clientes: desesperación, frustración, preocupación extrema
//   36 a 45 y 46 a 55 años → autoridad: autoridad, seguridad, profesionalidad, serenidad, dominio técnico
// Las listas internas de edad (EDADES de prompt-config) siguen existiendo para los arquetipos y la API.

export type Tono = "cliente" | "autoridad";

export const GRUPOS_EDAD: { label: string; tono: Tono; opciones: readonly string[] }[] = [
  { label: "Operarios y clientes (18 a 35 años)", tono: "cliente", opciones: ["18 a 25 años", "26 a 35 años"] },
  { label: "Autoridad (36 a 55 años)", tono: "autoridad", opciones: ["36 a 45 años", "46 a 55 años"] },
];

export const EDADES_PANEL: string[] = GRUPOS_EDAD.flatMap((g) => [...g.opciones]);

/** Rango interno de las listas de rostro y de coherencia al que equivale cada grupo del panel. */
const INTERNA: Record<string, "Joven 18-25" | "Adulto Joven 30-40" | "Adulto Mayor 45-55"> = {
  "18 a 25 años": "Joven 18-25",
  "26 a 35 años": "Adulto Joven 30-40",
  "36 a 45 años": "Adulto Joven 30-40",
  "46 a 55 años": "Adulto Mayor 45-55",
};
export const edadInterna = (label: string) => INTERNA[label] ?? "Adulto Joven 30-40";

/** «aged 26 to 30» en el prompt. */
export const edadTexto = (label: string): string | undefined => {
  const m = /^(\d+) a (\d+) años$/.exec(label);
  return m ? `${m[1]} to ${m[2]}` : undefined;
};

export const tonoDeEdad = (label: string): Tono | undefined => GRUPOS_EDAD.find((g) => g.opciones.includes(label))?.tono;

/* ───────── Emociones por tono ───────── */
export const EMOCION_AUTO = "Automática (según enfoque y edad)";

export const EMOCIONES_EDAD: Record<string, { tono: Tono; faceEn: string; afectoEs: string; resumen: string }> = {
  "Desesperación": {
    tono: "cliente",
    faceEn: "an expression of deep desperation, eyes wide and pleading, brows drawn together, mouth tense, as if everything were falling apart",
    afectoEs: "por la desesperación",
    resumen: "desesperación",
  },
  "Frustración": {
    tono: "cliente",
    faceEn: "an expression of extreme frustration, brows fiercely furrowed, teeth clenched, technical rage",
    afectoEs: "por la frustración",
    resumen: "frustración",
  },
  "Preocupación extrema": {
    tono: "cliente",
    faceEn: "an expression of extreme worry and anxiety, brows raised and drawn together, wide uneasy eyes, lips pressed tight",
    afectoEs: "por la preocupación extrema",
    resumen: "preocupación extrema",
  },
  "Autoridad": {
    tono: "autoridad",
    faceEn: "a commanding, authoritative expression, steady direct eyes, a firm jaw and a subtle confident smile",
    afectoEs: "",
    resumen: "autoridad",
  },
  "Seguridad": {
    tono: "autoridad",
    faceEn: "an expression of absolute confidence and self-assurance, bright steady eyes and a relaxed, confident smile",
    afectoEs: "",
    resumen: "seguridad",
  },
  "Profesionalidad": {
    tono: "autoridad",
    faceEn: "a composed, professional expression, calm attentive eyes and a slight reassuring smile",
    afectoEs: "",
    resumen: "profesionalidad",
  },
  "Dominio técnico": {
    tono: "autoridad",
    faceEn: "an expression of technical mastery and total control, focused steady eyes, a firm composed face and a subtle knowing smile",
    afectoEs: "",
    resumen: "dominio técnico",
  },
  "Serenidad": {
    tono: "autoridad",
    faceEn: "a serene, calm expression, relaxed brows, soft steady eyes and a gentle smile",
    afectoEs: "",
    resumen: "serenidad",
  },
};

export const EMOCIONES_POR_TONO: Record<Tono, string[]> = {
  cliente: Object.keys(EMOCIONES_EDAD).filter((k) => EMOCIONES_EDAD[k].tono === "cliente"),
  autoridad: Object.keys(EMOCIONES_EDAD).filter((k) => EMOCIONES_EDAD[k].tono === "autoridad"),
};

/** Emoción que se aplica: la elegida (si encaja con el tono de la edad) o, con edad de autoridad y sin enfoque, «Seguridad». Con enfoque, «Automática» deja la emoción del enfoque. */
export function emocionEfectiva(edad: string, elegida: string, conEnfoque: boolean): string | undefined {
  const t = tonoDeEdad(edad);
  if (!t) return undefined;
  if (elegida !== EMOCION_AUTO && EMOCIONES_POR_TONO[t].includes(elegida)) return elegida;
  return !conEnfoque && t === "autoridad" ? "Seguridad" : undefined;
}
