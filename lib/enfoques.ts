// Los 4 enfoques estratégicos: el enfoque decide la etnia permitida, la edad ideal, el dispositivo, la emoción, la mirada y las manos.
// No se mezclan variables entre enfoques. Solo afecta al panel manual (la API de TexTube no lo usa).
//   1 Negocio Detenido · 2 Pánico Profesional · 3 Solución del Experto · 4 Cliente Salvado (éxito y alivio)

import { GRUPOS_EDAD } from "@/lib/edades";

export type Enfoque = 1 | 2 | 3 | 4;

export type InfoEnfoque = {
  nombre: string;
  impacto: string;
  dolor: string;
  etnias: readonly string[];
  /** Dispositivo por defecto del enfoque (uno de DISPOSITIVOS) */
  dispositivo: string;
  emocion: string;
  mirada: string;
  manos: string;
};

const E_LATINO = "Latino / Mestizo";
const E_AFRO = "Afrodescendiente / Afro-latino";
const E_CAUCASICO = "Caucásico / Mediterráneo";
const E_ASIATICO = "Asiático / Coreano";

export const ENFOQUES: Record<Enfoque, InfoEnfoque> = {
  1: {
    nombre: "El Negocio Detenido",
    impacto: "Pérdida de dinero",
    dolor: "El negocio no factura y hay clientes esperando.",
    etnias: [E_LATINO, E_AFRO],
    dispositivo: "Smartphone",
    emocion: "Desesperación y frustración por los clientes que esperan",
    mirada: "Ojos muy abiertos por la desesperación",
    manos: "Derecha con el teléfono firme; izquierda agarrándose la cabeza, jalándose el cabello o abierta en el aire (incomprensión)",
  },
  2: {
    nombre: "El Pánico Profesional",
    impacto: "Urgencia de tiempo",
    dolor: "Un jefe exige el reporte, los alumnos esperan o un cierre o una licitación está por vencer.",
    etnias: [E_CAUCASICO, E_LATINO],
    dispositivo: "Laptop",
    emocion: "Preocupación extrema y desesperación por la fecha límite",
    mirada: "Ojos muy abiertos por la preocupación extrema",
    manos: "Cuerpo encorvado o echado hacia atrás; derecha en el ratón; izquierda cubriéndose la boca o frotándose los ojos",
  },
  3: {
    nombre: "La Solución del Experto",
    impacto: "Autoridad técnica",
    dolor: "El experto encontró la herramienta remota y resuelve el problema de su cliente.",
    etnias: [E_ASIATICO, E_CAUCASICO],
    dispositivo: "PC",
    emocion: "Autoridad, seguridad, profesionalidad y serenidad",
    mirada: "Ojos brillantes, seguros y serenos",
    manos: "Cuerpo inclinado hacia adelante; derecha en el ratón; izquierda con el pulgar arriba o señalando su propio monitor",
  },
  4: {
    nombre: "El Cliente Salvado",
    impacto: "Éxito y alivio",
    dolor: "El software funcionó y el cliente ve que su máquina vuelve a imprimir.",
    etnias: [E_LATINO, E_AFRO, E_CAUCASICO],
    dispositivo: "Smartphone",
    emocion: "Alivio profundo, euforia o triunfo (a elegir)",
    mirada: "Ojos brillantes de alegría al ver salir el papel",
    manos: "Smartphone: derecha con el teléfono; izquierda en el pecho (alivio) o puño en alto (euforia, triunfo). PC o Laptop: derecha en el ratón; izquierda con el pulgar arriba o el brazo en alto celebrando",
  },
};

/** Enfoque principal de cada profesión (el que se usa en «Automático»). */
const PROFESIONES_ENFOQUE: Record<string, Enfoque> = {
  "Sublimación": 1,
  "Fotocopias": 1,
  "Fotografía": 1,
  "Impresión en vinilo": 1,
  "Litografía": 2,
  "Diseñador(a) Gráfico": 2,
  "Asistente Corporativa": 2,
  Teletrabajadora: 2,
  Recepcionista: 2,
  Coordinadora: 2,
  "Profesor(a) Primaria": 2,
  "Profesor(a) Bachillerato": 2,
  "Administrador de Empresa": 2,
  "Técnico de Impresoras": 3,
  "Técnico de computadores": 3,
  "Ingeniero de sistemas": 3,
};

/** Profesiones del Enfoque 4 (cliente salvado): operarios y clientes; comparte las del enfoque 1 y algunas del 2. */
const PROFESIONES_EXITO = ["Sublimación", "Fotocopias", "Fotografía", "Diseñador(a) Gráfico", "Asistente Corporativa", "Administrador de Empresa"];

/** Enfoque principal de la profesión (o undefined si la profesión es nueva y no está asignada). */
export const enfoqueDe = (profesion: string): Enfoque | undefined => PROFESIONES_ENFOQUE[profesion];

/** ¿Encaja esta profesión con el enfoque? El 4 comparte profesiones con el 1 y el 2. */
export const profesionEnEnfoque = (profesion: string, e: Enfoque): boolean =>
  e === 4 ? PROFESIONES_EXITO.includes(profesion) : PROFESIONES_ENFOQUE[profesion] === e;

/* ───────── Selector «Enfoque» del panel ───────── */
export const ENFOQUE_AUTO = "Automático (según la profesión)";
export const ENFOQUE_LIBRE = "Sin enfoque (todo libre)";
export const etiquetaEnfoque = (e: Enfoque) => `Enfoque ${e} · ${ENFOQUES[e].nombre}`;
export const OPCIONES_ENFOQUE: string[] = [ENFOQUE_AUTO, ...([1, 2, 3, 4] as Enfoque[]).map(etiquetaEnfoque), ENFOQUE_LIBRE];

/** Enfoque efectivo según lo elegido en el selector y la profesión: Automático usa el principal de la profesión; Libre, ninguno. */
export function enfoqueEfectivo(opcion: string, profesion: string): Enfoque | undefined {
  if (opcion === ENFOQUE_LIBRE) return undefined;
  if (opcion === ENFOQUE_AUTO) return enfoqueDe(profesion);
  return ([1, 2, 3, 4] as Enfoque[]).find((e) => etiquetaEnfoque(e) === opcion);
}

/** Grupos de edad del panel que encajan con el enfoque: operarios y clientes (18 a 35) en los enfoques 1, 2 y 4; autoridad (36 a 55) en el 3. */
export function edadesDeEnfoque(e: Enfoque | undefined): readonly string[] | undefined {
  if (!e) return undefined;
  return GRUPOS_EDAD.find((g) => g.tono === (e === 3 ? "autoridad" : "cliente"))!.opciones;
}

/** Corrige etnia y edad (y el dispositivo, salvo que se haya elegido a mano) de un formulario para que respeten el enfoque. Sin enfoque, no toca nada. */
export function normalizarEnfoque<T extends { profesion: string; etnia: string; edad: string; dispositivo: string; dispositivoManual?: boolean }>(f: T, e?: Enfoque): T {
  const enf = e ?? enfoqueDe(f.profesion);
  if (!enf) return f;
  const info = ENFOQUES[enf];
  const edades = edadesDeEnfoque(enf) ?? [];
  return {
    ...f,
    etnia: info.etnias.includes(f.etnia) ? f.etnia : info.etnias[0],
    edad: edades.includes(f.edad) ? f.edad : edades[0],
    dispositivo: f.dispositivoManual ? f.dispositivo : info.dispositivo,
  };
}
