// Los 3 enfoques estratégicos: la profesión decide la etnia permitida, la edad ideal, el dispositivo, la emoción, la mirada y las manos.
// No se mezclan variables entre enfoques. Solo afecta al panel manual (la API de TexTube no lo usa).

export type Enfoque = 1 | 2 | 3;

export type InfoEnfoque = {
  nombre: string;
  impacto: string;
  dolor: string;
  etnias: readonly string[];
  /** Dispositivo fijo del enfoque (uno de DISPOSITIVOS) */
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
    emocion: "Frustración extrema y shock",
    mirada: "Ojos muy abiertos por el shock",
    manos: "Derecha con el teléfono firme; izquierda agarrándose la cabeza, jalándose el cabello o abierta en el aire (incomprensión)",
  },
  2: {
    nombre: "El Pánico Profesional",
    impacto: "Urgencia de tiempo",
    dolor: "Un jefe exige el reporte, los alumnos esperan o un cierre o una licitación está por vencer.",
    etnias: [E_CAUCASICO, E_LATINO],
    dispositivo: "PC / Laptop",
    emocion: "Pánico absoluto y ansiedad",
    mirada: "Ojos asustados y muy abiertos",
    manos: "Cuerpo encorvado o echado hacia atrás; derecha en el ratón; izquierda cubriéndose la boca o frotándose los ojos",
  },
  3: {
    nombre: "La Solución del Experto",
    impacto: "Autoridad técnica",
    dolor: "El experto encontró la herramienta remota y resuelve el problema de su cliente.",
    etnias: [E_ASIATICO, E_CAUCASICO],
    dispositivo: "PC / Laptop",
    emocion: "Confianza absoluta, triunfo y alivio, con sonrisa",
    mirada: "Ojos brillantes y seguros, con sonrisa",
    manos: "Cuerpo inclinado hacia adelante; derecha en el ratón; izquierda con el pulgar arriba o señalando su propio monitor",
  },
};

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

/** Enfoque de la profesión (o undefined si la profesión es nueva y no está asignada). */
export const enfoqueDe = (profesion: string): Enfoque | undefined => PROFESIONES_ENFOQUE[profesion];

const JOVENES = new Set(["Asistente Corporativa", "Recepcionista", "Teletrabajadora", "Coordinadora"]);

/** Rangos de edad del panel que encajan con la edad ideal del enfoque (22-30 en asistentes y recepcionistas; 35-55 en dueños, 25-55 en técnicos). */
export function edadesDelEnfoque(profesion: string): readonly string[] | undefined {
  const e = enfoqueDe(profesion);
  if (!e) return undefined;
  if (e === 2 && JOVENES.has(profesion)) return ["Joven 18-25", "Adulto Joven 30-40"];
  return ["Adulto Joven 30-40", "Adulto Mayor 45-55"];
}

/** Corrige etnia, edad y dispositivo de un formulario para que respeten el enfoque de su profesión. Sin enfoque, no toca nada. */
export function normalizarEnfoque<T extends { profesion: string; etnia: string; edad: string; dispositivo: string }>(f: T): T {
  const e = enfoqueDe(f.profesion);
  if (!e) return f;
  const info = ENFOQUES[e];
  const edades = edadesDelEnfoque(f.profesion) ?? [];
  return {
    ...f,
    etnia: info.etnias.includes(f.etnia) ? f.etnia : info.etnias[0],
    edad: edades.includes(f.edad) ? f.edad : edades[0],
    dispositivo: info.dispositivo,
  };
}
