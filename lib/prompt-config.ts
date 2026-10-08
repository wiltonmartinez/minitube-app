// Configuración de opciones, perfiles del "Controlador Maestro" y función de concatenación del prompt.
import { ARMONIA_EN, FRASE_CINTURA, LISTAS_BASE, describirCuerpo, describirRostro, nivelPlano, type Concreto, type Listas } from "@/lib/rostro";
import { resolveErrorImagePath } from "./error-images";

export const OTRO = "Otro";
export const NINGUNO = "Ninguno";

/* ───────── Bloque 1: Problema técnico ───────── */
export const MARCAS = ["Epson", "Canon"] as const;

export const ERRORES = [
  "Almohadillas",
  "Error Almohadillas",
  "E-11",
  "Error E-11",
  "5b00",
  "Error 5b00",
  "Codigo 5b00",
  "5b02",
  "Error 5b02",
  "1700",
  "Error 1700",
  "0014BD",
  "Error 0014bd",
  "00000001",
  "00000004",
  "00000008",
  "0000000C",
  "00010000",
  "00040000",
  "00080000",
  "000C0000",
  OTRO,
] as const;

/* ───────── Bloque 2: Perfil demográfico ───────── */
export const GENEROS = ["Mujer", "Hombre"] as const;

export const EDADES = ["Joven 18-25", "Adulto Joven 30-40", "Adulto Mayor 45-55", "Adulto Maduro 56-65", "Mayor 66-70"] as const;
const EDAD_EN: Record<(typeof EDADES)[number], string> = {
  "Joven 18-25": "aged 18 to 25",
  "Adulto Joven 30-40": "aged 30 to 40",
  "Adulto Mayor 45-55": "aged 45 to 55",
  "Adulto Maduro 56-65": "aged 56 to 65",
  "Mayor 66-70": "aged 66 to 70",
};

export const ETNIAS = [
  "Colombiana Bogotá/Andino",
  "Colombiana Medellín/Paisa",
  "Colombiana Costa Caribe",
  "Mestiza Clara México",
  "Blanca/Mediterránea Cono Sur",
  "Afro-Latina",
  "Rasgos Nativos/Indígenas",
  "Caucásica/Europea",
  "Afrodescendiente",
  "Asiática del Este",
  "Sudasiática",
  "Medio Oriente/Árabe",
] as const;
// "{n}" se sustituye por "woman" o "man"
const ETNIA_EN: Record<(typeof ETNIAS)[number], string> = {
  "Colombiana Bogotá/Andino": "Colombian {n} from Bogotá with Andean features",
  "Colombiana Medellín/Paisa": "Colombian {n} from Medellín with Paisa features",
  "Colombiana Costa Caribe": "Colombian {n} from the Caribbean coast",
  "Mestiza Clara México": "light-skinned Mexican Mestiza {n}",
  "Blanca/Mediterránea Cono Sur": "white Latin American {n} from the Southern Cone with Mediterranean features",
  "Afro-Latina": "Afro-Latin {n}",
  "Rasgos Nativos/Indígenas": "Latin American {n} with Native/Indigenous features",
  "Caucásica/Europea": "Caucasian {n} of European descent",
  Afrodescendiente: "Black {n} of African descent",
  "Asiática del Este": "East Asian {n}",
  Sudasiática: "South Asian {n}",
  "Medio Oriente/Árabe": "Middle Eastern {n} of Arab descent",
};

/* ───────── Banco de arquetipos físicos (aleatoriedad real) ─────────
   12 perfiles radicalmente distintos entre sí. Al generar, se sortea UNO y se inyecta de forma absoluta en el
   prompt como descripción completa del personaje (género, etnia, edad, cabello y rostro), de modo que cada
   imagen sea físicamente otra persona. Las gafas NO forman parte del arquetipo: las controla el menú de gafas. */
export type Arquetipo = {
  /** Identificador estable */
  id: string;
  genero: (typeof GENEROS)[number];
  etnia: (typeof ETNIAS)[number];
  edad: (typeof EDADES)[number];
  /** Rango exacto de años para el prompt (p. ej. «30 to 40») */
  edadAnios: string;
  cabello: { es: string; en: string };
  rasgosFaciales: { forma: string; ojos: string; cejas: string; nariz: string; boca: string };
  rasgosEs: string;
  /** Cuerpo (medio cuerpo hacia arriba): se usa según el plano */
  cuerpo: { complexion: string; hombros: string; es: string };
};
// FUENTE ÚNICA DE VERDAD (modo «Arquetipo listo»): género, etnia, edad, cabello, rostro y cuerpo salen SIEMPRE del arquetipo activo; la interfaz
// los muestra bloqueados y el prompt los compone desde aquí, así que no puede haber contradicciones.
export const ARQUETIPOS: Record<string, Arquetipo> = {
  "Hombre maduro calvo con barba tupida": {
    id: "hombre-maduro-calvo",
    genero: "Hombre",
    etnia: "Colombiana Bogotá/Andino",
    edad: "Adulto Mayor 45-55",
    edadAnios: "50 to 60",
    cabello: { es: "Calvo con barba tupida y canosa", en: "a completely bald head and a thick, bushy gray-flecked beard" },
    rasgosFaciales: { forma: "a broad square face", ojos: "small deep-set dark eyes", cejas: "heavy dark eyebrows", nariz: "a wide nose", boca: "a full mouth with deep laugh lines" },
    rasgosEs: "Rostro cuadrado, ojos hundidos, cejas gruesas, nariz ancha, boca llena",
    cuerpo: { complexion: "a sturdy build", hombros: "broad shoulders", es: "Complexión robusta, hombros anchos" },
  },
  "Joven asiático de cabello lacio y corte moderno": {
    id: "joven-asiatico",
    genero: "Hombre",
    etnia: "Asiática del Este",
    edad: "Joven 18-25",
    edadAnios: "20 to 25",
    cabello: { es: "Lacio negro, corte moderno con flequillo", en: "straight black hair in a modern textured undercut with a side-swept fringe" },
    rasgosFaciales: { forma: "a slim angular face", ojos: "narrow almond-shaped eyes", cejas: "thin straight eyebrows", nariz: "a small straight nose", boca: "thin lips" },
    rasgosEs: "Rostro angular, ojos rasgados, cejas finas, nariz pequeña, labios finos",
    cuerpo: { complexion: "a slim build", hombros: "narrow shoulders", es: "Complexión delgada, hombros estrechos" },
  },
  "Mujer rubia de rasgos europeos": {
    id: "mujer-rubia-europea",
    genero: "Mujer",
    etnia: "Caucásica/Europea",
    edad: "Adulto Joven 30-40",
    edadAnios: "30 to 40",
    cabello: { es: "Rubio dorado liso hasta los hombros", en: "shoulder-length straight golden-blonde hair" },
    rasgosFaciales: { forma: "an oval face with high cheekbones", ojos: "light blue eyes", cejas: "light softly arched eyebrows", nariz: "a narrow straight nose", boca: "thin pink lips" },
    rasgosEs: "Rostro ovalado, ojos azules, cejas claras, nariz estrecha, labios finos",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Hombre afrodescendiente de cabello corto y rapado a los lados": {
    id: "hombre-afro-fade",
    genero: "Hombre",
    etnia: "Afrodescendiente",
    edad: "Adulto Joven 30-40",
    edadAnios: "30 to 40",
    cabello: { es: "Corto arriba, rapado a los lados (fade)", en: "short dark hair on top with the sides shaved in a sharp fade" },
    rasgosFaciales: { forma: "a strong square jaw", ojos: "deep dark brown eyes", cejas: "thick straight eyebrows", nariz: "a broad nose", boca: "full lips" },
    rasgosEs: "Mandíbula cuadrada, ojos oscuros, cejas gruesas, nariz ancha, labios llenos",
    cuerpo: { complexion: "an athletic build", hombros: "broad shoulders", es: "Complexión atlética, hombros anchos" },
  },
  "Mujer latina de cabello rizado abundante": {
    id: "mujer-latina-rizos",
    genero: "Mujer",
    etnia: "Colombiana Costa Caribe",
    edad: "Joven 18-25",
    edadAnios: "24 to 30",
    cabello: { es: "Rizado oscuro abundante y voluminoso", en: "abundant, voluminous dark curly hair" },
    rasgosFaciales: { forma: "a round face with full cheeks", ojos: "large expressive brown eyes", cejas: "defined arched eyebrows", nariz: "a small rounded nose", boca: "full lips" },
    rasgosEs: "Rostro redondo, ojos grandes marrones, cejas arqueadas, nariz pequeña, labios llenos",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Hombre joven caucásico de rostro redondo": {
    id: "joven-caucasico-redondo",
    genero: "Hombre",
    etnia: "Caucásica/Europea",
    edad: "Joven 18-25",
    edadAnios: "20 to 28",
    cabello: { es: "Castaño rojizo corto y desordenado", en: "short messy red-brown hair" },
    rasgosFaciales: { forma: "a round face with light freckles", ojos: "light green eyes", cejas: "sparse light eyebrows", nariz: "an upturned nose", boca: "thin lips" },
    rasgosEs: "Rostro redondo con pecas, ojos verdes, cejas claras, nariz respingona, labios finos",
    cuerpo: { complexion: "a slim build", hombros: "medium-width shoulders", es: "Complexión delgada, hombros medios" },
  },
  "Mujer madura de cabello canoso recogido": {
    id: "mujer-madura-canosa",
    genero: "Mujer",
    etnia: "Blanca/Mediterránea Cono Sur",
    edad: "Adulto Maduro 56-65",
    edadAnios: "56 to 65",
    cabello: { es: "Canoso plateado recogido en moño bajo", en: "silver-gray hair gathered back in a neat low bun" },
    rasgosFaciales: { forma: "a soft oval face with fine wrinkles", ojos: "gentle hazel eyes", cejas: "thin gray eyebrows", nariz: "a straight nose", boca: "a thin mouth" },
    rasgosEs: "Rostro ovalado con arrugas finas, ojos color avellana, cejas grises, nariz recta, boca fina",
    cuerpo: { complexion: "an average build", hombros: "narrow shoulders", es: "Complexión promedio, hombros estrechos" },
  },
  "Hombre con bigote y cabello castaño ondulado": {
    id: "hombre-bigote-ondulado",
    genero: "Hombre",
    etnia: "Colombiana Medellín/Paisa",
    edad: "Adulto Joven 30-40",
    edadAnios: "30 to 40",
    cabello: { es: "Castaño ondulado peinado hacia atrás y bigote poblado", en: "wavy chestnut-brown hair swept back and a full dark mustache" },
    rasgosFaciales: { forma: "a long face", ojos: "dark brown eyes", cejas: "thick dark eyebrows", nariz: "a prominent nose", boca: "a mouth framed by the mustache" },
    rasgosEs: "Rostro alargado, ojos marrones, cejas gruesas, nariz prominente, bigote poblado",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Mujer sudasiática de cabello largo y lacio": {
    id: "mujer-sudasiatica",
    genero: "Mujer",
    etnia: "Sudasiática",
    edad: "Joven 18-25",
    edadAnios: "20 to 30",
    cabello: { es: "Negro azabache muy largo y lacio", en: "very long straight jet-black hair" },
    rasgosFaciales: { forma: "an oval face with high cheekbones", ojos: "large dark eyes", cejas: "defined arched eyebrows", nariz: "a slim straight nose", boca: "full lips" },
    rasgosEs: "Rostro ovalado, ojos grandes oscuros, cejas definidas, nariz fina, labios llenos",
    cuerpo: { complexion: "a slim build", hombros: "narrow shoulders", es: "Complexión delgada, hombros estrechos" },
  },
  "Mujer afrodescendiente con trenzas": {
    id: "mujer-afro-trenzas",
    genero: "Mujer",
    etnia: "Afrodescendiente",
    edad: "Adulto Joven 30-40",
    edadAnios: "30 to 40",
    cabello: { es: "Trenzas largas (box braids)", en: "long box braids" },
    rasgosFaciales: { forma: "a bright wide face", ojos: "dark almond-shaped eyes", cejas: "thin arched eyebrows", nariz: "a broad nose", boca: "full lips" },
    rasgosEs: "Rostro ancho, ojos almendrados, cejas finas, nariz ancha, labios llenos",
    cuerpo: { complexion: "an athletic build", hombros: "medium-width shoulders", es: "Complexión atlética, hombros medios" },
  },
  "Hombre de Medio Oriente con barba recortada": {
    id: "hombre-medio-oriente",
    genero: "Hombre",
    etnia: "Medio Oriente/Árabe",
    edad: "Adulto Joven 30-40",
    edadAnios: "35 to 45",
    cabello: { es: "Corto oscuro con entradas y barba negra recortada", en: "short dark hair with a receding hairline and a neatly trimmed black beard" },
    rasgosFaciales: { forma: "a long angular face", ojos: "dark deep-set eyes", cejas: "thick dark eyebrows", nariz: "a prominent aquiline nose", boca: "a mouth framed by the beard" },
    rasgosEs: "Rostro angular, ojos hundidos, cejas gruesas, nariz aguileña, barba recortada",
    cuerpo: { complexion: "a sturdy build", hombros: "broad shoulders", es: "Complexión robusta, hombros anchos" },
  },
  "Mujer asiática del Este de cabello corto": {
    id: "mujer-asiatica-bob",
    genero: "Mujer",
    etnia: "Asiática del Este",
    edad: "Adulto Joven 30-40",
    edadAnios: "35 to 45",
    cabello: { es: "Negro corto a la altura de la barbilla (bob)", en: "a short chin-length black bob haircut" },
    rasgosFaciales: { forma: "a soft round face", ojos: "dark almond-shaped eyes", cejas: "soft straight eyebrows", nariz: "a small nose", boca: "a small mouth" },
    rasgosEs: "Rostro redondo, ojos almendrados, cejas rectas, nariz pequeña, boca pequeña",
    cuerpo: { complexion: "a slim build", hombros: "narrow shoulders", es: "Complexión delgada, hombros estrechos" },
  },
  "Hombre mayor de cabello blanco y bigote": {
    id: "hombre-mayor-blanco",
    genero: "Hombre",
    etnia: "Blanca/Mediterránea Cono Sur",
    edad: "Mayor 66-70",
    edadAnios: "65 to 70",
    cabello: { es: "Blanco corto con bigote canoso", en: "short white hair and a neat gray mustache" },
    rasgosFaciales: { forma: "a long face with deep wrinkles", ojos: "pale blue eyes", cejas: "bushy white eyebrows", nariz: "a prominent rounded nose", boca: "thin lips" },
    rasgosEs: "Rostro alargado con arrugas profundas, ojos azul pálido, cejas blancas, nariz redondeada",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Mujer mayor afrodescendiente de cabello corto y canoso": {
    id: "mujer-mayor-afro",
    genero: "Mujer",
    etnia: "Afrodescendiente",
    edad: "Mayor 66-70",
    edadAnios: "62 to 70",
    cabello: { es: "Corto plateado natural (afro corto)", en: "short natural silver-gray afro-textured hair" },
    rasgosFaciales: { forma: "a warm round face with soft wrinkles", ojos: "dark kind eyes", cejas: "thin gray eyebrows", nariz: "a broad nose", boca: "medium-full lips" },
    rasgosEs: "Rostro redondo con arrugas suaves, ojos oscuros, cejas grises, nariz ancha",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Mujer joven caucásica pelirroja": {
    id: "mujer-joven-pelirroja",
    genero: "Mujer",
    etnia: "Caucásica/Europea",
    edad: "Joven 18-25",
    edadAnios: "20 to 26",
    cabello: { es: "Pelirrojo largo y ondulado", en: "long wavy auburn-red hair" },
    rasgosFaciales: { forma: "a heart-shaped face with freckles", ojos: "green eyes", cejas: "light reddish eyebrows", nariz: "a small upturned nose", boca: "full pink lips" },
    rasgosEs: "Rostro en corazón con pecas, ojos verdes, cejas rojizas, nariz respingada",
    cuerpo: { complexion: "a slim build", hombros: "narrow shoulders", es: "Complexión delgada, hombros estrechos" },
  },
  "Hombre joven latino de barba corta y cabello rizado": {
    id: "joven-latino-rizado",
    genero: "Hombre",
    etnia: "Mestiza Clara México",
    edad: "Joven 18-25",
    edadAnios: "22 to 28",
    cabello: { es: "Rizado oscuro corto y barba corta", en: "short dark curly hair and a short trimmed beard" },
    rasgosFaciales: { forma: "an oval face", ojos: "dark brown expressive eyes", cejas: "thick straight eyebrows", nariz: "a straight nose", boca: "medium-full lips" },
    rasgosEs: "Rostro ovalado, ojos marrones, cejas gruesas, nariz recta, barba corta",
    cuerpo: { complexion: "an athletic build", hombros: "broad shoulders", es: "Complexión atlética, hombros anchos" },
  },
  "Hombre asiático maduro de cabello canoso": {
    id: "hombre-asiatico-maduro",
    genero: "Hombre",
    etnia: "Asiática del Este",
    edad: "Adulto Mayor 45-55",
    edadAnios: "50 to 60",
    cabello: { es: "Canoso corto peinado a un lado", en: "short gray hair combed to one side" },
    rasgosFaciales: { forma: "a square face with a defined jaw", ojos: "narrow slightly slanted dark eyes", cejas: "straight dark eyebrows", nariz: "a broad flat nose", boca: "thin lips" },
    rasgosEs: "Rostro cuadrado, ojos rasgados oscuros, cejas rectas, nariz ancha",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Mujer árabe de cabello largo y ondulado": {
    id: "mujer-arabe-ondulado",
    genero: "Mujer",
    etnia: "Medio Oriente/Árabe",
    edad: "Adulto Joven 30-40",
    edadAnios: "28 to 38",
    cabello: { es: "Castaño oscuro largo y ondulado", en: "long wavy dark brown hair" },
    rasgosFaciales: { forma: "an oval face with defined cheekbones", ojos: "large hazel almond-shaped eyes", cejas: "full arched eyebrows", nariz: "a straight elegant nose", boca: "full lips" },
    rasgosEs: "Rostro ovalado, ojos avellana grandes, cejas pobladas arqueadas, nariz recta",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
  "Hombre sudasiático con barba completa": {
    id: "hombre-sudasiatico-barba",
    genero: "Hombre",
    etnia: "Sudasiática",
    edad: "Adulto Joven 30-40",
    edadAnios: "35 to 45",
    cabello: { es: "Negro corto y barba completa", en: "short black hair and a full dark beard" },
    rasgosFaciales: { forma: "a round face", ojos: "dark deep eyes", cejas: "thick dark eyebrows", nariz: "a prominent nose", boca: "a mouth framed by the beard" },
    rasgosEs: "Rostro redondo, ojos oscuros, cejas gruesas, nariz prominente, barba completa",
    cuerpo: { complexion: "a sturdy build", hombros: "broad shoulders", es: "Complexión robusta, hombros anchos" },
  },
  "Mujer indígena latinoamericana de trenza larga": {
    id: "mujer-indigena-trenza",
    genero: "Mujer",
    etnia: "Rasgos Nativos/Indígenas",
    edad: "Adulto Joven 30-40",
    edadAnios: "30 to 40",
    cabello: { es: "Negro muy largo en una trenza", en: "very long black hair in a single thick braid" },
    rasgosFaciales: { forma: "a broad round face with high cheekbones", ojos: "dark almond-shaped eyes", cejas: "straight dark eyebrows", nariz: "a small broad nose", boca: "medium-full lips" },
    rasgosEs: "Rostro redondo con pómulos altos, ojos almendrados oscuros, nariz pequeña ancha",
    cuerpo: { complexion: "an average build", hombros: "medium-width shoulders", es: "Complexión promedio, hombros medios" },
  },
};
export const ARQUETIPOS_LISTA = Object.keys(ARQUETIPOS);
export const ARQUETIPO_ALEATORIO = "🎲 Aleatorio (arquetipo)";
export const ARQUETIPO_NINGUNO = "Ninguno (usar selectores manuales)";
export const ARQUETIPO_OPCIONES = [ARQUETIPO_ALEATORIO, ...ARQUETIPOS_LISTA];

/** Arquetipo concreto: el elegido (o «Ninguno») o, si es «Aleatorio», el que corresponde a `u` en [0,1). */
export function resolverArquetipo(seleccion: string, u: number = Math.random()): string {
  if (seleccion !== ARQUETIPO_ALEATORIO) return seleccion;
  return ARQUETIPOS_LISTA[Math.min(ARQUETIPOS_LISTA.length - 1, Math.floor(u * ARQUETIPOS_LISTA.length))];
}
/** Número de sorteo cuyo arquetipo es DISTINTO del anterior (evita repetir la misma persona dos veces seguidas). */
export function sorteoArquetipoDistinto(uPrevio: number): number {
  const n = ARQUETIPOS_LISTA.length;
  const previo = Math.min(n - 1, Math.floor(uPrevio * n));
  const nuevo = (previo + 1 + Math.floor(Math.random() * (n - 1))) % n;
  return (nuevo + 0.5) / n;
}

export const IDENTIDAD_ES =
  "VARIACIÓN DE IDENTIDAD OBLIGATORIA: Está prohibido repetir el mismo tipo de rostro o a la misma persona. Los rasgos descritos (género, etnia, edad, cabello, barba o sin ella, gorra o sin ella, y estructura facial) definen a una persona totalmente distinta de cualquier otra imagen: cada imagen debe parecer una persona totalmente diferente, con una estructura facial propia.";

/* ───────── Bloque 3: Controlador Maestro ─────────
   El usuario solo elige la profesión; el resto se autocompleta y se bloquea. */
export type Profesion = string;

export type Perfil = {
  // Valores visibles (solo lectura) en la interfaz
  vestimenta: string;
  emocion: string;
  manos: string;
  manos1: string;
  fondo: string;
  // Redacción en inglés usada por la función de concatenación
  en: {
    role: string;
    clothing: { f: string; m: string };
    emotion: string;
    hands: string;
    hands1: string;
    scene: string;
    props: string;
  };
};

/* ───────── Emociones y manos de alta conversión (urgencia técnica) ─────────
   Solo estas 4 categorías: nada de tristeza, resignación pasiva ni posturas relajadas. */
const EMOCION = {
  panico: {
    es: "Pánico / Desesperación",
    en: "an expression of panic and desperation, eyes wide open in terror at the technical error, extreme tension across the face, mouth open in alarm",
  },
  frustracion: {
    es: "Frustración Extrema",
    en: "an expression of extreme frustration, brows fiercely furrowed, teeth clenched, technical rage",
  },
  agotamiento: {
    es: "Agotamiento Mental / Colapso",
    en: "an expression of extreme mental stress and collapse, face tense and drawn from a pounding headache",
  },
  shock: {
    es: "Shock / Incredulidad",
    en: "an expression of total disbelief and shock, eyes bulging as they stare at the problem, jaw dropped",
  },
} as const;

// es/en: gesto con las dos manos · es1/en1: variante de UNA mano (la otra mano sostiene un accesorio)
const MANOS = {
  cabeza: { es: "Agarrando la cabeza", en: "both hands gripping the head", es1: "Una mano agarrando la cabeza", en1: "one hand gripping the head" },
  cabello: { es: "Jalando el cabello con desesperación", en: "both hands pulling at the hair in desperation", es1: "Una mano jalando el cabello con desesperación", en1: "one hand pulling at the hair in desperation" },
  boca: { es: "Tapándose la boca con pánico", en: "a hand covering the mouth in panic", es1: "Tapándose la boca con pánico", en1: "a hand covering the mouth in panic" },
  puños: { es: "Apretando los puños cerca del rostro", en: "both fists clenched tightly near the face", es1: "Apretando un puño cerca del rostro", en1: "one fist clenched tightly near the face" },
  cara: { es: "Frotándose la cara con fuerza", en: "one hand rubbing the face hard", es1: "Frotándose la cara con fuerza", en1: "one hand rubbing the face hard" },
  sienes: { es: "Frotándose las sienes", en: "fingertips rubbing both temples with great tension", es1: "Frotándose una sien", en1: "fingertips of one hand rubbing the temple with great tension" },
  nariz: { es: "Frotándose el puente de la nariz", en: "pinching and rubbing the bridge of the nose with great tension", es1: "Frotándose el puente de la nariz", en1: "one hand pinching and rubbing the bridge of the nose with great tension" },
  mejillas: {
    es: "Palmas en las mejillas jalando la piel hacia abajo",
    en: "both palms pressed on the cheeks, pulling the skin downward",
    es1: "Una palma en la mejilla jalando la piel hacia abajo",
    en1: "one palm pressed on the cheek, pulling the skin downward",
  },
  rostro: { es: "Cubriendo el rostro en shock", en: "both hands covering the lower half of the face in shock", es1: "Una mano cubriendo el rostro en shock", en1: "one hand covering part of the face in shock" },
} as const;

export const PERFILES: Record<Profesion, Perfil> = {
  "Asistente Corporativa": {
    vestimenta: "Blusa formal y gafas marco negro",
    emocion: EMOCION.panico.es,
    manos: MANOS.cabeza.es,
    manos1: MANOS.cabeza.es1,
    fondo: "Oficina moderna desenfocada con luz azulada",
    en: {
      role: "corporate assistant",
      clothing: {
        f: "a formal blouse and black-framed glasses",
        m: "a formal dress shirt and black-framed glasses",
      },
      emotion: EMOCION.panico.en,
      hands: MANOS.cabeza.en,
      hands1: MANOS.cabeza.en1,
      scene: "a modern office with a softly blurred background and cool bluish lighting",
      props: "office desks with stacked documents, a filing cabinet and shelves of binders",
    },
  },
  Teletrabajadora: {
    vestimenta: "Suéter ligero y gafas de descanso",
    emocion: EMOCION.agotamiento.es,
    manos: MANOS.sienes.es,
    manos1: MANOS.sienes.es1,
    fondo: "Escritorio de técnico con luces LED",
    en: {
      role: "remote worker",
      clothing: {
        f: "a light sweater and relaxing eyeglasses",
        m: "a light sweater and relaxing eyeglasses",
      },
      emotion: EMOCION.agotamiento.en,
      hands: MANOS.sienes.en,
      hands1: MANOS.sienes.en1,
      scene: "a technician's desk with glowing LED lights",
      props: "a home-office desk with a desk lamp, notebooks, a coffee mug and shelves of books",
    },
  },
  Recepcionista: {
    vestimenta: "Camisa tipo polo lisa",
    emocion: EMOCION.panico.es,
    manos: MANOS.boca.es,
    manos1: MANOS.boca.es1,
    fondo: "Taller técnico moderno con iluminación gamer",
    en: {
      role: "receptionist",
      clothing: {
        f: "a plain solid-color polo shirt",
        m: "a plain solid-color polo shirt",
      },
      emotion: EMOCION.panico.en,
      hands: MANOS.boca.en,
      hands1: MANOS.boca.en1,
      scene: "a modern technical workshop with gamer-style RGB lighting",
      props: "a reception counter with a service bell, brochure stands and a small waiting area",
    },
  },
  Coordinadora: {
    vestimenta: "Blusa Oxford arremangada",
    emocion: EMOCION.shock.es,
    manos: MANOS.mejillas.es,
    manos1: MANOS.mejillas.es1,
    fondo: "Sala de control con luz ambiental azul",
    en: {
      role: "coordinator",
      clothing: {
        f: "an Oxford blouse with rolled-up sleeves",
        m: "an Oxford shirt with rolled-up sleeves",
      },
      emotion: EMOCION.shock.en,
      hands: MANOS.mejillas.en,
      hands1: MANOS.mejillas.en1,
      scene: "a control room with cool blue ambient lighting",
      props: "whiteboards with wall planners, project folders and meeting-room shelves",
    },
  },
  "Diseñador(a) Gráfico": {
    vestimenta: "Ropa casual creativa y gorra",
    emocion: EMOCION.frustracion.es,
    manos: MANOS.puños.es,
    manos1: MANOS.puños.es1,
    fondo: "Estudio creativo con luces RGB moradas",
    en: {
      role: "graphic designer",
      clothing: { f: "creative casual clothing and a cap", m: "creative casual clothing and a cap" },
      emotion: EMOCION.frustracion.en,
      hands: MANOS.puños.en,
      hands1: MANOS.puños.en1,
      scene: "a creative studio with purple RGB lights",
      props: "a drawing tablet on a desk, color swatch books, pinned posters and printed design samples",
    },
  },
  "Sublimación": {
    vestimenta: "Delantal de taller y camiseta básica",
    emocion: EMOCION.panico.es,
    manos: MANOS.cabello.es,
    manos1: MANOS.cabello.es1,
    fondo: "Taller moderno con planchas térmicas y neón amarillo",
    en: {
      role: "sublimation printing worker",
      clothing: { f: "a workshop apron over a basic t-shirt", m: "a workshop apron over a basic t-shirt" },
      emotion: EMOCION.panico.en,
      hands: MANOS.cabello.en,
      hands1: MANOS.cabello.en1,
      scene: "a modern workshop with heat presses and yellow neon lighting",
      props: "heat presses, rolls of transfer paper, and blank mugs and shirts on shelves",
    },
  },
  "Fotografía": {
    vestimenta: "Chaleco multibolsillos oscuro",
    emocion: EMOCION.panico.es,
    manos: MANOS.cabello.es,
    manos1: MANOS.cabello.es1,
    fondo: "Estudio fotográfico con aros de luz y paneles LED azules",
    en: {
      role: "photographer",
      clothing: { f: "a dark multi-pocket vest", m: "a dark multi-pocket vest" },
      emotion: EMOCION.panico.en,
      hands: MANOS.cabello.en,
      hands1: MANOS.cabello.en1,
      scene: "a photo studio with ring lights and blue LED panels",
      props: "softbox light stands, backdrop rolls, framed photo prints and camera bags",
    },
  },
  "Fotocopias": {
    vestimenta: "Camisa tipo polo y delantal corto",
    emocion: EMOCION.agotamiento.es,
    manos: MANOS.nariz.es,
    manos1: MANOS.nariz.es1,
    fondo: "Centro de copiado tecnológico con letreros luminosos",
    en: {
      role: "photocopy shop attendant",
      clothing: { f: "a polo shirt and a short apron", m: "a polo shirt and a short apron" },
      emotion: EMOCION.agotamiento.en,
      hands: MANOS.nariz.en,
      hands1: MANOS.nariz.en1,
      scene: "a high-tech copy center with illuminated signs",
      props: "a service counter, reams of paper stacked on shelves and notice boards",
    },
  },
  "Impresión en vinilo": {
    vestimenta: "Ropa industrial de trabajo",
    emocion: EMOCION.frustracion.es,
    manos: MANOS.puños.es,
    manos1: MANOS.puños.es1,
    fondo: "Taller de gran formato con luces cian y magenta",
    en: {
      role: "vinyl printing operator",
      clothing: { f: "industrial work clothing", m: "industrial work clothing" },
      emotion: EMOCION.frustracion.en,
      hands: MANOS.puños.en,
      hands1: MANOS.puños.en1,
      scene: "a large-format print shop with cyan and magenta lights",
      props: "large rolls of vinyl, sample banners and stickers, and a cutting table",
    },
  },
  "Profesor(a) Primaria": {
    vestimenta: "Cárdigan de colores vivos y gafas",
    emocion: EMOCION.panico.es,
    manos: MANOS.cabeza.es,
    manos1: MANOS.cabeza.es1,
    fondo: "Aula inteligente con pizarra digital brillante",
    en: {
      role: "primary school teacher",
      clothing: { f: "a brightly colored cardigan and glasses", m: "a brightly colored cardigan and glasses" },
      emotion: EMOCION.panico.en,
      hands: MANOS.cabeza.en,
      hands1: MANOS.cabeza.en1,
      scene: "a smart classroom with a bright digital whiteboard",
      props: "children's drawings on the walls, colorful classroom posters, shelves of books and a desk of student papers",
    },
  },
  "Profesor(a) Bachillerato": {
    vestimenta: "Blazer casual sin corbata",
    emocion: EMOCION.agotamiento.es,
    manos: MANOS.nariz.es,
    manos1: MANOS.nariz.es1,
    fondo: "Sala de profesores moderna con luz azulada",
    en: {
      role: "high school teacher",
      clothing: { f: "a casual blazer without a tie", m: "a casual blazer without a tie" },
      emotion: EMOCION.agotamiento.en,
      hands: MANOS.nariz.en,
      hands1: MANOS.nariz.en1,
      scene: "a modern teachers' lounge with bluish light",
      props: "bookshelves, a teacher's desk with stacks of graded exams and wall charts",
    },
  },
  "Técnico de Impresoras": {
    vestimenta: "Camisa de trabajo técnica lisa",
    emocion: EMOCION.shock.es,
    manos: MANOS.rostro.es,
    manos1: MANOS.rostro.es1,
    fondo: "Escritorio de técnico con luces LED",
    en: {
      role: "office-equipment technician",
      clothing: { f: "a plain solid-color technical work shirt", m: "a plain solid-color technical work shirt" },
      emotion: EMOCION.shock.en,
      hands: MANOS.rostro.en,
      hands1: MANOS.rostro.en1,
      scene: "a technician's desk with glowing LED lights",
      props: "a repair workbench with small tools, boxes of spare parts and ink bottles on shelves",
    },
  },
  "Técnico de computadores": {
    vestimenta: "Hoodie oscuro y audífonos",
    emocion: EMOCION.agotamiento.es,
    manos: MANOS.sienes.es,
    manos1: MANOS.sienes.es1,
    fondo: "Estudio gamer con luces RGB o espacio digital oscuro",
    en: {
      role: "computer technician",
      clothing: { f: "a dark hoodie and headphones", m: "a dark hoodie and headphones" },
      emotion: EMOCION.agotamiento.en,
      hands: MANOS.sienes.en,
      hands1: MANOS.sienes.en1,
      scene: "a gamer studio with RGB lights against a dark digital space",
      props: "open computer cases on a workbench, boxes of spare components and labeled storage shelves",
    },
  },
  "Ingeniero de sistemas": {
    vestimenta: "Camisa abotonada pulcra",
    emocion: EMOCION.shock.es,
    manos: MANOS.mejillas.es,
    manos1: MANOS.mejillas.es1,
    fondo: "Centro de servidores con luces de neón",
    en: {
      role: "systems engineer",
      clothing: { f: "a neat buttoned shirt", m: "a neat buttoned shirt" },
      emotion: EMOCION.shock.en,
      hands: MANOS.mejillas.en,
      hands1: MANOS.mejillas.en1,
      scene: "a server center with neon lights",
      props: "server racks, equipment cabinets and labeled storage shelves",
    },
  },
  "Administrador de Empresa": {
    vestimenta: "Traje formal elegante",
    emocion: EMOCION.frustracion.es,
    manos: MANOS.cara.es,
    manos1: MANOS.cara.es1,
    fondo: "Oficina ejecutiva de cristal con ciudad cyberpunk de fondo",
    en: {
      role: "business administrator",
      clothing: { f: "an elegant formal suit", m: "an elegant formal suit" },
      emotion: EMOCION.frustracion.en,
      hands: MANOS.cara.en,
      hands1: MANOS.cara.en1,
      scene: "a glass executive office with a cyberpunk city in the background",
      props: "shelves of business binders, framed certificates and a tidy executive desk",
    },
  },
  "Litografía": {
    vestimenta: "Overol industrial",
    emocion: EMOCION.frustracion.es,
    manos: MANOS.cara.es,
    manos1: MANOS.cara.es1,
    fondo: "Sala de producción gráfica con iluminación industrial y destellos",
    en: {
      role: "lithography operator",
      clothing: { f: "an industrial coverall", m: "an industrial coverall" },
      emotion: EMOCION.frustracion.en,
      hands: MANOS.cara.en,
      hands1: MANOS.cara.en1,
      scene: "a graphic production hall with industrial lighting and flashes of light",
      props: "large offset press machines, pallets of paper and drums of ink",
    },
  },
};

export const PROFESIONES = Object.keys(PERFILES) as Profesion[];

/* ───────── Bloque 4: Marketing 3D ───────── */
export const MARCOS = [
  { es: "Marco de neón fino rojo y azul", en: "a thin red and blue neon border" },
  { es: "Marco de neón amarillo brillante con resplandor", en: "a bright yellow neon border with a soft glow" },
  { es: "Marco de doble línea cian y magenta", en: "a double-line cyan and magenta border" },
  { es: "Marco metálico cromado con reflejos", en: "a polished chrome metallic border with reflections" },
  { es: "Marco de circuito electrónico luminoso", en: "a glowing electronic-circuit border" },
  { es: "Marco de fuego y chispas naranjas", en: "a border of fire and orange sparks" },
  { es: "Marco glitch digital con destellos RGB", en: "a digital glitch border with RGB flashes" },
  { es: "Marco holográfico con bordes translúcidos", en: "a holographic border with translucent edges" },
  { es: "Marco de rayos eléctricos azules", en: "a border of blue electric lightning" },
  { es: "Marco grueso rojo con borde blanco y sombra 3D", en: "a thick red border with a white edge and a 3D drop shadow" },
] as const;

export const IDIOMAS = ["Español", "Inglés", "Portugués", "Francés"] as const;
export type Idioma = (typeof IDIOMAS)[number];

// Badges 3D: la etiqueta del desplegable lleva su emoji; al prompt viaja el texto traducido al idioma
// elegido más el emoji y el nombre del icono (contexto visual para la IA).
const BADGE_DATA: Record<string, { emoji: string; icon: string; textos: Record<Idioma, string> }> = {
  "Reset en 1 Minuto ⏱️": {
    emoji: "⏱️",
    icon: "stopwatch",
    textos: { Español: "Reset en 1 Minuto", Inglés: "Reset in 1 Minute", Portugués: "Reset em 1 Minuto", Francés: "Réinitialisation en 1 Minute" },
  },
  "Desbloqueo Inmediato 🔓": {
    emoji: "🔓",
    icon: "unlocked padlock",
    textos: { Español: "Desbloqueo Inmediato", Inglés: "Instant Unlock", Portugués: "Desbloqueio Imediato", Francés: "Déblocage Immédiat" },
  },
  "Ultra Rápido 🚀": {
    emoji: "🚀",
    icon: "rocket",
    textos: { Español: "Ultra Rápido", Inglés: "Ultra Fast", Portugués: "Ultra Rápido", Francés: "Ultra Rapide" },
  },
  "100% Seguro 🛡️": {
    emoji: "🛡️",
    icon: "shield",
    textos: { Español: "100% Seguro", Inglés: "100% Safe", Portugués: "100% Seguro", Francés: "100% Sécurisé" },
  },
  "Cero Virus 🦠": {
    emoji: "🦠",
    icon: "virus microbe",
    textos: { Español: "Cero Virus", Inglés: "Zero Viruses", Portugués: "Zero Vírus", Francés: "Zéro Virus" },
  },
  "Solo Compartes USB 🔌": {
    emoji: "🔌",
    icon: "USB plug",
    textos: { Español: "Solo Compartes USB", Inglés: "You Only Share USB", Portugués: "Você Só Compartilha o USB", Francés: "Vous Partagez Seulement l'USB" },
  },
  "Cero Instalaciones 📦": {
    emoji: "📦",
    icon: "package box",
    textos: { Español: "Cero Instalaciones", Inglés: "Zero Installations", Portugués: "Zero Instalações", Francés: "Zéro Installation" },
  },
  "Sin AnyDesk 🚫": {
    emoji: "🚫",
    icon: "prohibited sign",
    textos: { Español: "Sin AnyDesk", Inglés: "No AnyDesk", Portugués: "Sem AnyDesk", Francés: "Sans AnyDesk" },
  },
  "Sin Desarmar 🛠️": {
    emoji: "🛠️",
    icon: "hammer and wrench tools",
    textos: { Español: "Sin Desarmar", Inglés: "No Disassembly", Portugués: "Sem Desmontar", Francés: "Sans Démontage" },
  },
  "Sin desactivar antivirus 🔒": {
    emoji: "🔒",
    icon: "padlock",
    textos: { Español: "Sin desactivar antivirus", Inglés: "No Need to Disable Antivirus", Portugués: "Sem desativar o antivírus", Francés: "Sans désactiver l'antivirus" },
  },
};

export const BADGES = [NINGUNO, ...Object.keys(BADGE_DATA)];

// Badges con valor real (todo menos "Ninguno"): el sorteo aleatorio solo elige entre estos
export const BADGES_REALES = BADGES.filter((b) => b !== NINGUNO);

// Opción dinámica: el sistema elige un badge de alto impacto; NUNCA "Ninguno" ni un valor vacío
export const BADGE_ALEATORIO = "🎲 Aleatorio";
export const BADGES_OPCIONES = [...BADGES, BADGE_ALEATORIO];

/** Devuelve un badge concreto: el elegido o, si es "Aleatorio", uno con valor real (jamás "Ninguno"). */
export function resolverBadge(seleccion: string, rnd: () => number = Math.random): string {
  return seleccion === BADGE_ALEATORIO ? BADGES_REALES[Math.floor(rnd() * BADGES_REALES.length)] : seleccion;
}

/* ───────── Paletas de color de los textos 3D (contraste y psicología del color) ─────────
   Texto principal = "RESET" · secundario = código de error · terciario = marca y modelo. */
export const PALETAS: Record<string, { es: string; en: [string, string, string] }> = {
  "Alerta Clásica (Amarillo / Rojo)": {
    es: "Texto principal en Amarillo intenso, texto secundario en Rojo peligro, texto terciario en Blanco puro.",
    en: ["intense yellow", "danger red", "pure white"],
  },
  "Emergencia Financiera (Naranja Neón / Blanco)": {
    es: "Texto principal en Naranja neón vibrante, texto secundario en Blanco brillante, texto terciario en Gris plata.",
    en: ["vibrant neon orange", "bright white", "silver gray"],
  },
  "Autoridad Tecnológica (Cian / Amarillo)": {
    es: "Texto principal en Azul cian brillante, texto secundario en Amarillo oro, texto terciario en Blanco.",
    en: ["bright cyan blue", "gold yellow", "white"],
  },
  "Alerta Crítica del Sistema (Verde Fósforo / Púrpura)": {
    es: "Texto principal en Verde fluorescente de fósforo, texto secundario en Blanco, texto terciario en Morado oscuro.",
    en: ["fluorescent phosphor green", "white", "dark purple"],
  },
  "Urgencia Absoluta (Rojo Fuego / Amarillo)": {
    es: "Texto principal en Rojo carmesí brillante, texto secundario en Amarillo brillante, texto terciario en Blanco.",
    en: ["bright crimson red", "bright yellow", "white"],
  },
  "Contraste Corporativo (Azul Eléctrico / Naranja)": {
    es: "Texto principal en Azul eléctrico, texto secundario en Naranja intenso, texto terciario en Blanco puro.",
    en: ["electric blue", "intense orange", "pure white"],
  },
  "Modo Notificación (Blanco / Amarillo Neón)": {
    es: "Texto principal en Blanco puro, texto secundario en Amarillo neón, texto terciario en Gris claro.",
    en: ["pure white", "neon yellow", "light gray"],
  },
  "Alta Tensión Oscura (Magenta / Turquesa)": {
    es: "Texto principal en Magenta neón, texto secundario en Turquesa brillante, texto terciario en Blanco.",
    en: ["neon magenta", "bright turquoise", "white"],
  },
  "Advertencia de Sistema (Ámbar / Negro Metálico)": {
    es: "Texto principal en Ámbar brillante, texto secundario en Blanco hielo, texto terciario en Gris metálico.",
    en: ["bright amber", "ice white", "metallic gray"],
  },
  "Peligro Inminente (Rojo Neón / Cian)": {
    es: "Texto principal en Rojo neón, texto secundario en Cian brillante, texto terciario en Blanco.",
    en: ["neon red", "bright cyan", "white"],
  },
};
export const PALETAS_FIJAS = Object.keys(PALETAS);

// Opción dinámica: el sistema elige una de las 10 paletas anteriores
export const PALETA_ALEATORIA = "🎲 Aleatorio (Dinámico)";
export const PALETAS_OPCIONES = [...PALETAS_FIJAS, PALETA_ALEATORIA];

/** Devuelve una paleta concreta: la elegida o, si es "Aleatorio", una de las 10 al azar. */
export function resolverPaleta(seleccion: string, rnd: () => number = Math.random): string {
  return seleccion === PALETA_ALEATORIA ? PALETAS_FIJAS[Math.floor(rnd() * PALETAS_FIJAS.length)] : seleccion;
}

/* ───────── Gafas del personaje (inspiradas en las monturas gruesas de vidIQ) ─────────
   Clave = opción del desplegable; valor = frase que se inyecta tras la descripción física ("" = nada). */
export const GAFAS: Record<string, string> = {
  Ninguna: "",
  "Azules vidIQ": "Lleva puestas unas gafas de pasta muy gruesa de color azul brillante y llamativo.",
  "Rojas vibrantes": "Lleva puestas unas gafas de pasta gruesa de color rojo neón vibrante.",
  "Amarillas llamativas": "Lleva puestas unas gafas de pasta gruesa de color amarillo intenso.",
  "Verde Gamer": "Lleva puestas unas gafas de pasta gruesa de color verde fluorescente.",
  "Retro Gruesas": "Lleva puestas unas gafas grandes de estilo retro con montura negra muy gruesa.",
};
// Estilos de montura gruesa llamativa (todo menos "Ninguna")
export const GAFAS_ESTILOS = Object.keys(GAFAS).filter((k) => GAFAS[k] !== "");

// Opción dinámica: sortea entre los 5 estilos de montura gruesa Y también "Ninguna" (a veces sin gafas)
export const GAFAS_ALEATORIAS = "🎲 Aleatorio";
export const GAFAS_OPCIONES = [...Object.keys(GAFAS), GAFAS_ALEATORIAS];
export const GAFAS_SORTEO = Object.keys(GAFAS); // 5 estilos + "Ninguna" (probabilidad uniforme)

/** Devuelve unas gafas concretas: las elegidas o, si es "Aleatorio", una al azar de GAFAS_SORTEO (incluye "Ninguna"). */
export function resolverGafas(seleccion: string, rnd: () => number = Math.random): string {
  return seleccion === GAFAS_ALEATORIAS ? GAFAS_SORTEO[Math.floor(rnd() * GAFAS_SORTEO.length)] : seleccion;
}

/* ───────── Planos de cámara ───────── */
export const PLANOS = [
  {
    es: "Plano Detalle (Extreme Close-Up)",
    en: "Extreme close-up (detail shot) framing: a very tight composition that shows fine details at close range, such as real skin pores, fabric textures and the tension in the face, with the person\'s face filling the right side of the frame.",
  },
  {
    es: "Plano Medio (Medium Shot)",
    en: "Medium shot framing: the person is shown from the waist or chest up so their body language is clearly visible, as if sitting across the table in a direct conversation, with the camera lens at eye level.",
  },
  {
    es: "Primer Plano (Close-Up)",
    en: "Close-up framing: the person is cropped from the shoulders up, isolating the face to convey empathy and sincerity and shortening the emotional distance with the viewer, with the rest of the frame left for the 3D text and the empty bottom-left corner, and the camera lens at eye level.",
  },
  {
    es: "Ángulo a la altura de los ojos (Eye Level Shot)",
    en: "Eye-level shot: the camera lens is placed directly at the person's eye height with natural framing from the chest up, imitating how we connect with people in real life and creating a neutral, equal relationship with the viewer.",
  },
] as const;

/* ───────── Función de concatenación ───────── */
export type PromptInput = {
  /** Catálogo personalizado de perfiles (editor maestro). Si falta, se usan los perfiles por defecto. */
  catalogo?: Record<string, Perfil>;
  marca: string;
  modelo: string;
  error: string;
  genero: (typeof GENEROS)[number];
  edad: (typeof EDADES)[number];
  etnia: (typeof ETNIAS)[number];
  profesion: Profesion;
  marco: string;
  plano: string;
  idioma: Idioma;
  badge: string;
  gafas: string;
  accesorio: string;
  paleta: string;
  /** Personalización concreta (modo «Personalizar»): rostro, cabello, vello y cuerpo ya sorteados/elegidos. */
  personaje?: Concreto;
  /** Listas editables del personaje (si falta, se usan las de fábrica). */
  listas?: Listas;
  /** Arquetipo físico concreto (clave de ARQUETIPOS) o «Ninguno»: si existe, define por completo la apariencia. */
  arquetipo: string;
};

const ASPECT_SENTENCE =
  "Genera una imagen en formato panorámico 16:9, ideal para una miniatura de YouTube.";

/** Marca + modelo sin repetir la marca si ya venía escrita en el modelo. */
export function printerFullName(marca: string, modelo: string) {
  const m = modelo.trim();
  return m.toLowerCase().startsWith(marca.toLowerCase()) ? m : `${marca} ${m}`.trim();
}

/* ───────── Área de montaje libre (espacio negativo) ─────────
   Sustituye al recuadro 380x170: un recuadro sólido interfiere con el fotomontaje posterior. La esquina
   inferior izquierda debe quedar como un hueco visual limpio (mesa vacía, fondo desenfocado o pared lisa). */
export const PROHIBICION_IMPRESORAS =
  "PROHIBIDO generar impresoras en primer plano o en la esquina inferior izquierda: las impresoras solo pueden verse al fondo, desenfocadas, y NUNCA dentro del área de montaje libre.";

export const AREA_MONTAJE_ES =
  "ÁREA DE MONTAJE LIBRE: La esquina inferior izquierda de la imagen debe ser puro ESPACIO NEGATIVO (por ejemplo, una mesa vacía, un fondo desenfocado o pared lisa). Está ESTRICTAMENTE PROHIBIDO generar pantallas, recuadros sólidos, marcos, bordes geométricos o cualquier objeto en esa zona (la ÚNICA excepción es la marca de agua tipográfica sutil descrita en la regla de marca de agua). Debe quedar como un hueco visual limpio para facilitar la superposición de una imagen en postproducción.";

/* ───────── Marca de agua de seguridad corporativa (anti-robo) ─────────
   Texto tipográfico muy sutil dentro del área de montaje (esquina inferior izquierda): protege la autoría de la
   imagen base. Es la única excepción al espacio negativo, a la regla de "sin otro texto" y a "sin marcas de agua". */
export const MARCA_AGUA_TEXTO = "ResetEnLinea.com";
export const MARCA_AGUA_ES =
  `MARCA DE AGUA DE SEGURIDAD (PROTECCIÓN ANTI-ROBO): Incluye una pequeña marca de agua tipográfica muy sutil, semitransparente y elegante con el texto "${MARCA_AGUA_TEXTO}", colocada obligatoriamente dentro de la esquina inferior izquierda (exactamente en el área de espacio negativo reservada para el montaje), ligeramente separada del borde. Debe ser discreta, de baja opacidad, sin recuadro ni fondo, sin logotipo ni ícono, y sin tapar ningún otro elemento; el resto del área permanece vacía.`;

/* ───────── Accesorios en las manos (alta conversión) ─────────
   Un accesorio contextual refuerza la narrativa técnica. Los dos primeros ocupan UNA mano (la otra conserva el
   gesto de estrés, en su variante de una mano); el tercero deja ambas manos en el gesto del perfil. */
export const ACCESORIOS: Record<string, { es: string; corto: string; unaMano: boolean }> = {
  "Cable USB negro": {
    es: "Sosteniendo un cable USB negro en una mano, mostrando frustración.",
    corto: "cable USB negro",
    unaMano: true,
  },
  "Teléfono celular": {
    es: "Sosteniendo un teléfono celular moderno en la mano con la pantalla encendida.",
    corto: "teléfono celular",
    unaMano: true,
  },
  "Manos a la cabeza (sin objeto)": {
    es: "Manos a la cabeza por el estrés (sin objeto adicional).",
    corto: "sin objeto adicional",
    unaMano: false,
  },
};
export const ACCESORIOS_FIJOS = Object.keys(ACCESORIOS);

// Opción dinámica: el sistema asigna uno de los 3 según el perfil
export const ACCESORIO_ALEATORIO = "🎲 Aleatorio (según perfil)";
export const ACCESORIOS_OPCIONES = [ACCESORIO_ALEATORIO, ...ACCESORIOS_FIJOS];

// Probabilidades [cable USB, teléfono, sin objeto] según el perfil: los perfiles técnicos tienden al cable;
// el resto, al teléfono o a las manos solas. (Ajustables.)
const PERFILES_TECNICOS = new Set(["Técnico de Impresoras", "Técnico de computadores", "Ingeniero de sistemas"]);
const PESOS_TECNICO: [number, number, number] = [0.5, 0.2, 0.3];
const PESOS_GENERAL: [number, number, number] = [0.25, 0.35, 0.4];

/**
 * Devuelve un accesorio concreto: el elegido o, si es "Aleatorio", uno de los 3 sorteado con las
 * probabilidades del perfil. `u` es un número en [0,1) (el sorteo), para poder fijarlo entre renders.
 */
export function resolverAccesorio(seleccion: string, profesion: string, u: number = Math.random()): string {
  if (seleccion !== ACCESORIO_ALEATORIO) return seleccion;
  const pesos = PERFILES_TECNICOS.has(profesion) ? PESOS_TECNICO : PESOS_GENERAL;
  let acumulado = 0;
  for (let k = 0; k < ACCESORIOS_FIJOS.length; k++) {
    acumulado += pesos[k];
    if (u < acumulado) return ACCESORIOS_FIJOS[k];
  }
  return ACCESORIOS_FIJOS[ACCESORIOS_FIJOS.length - 1];
}

/* ───────── Mirada: regla global (todas las profesiones) ───────── */
export const MIRADA_ES =
  "Ojos desorbitados y fijos hacia el vacío inferior izquierdo, un poco por encima de la esquina; nunca abajo, en la mano ni en la cámara";
const MIRADA_REGLA =
  "MIRADA FIJA Y ALTA HACIA LA IZQUIERDA (DIRECCIÓN ELEVADA HACIA EL ESPACIO DE ERROR): Los ojos del personaje deben estar abiertos, desorbitados por el pánico, y orientados obligatoriamente hacia el sector medio-izquierdo de la imagen, un poco por encima de la esquina inferior izquierda, en el borde alto del espacio vacío reservado para el error, con la cabeza girada hacia ese sector. Los ojos tienen prohibido mirar el celular, el cable, la mano, hacia abajo o a la cámara; la línea visual debe conectar el rostro estresado con el espacio vacío del error.";

/* ───────── Cerebro de Postura (máquina de estados, anatomía exacta de 2 manos) ─────────
   Lógica MUTUAMENTE EXCLUYENTE: el accesorio fija la postura de AMBAS manos; nunca se combinan dos acciones.
     · celular → UNA mano sostiene el teléfono (parte baja de la toma) · la OTRA, en la mesa o gesticulando a un lado
     · cable   → UNA mano sostiene el cable frente a la cámara · la OTRA, descansa o gesticula a un lado
     · cabeza  → las DOS manos van a los lados de la cabeza; el accesorio se fuerza a «ninguno»
   Los gestos por profesión ya no se usan en el prompt: la postura la decide solo este cerebro. */
export type EstadoPostura = "celular" | "cable" | "cabeza";
export type Postura = {
  estado: EstadoPostura;
  /** Accesorio efectivo (siempre válido; en «cabeza» se fuerza a «Manos a la cabeza (sin objeto)») */
  accesorio: string;
  manosEs: string;
  manosEn: string;
  /** Frases del prompt (en español) que describen la postura, sin ambigüedad */
  reglas: string[];
  /** Lo mismo en inglés, para el prompt que se envía a la API de imágenes */
  reglasEn: string[];
};

export const POSTURA_ALEATORIA = "🎲 Aleatorio (según perfil)";
export const POSTURA_CABEZA = "Manos a la cabeza";
export const POSTURA_ACCESORIO = "Con accesorio en una mano";
export const POSTURA_OPCIONES = [POSTURA_ALEATORIA, POSTURA_CABEZA, POSTURA_ACCESORIO];
export const ACCESORIO_NINGUNO = "Ninguno";
export const ACCESORIOS_MANO = ["Cable USB negro", "Teléfono celular"];
/** Postura que corresponde al valor del campo accesorio (el campo accesorio es la única fuente de estado). */
export const posturaDe = (accesorio: string) =>
  accesorio === ACCESORIO_ALEATORIO ? POSTURA_ALEATORIA : ACCESORIOS_MANO.includes(accesorio) ? POSTURA_ACCESORIO : POSTURA_CABEZA;

export function cerebroPostura(accesorio: string): Postura {
  if (accesorio === "Teléfono celular") {
    return {
      estado: "celular",
      accesorio,
      manosEs: "Una mano sostiene el celular abajo; la otra, apoyada en la mesa o gesticulando a un lado",
      manosEn:
        "exactly one hand holding a modern smartphone in the lower part of the frame while the other hand rests firmly on the table or gestures in frustration to the side",
      reglasEn: [
        "Exactly one hand holds a modern smartphone with its screen on, low in the frame and passively, while the other hand rests firmly on the table or gestures in frustration to the side. No hand touches the head, nose, eyes or face while the phone is in hand, so the person has exactly two hands.",
      ],
      reglas: [
        ACCESORIOS[accesorio].es,
        "POSTURA CON CELULAR: exactamente UNA mano sostiene el teléfono en la parte baja de la toma, de forma pasiva y secundaria, y la OTRA mano está apoyada firmemente sobre la mesa o gesticulando de frustración a un lado. PROHIBIDO que una mano vaya a la cabeza, a la nariz, a los ojos o cubra el rostro mientras hay un celular en la mano, para que no sobren extremidades.",
      ],
    };
  }
  if (accesorio === "Cable USB negro") {
    return {
      estado: "cable",
      accesorio,
      manosEs: "Una mano sostiene el cable frente a la cámara; la otra, descansa o gesticula a un lado",
      manosEn:
        "exactly one hand holding a black USB cable up in front of the camera while the other hand rests on the table or gestures to the side",
      reglasEn: [
        "Exactly one hand holds a black USB cable up in front of the camera, passively, while the other hand rests on the table or gestures to the side in frustration. No hand touches the head, nose, eyes or face while the cable is in hand, so the person has exactly two hands.",
      ],
      reglas: [
        ACCESORIOS[accesorio].es,
        "POSTURA CON CABLE USB: exactamente UNA mano sostiene el cable frente a la cámara, de forma pasiva y secundaria, y la OTRA mano descansa apoyada o gesticula de frustración a un lado. PROHIBIDO que una mano vaya a la cabeza, a la nariz, a los ojos o cubra el rostro mientras hay un cable en la mano.",
      ],
    };
  }
  // Cualquier otro valor (incluido «Manos a la cabeza») → postura de cabeza con el accesorio forzado a «ninguno»
  return {
    estado: "cabeza",
    accesorio: "Manos a la cabeza (sin objeto)",
    manosEs: "Las dos manos a los lados de la cabeza con desesperación (sin accesorio)",
    manosEn: "both hands placed on the sides of the head in desperation, with no object in either hand",
    reglasEn: [
      "Both hands are placed on the sides of the head in desperation, and there is no object in the frame: no phone, no cable, nothing floating in the lower part of the image.",
    ],
    reglas: [
      ACCESORIOS["Manos a la cabeza (sin objeto)"].es,
      "POSTURA MANOS A LA CABEZA: las DOS manos van exclusivamente a los lados de la cabeza con desesperación. No hay ningún accesorio ni objeto en la toma: ni celular, ni cable, ni nada flotando en la parte baja.",
    ],
  };
}

// Regla de oro de anatomía (siempre presente)
export const ANATOMIA_ES =
  "ANATOMÍA HUMANA IMPECABLE: El cuerpo renderizado debe tener exactamente dos extremidades superiores (dos brazos y dos manos). Cero manos extra, cero brazos fantasma, cero duplicaciones. Las manos deben verse totalmente naturales, con proporciones perfectas y cinco dedos cada una.";

// Reglas restrictivas globales: se inyectan SIEMPRE al final del prompt
// (orden: expresión → prohibición visual). La composición espacial va en la sección Marketing 3D.
export const REGLA_EXPRESION =
  "REGLA ESTRICTA DE EXPRESIÓN: Está absolutamente prohibido generar expresiones de tristeza, llanto, pucheros, lástima o resignación pasiva. Prohibido posturas relajadas como manos en la cintura o brazos cruzados. El personaje debe mostrar niveles extremos de tensión facial, estrés activo o pánico urgente.";

export const PROHIBICION_VISUAL =
  "PROHIBICIÓN VISUAL EXPRESA: Está estrictamente prohibido generar luces de neón saliendo de los dispositivos, escudos de seguridad holográficos, íconos flotantes o gráficos 3D superpuestos sobre el entorno. El entorno físico debe ser totalmente realista, crudo y fotográfico, sin efectos de 'magia digital' ni hologramas.";

// Regla de composición espacial ESTRICTA: va dentro de la sección de Composición / Marketing 3D,
// justo después de los textos 3D y el badge. Refiere al área libre de la esquina inferior izquierda.
// Zonas seguras de YouTube: su interfaz tapa las esquinas extremas de la miniatura. Va junto a la
// regla de composición espacial (sección Marketing 3D).
// Estética del badge (máximo contraste): solo se inyecta cuando hay un badge elegido (no con "Ninguno").
export const ESTETICA_BADGE =
  "ESTÉTICA DEL BADGE (MÁXIMO CONTRASTE): El badge 3D flotante DEBE tener obligatoriamente un fondo sólido en forma de placa rectangular o pastilla (pill-shape) con bordes redondeados detrás del texto y el emoji. Este fondo debe ser de un color sólido y brillante que contraste fuertemente con las letras. Está estrictamente prohibido generar letras flotantes sin fondo ('texto sin fondo') o usar formas circulares que encojan la tipografía. El diseño debe parecer un botón o etiqueta publicitaria premium muy legible.";

export const REGLA_YOUTUBE =
  "COMPOSICIÓN PARA YOUTUBE: Está estrictamente prohibido colocar badges, logos o textos en las esquinas extremas (especialmente la inferior derecha y superior derecha) para evitar que sean tapados por la interfaz de YouTube. Agrupa los badges cerca del texto principal o en el centro superior. Ningún elemento debe solaparse caóticamente con otro.";

// Branding: la ropa y los accesorios del personaje no llevan logos ni marcas; la marca y el modelo solo van
// en los textos 3D (somos un servicio técnico independiente, no la marca oficial).
export const REGLA_BRANDING =
  "REGLA DE BRANDING (ANTI-LOGOTIPOS DE MARCA): PROHIBICIÓN ABSOLUTA DE LOGOTIPOS: Está estrictamente prohibido que el personaje lleve camisetas, gorras, uniformes o accesorios con logotipos, nombres o marcas comerciales (especialmente \"EPSON\", \"Canon\" o similares). La ropa del personaje debe ser completamente neutra, genérica, de color sólido (como una camisa formal sencilla o un suéter sin marcas visibles). USO EXCLUSIVO DEL TEXTO 3D: La marca y el modelo (ej. \"EPSON L3110\") solo deben aparecer en los bloques de texto 3D flotantes gigantes de la miniatura para identificar el equipo a reparar, pero NUNCA en la indumentaria del personaje. Esto es fundamental para dejar claro que somos un servicio técnico independiente y no la marca oficial.";

// Estética del personaje: solo aplica cuando el personaje es una mujer.
export const ESTETICA_MUJER =
  "ESTÉTICA DEL PERSONAJE: Las mujeres generadas deben ser atractivas pero reales, de belleza natural y armónica, con proporciones equilibradas y piel con textura realista (poros visibles e imperfecciones sutiles), nunca de modelo irreal, manteniendo siempre la expresión de alta tensión, pánico o estrés requerida.";

export const REGLA_COMPOSICION =
  "REGLA DE COMPOSICIÓN ESPACIAL ESTRICTA: La composición del lienzo debe estar dividida. Todos los textos gigantes 3D principales y el badge flotante deben agruparse obligatoriamente en un lateral o en la mitad superior de la imagen, lejos de la esquina inferior izquierda, que debe estar completamente DESPEJADA Y VISIBLE (solo contiene la marca de agua sutil). Está absolutamente prohibido que cualquier letra, sombra, personaje o elemento 3D cruce, tape o se superponga sobre esa zona. El área libre es sagrada y debe quedar limpia.";

/**
 * Recoge los valores de los 4 bloques y devuelve UN solo prompt fotográfico hiperrealista.
 * Los datos del Bloque 1 (marca, modelo, error) se inyectan dentro del entorno (fondo estructural)
 * definido por el perfil del Bloque 3, dejando la esquina inferior izquierda como espacio negativo.
 */
/** Datos comunes de los dos prompts (el de Gemini y el de la API de imágenes). */
function preparar(i: PromptInput) {
  const catalogo = i.catalogo ?? PERFILES;
  const perfil = catalogo[i.profesion] ?? Object.values(catalogo)[0] ?? PERFILES[PROFESIONES[0]];
  const arq = ARQUETIPOS[i.arquetipo];
  const mujer = arq ? arq.genero === "Mujer" : i.genero === "Mujer";
  const printer = printerFullName(i.marca, i.modelo);
  const errorText = i.error.toUpperCase();
  const marco = MARCOS.find((m) => m.es === i.marco)?.en ?? "a thin neon border";
  const plano = (PLANOS.find((p) => p.es === i.plano) ?? PLANOS[0]).en;

  // Gafas: "Ninguna" no inyecta nada. Si se elige un par, se quitan las gafas que pudiera traer la
  // vestimenta del perfil (p. ej. "…and black-framed glasses") para no duplicarlas ni contradecirlas.
  const gafasText = GAFAS[i.gafas] ?? "";
  // Accesorio en las manos: con cable o teléfono, una mano lo sostiene y la otra conserva el gesto (variante de una mano)
  const postura = cerebroPostura(i.accesorio); // el cerebro decide la postura de AMBAS manos
  const hands = postura.manosEn;
  const clothingBase = mujer ? perfil.en.clothing.f : perfil.en.clothing.m;
  const clothing = gafasText
    ? clothingBase.replace(/\s+and\s+(?:black-framed\s+|relaxing\s+)?(?:eye)?glasses/i, "")
    : clothingBase;

  // Paleta de los textos 3D: principal = RESET, secundario = código de error, terciario = marca y modelo
  const [color1, color2, color3] = (PALETAS[i.paleta] ?? PALETAS[PALETAS_FIJAS[0]]).en;

  // Badge elegido (si no es "Ninguno"), traducido al idioma seleccionado
  const badge = i.badge && i.badge !== NINGUNO ? BADGE_DATA[i.badge] : undefined;
  const badgeSentence = badge
    ? `A floating 3D badge in the composition reading "${badge.textos[i.idioma]}", with a small ${badge.icon} icon (${badge.emoji}) integrated inside the badge itself, with the same massive, legible typography.`
    : "No badges or extra labels in the composition.";

  // Descripción del personaje: arquetipo (todo definido) o personalización (rostro, cabello, vello)
  const listas = i.listas ?? LISTAS_BASE;
  const nivel = nivelPlano(i.plano);
  const sexo = mujer ? "woman" : "man";
  const conArticulo = (t: string) => `${/^[aeiou]/i.test(t) ? "an" : "a"} ${t}`;
  const descripcion = arq
    ? `${conArticulo(ETNIA_EN[arq.etnia].replace("{n}", sexo))} aged ${arq.edadAnios}, with ${arq.cabello.en}, ${arq.rasgosFaciales.forma}, ${arq.rasgosFaciales.ojos}, ${arq.rasgosFaciales.cejas}, ${arq.rasgosFaciales.nariz} and ${arq.rasgosFaciales.boca}`
    : `${conArticulo(ETNIA_EN[i.etnia].replace("{n}", sexo))} ${EDAD_EN[i.edad]}${i.personaje ? `, ${describirRostro(listas, i.personaje)}` : ""}`;
  const personaje = `On the right side of the frame, ${descripcion}, working as ${/^[aeiou]/i.test(perfil.en.role) ? "an" : "a"} ${perfil.en.role}, wearing ${clothing}, with ${perfil.en.emotion}, and ${hands}.`;
  // Cuerpo: solo hacia arriba y según el plano (detalle = nada · primer plano = hombros · medio = complexión y hombros)
  const rasgosExtra = arq
    ? describirCuerpo(arq.cuerpo.complexion, arq.cuerpo.hombros, nivel)
    : describirCuerpo(
        listas.complexion.find((x) => x.es === i.personaje?.complexion)?.en ?? "",
        listas.hombros.find((x) => x.es === i.personaje?.hombros)?.en ?? "",
        nivel,
      );
  return {
    perfil, arq, mujer, printer, errorText, marco, plano, gafasText, postura, color1, color2, color3, badge, badgeSentence, personaje, rasgosExtra,
  };
}

export function buildPrompt(i: PromptInput): string {
  const { perfil, mujer, printer, errorText, marco, plano, gafasText, postura, color1, color2, color3, badge, badgeSentence, personaje, rasgosExtra } = preparar(i);

  // Entorno contextual (Fondo Estructural del Bloque 3): detalles del trabajo de la profesión + impresoras reales de la
  // marca elegida al fondo desenfocado; el primer plano y el área de montaje (esquina inferior izquierda) quedan libres.
  const setting = `The setting is ${perfil.en.scene}, with subtle but realistic details of the character's daily workplace in the soft-focus background, such as ${perfil.en.props}. On the desks and shelves of this blurred background there are also real, physical ${i.marca} printers (recognizable ${i.marca} printer silhouettes, slightly out of focus, with no legible logos or brand text on them), giving the immediate visual impression that the character is a customer who uses ${i.marca} printers in their daily work. ${PROHIBICION_IMPRESORAS} ${AREA_MONTAJE_ES}`;

  const sentences = [
    "Hyper-realistic cinematic photograph for a YouTube thumbnail in 16:9 widescreen on a 1920x1080 pixel canvas, shot on a full-frame camera with an 85mm lens, shallow depth of field, dramatic high-contrast lighting, ultra-detailed skin and fabric textures, vivid saturated colors.",
    plano,
    personaje,
    ...(rasgosExtra ? [rasgosExtra] : []),
    FRASE_CINTURA,
    ARMONIA_EN,
    IDENTIDAD_ES,
    ...(gafasText ? [gafasText] : []),
    ...postura.reglas,
    REGLA_BRANDING,
    MIRADA_REGLA,
    ...(mujer ? [ESTETICA_MUJER] : []),
    "The person is anatomically correct: exactly one person, exactly two arms, two hands with five fingers each, one symmetrical face and natural proportions.",
    ANATOMIA_ES,
    setting,
    `Massive 3D typography with volume, beveled edges, thick dark outlines and strong shadows, perfectly legible and sharp: the giant word "RESET" in ${color1}, "${errorText}" in ${color2}, and "${printer.toUpperCase()}" in ${color3}.`,
    badgeSentence,
    ...(badge ? [ESTETICA_BADGE] : []),
    REGLA_COMPOSICION,
    MARCA_AGUA_ES,
    REGLA_YOUTUBE,
    `${marco.charAt(0).toUpperCase()}${marco.slice(1)} frames the entire image.`,
    `Every quoted text must be rendered exactly as written, letter by letter, with no spelling mistakes or invented characters, and no other text anywhere in the image except the subtle corporate watermark "${MARCA_AGUA_TEXTO}" in the bottom-left corner.`,
    "Clean, balanced composition with no duplicated elements. Avoid extra limbs, extra or missing fingers, deformed hands, distorted faces, duplicate people, blurry or low-quality rendering, misspelled text, any other watermarks or logos, and incoherent shapes.",
  ];

  return `${ASPECT_SENTENCE}\n\n${sentences.join(" ")} ${REGLA_EXPRESION} ${PROHIBICION_VISUAL}`;
}

/* ───────── Resultado estructurado de la generación ───────── */
export type GeneratedPrompt = {
  /** Prompt fotográfico hiperrealista para la IA. */
  promptText: string;
  /** URL de la imagen del error correspondiente (referencia visual); null si no hay. */
  errorImageUrl: string | null;
};

/**
 * Función de generación: devuelve el prompt y, además, la URL de la imagen de error que
 * corresponde al "Tipo de error" (y modelo) seleccionados, lista para el post-procesamiento.
 * `baseUrl` (p. ej. window.location.origin) convierte la ruta pública en una URL absoluta.
 */
export function generatePrompt(input: PromptInput, options: { baseUrl?: string } = {}): GeneratedPrompt {
  const path = resolveErrorImagePath({ marca: input.marca, modelo: input.modelo, error: input.error });
  const base = (options.baseUrl ?? "").replace(/\/$/, "");
  return {
    promptText: buildPrompt(input),
    errorImageUrl: path ? `${base}${path}` : null,
  };
}

/* ───────── Prompt para la API de imágenes (Fase 2) ─────────
   Todo en inglés (mejor adherencia en los modelos) y sin porcentajes: solo descripciones espaciales.
   Con «texto3d» activado incluye los textos 3D y el badge (idioma del bloque 4); desactivado pide la imagen SIN
   texto y deja las zonas libres para postproducción. El prompt de Gemini (buildPrompt) no cambia de formato. */
const MIRADA_API =
  "The character's eyes are wide open and bulging with panic, and the head is turned so the stare is fixed firmly on the empty lower-left area of the frame, aimed just above the very corner, toward the upper edge of that empty space, as if staring at something terrifying there. The eyes never look at the camera, never look at the hand, the phone or the cable, and never look downward. The line of sight clearly connects the stressed face with that empty space.";
const ANATOMIA_API =
  "Flawless human anatomy: exactly one person with exactly two arms and two hands, five fingers on each hand, no extra hands, no phantom limbs, no duplicated arms. The hands look completely natural with perfect proportions.";
const EXPRESION_API =
  "The face shows extreme tension, active stress or urgent panic. Never sadness, crying, pouting, self-pity or passive resignation, and never relaxed poses such as hands on hips or crossed arms.";
const REALISMO_API =
  "The physical environment is fully realistic, raw and photographic: no neon light coming out of devices, no holographic shields, no floating icons and no overlaid 3D graphics.";
const YOUTUBE_API =
  "Keep the lower-right corner free of important elements and text, because YouTube's video-duration label covers it, and keep every element away from the extreme corners. Nothing overlaps chaotically.";

export function buildApiPrompt(i: PromptInput, opts: { texto3d: boolean }): string {
  const c = preparar(i);
  const t = opts.texto3d;
  const marcoEn = c.marco.charAt(0).toUpperCase() + c.marco.slice(1);

  const escena = `The setting is ${c.perfil.en.scene}, with realistic details of the character's workplace softly blurred in the background, such as ${c.perfil.en.props}. Real physical ${i.marca} printers sit on shelves and tables in the blurred background, slightly out of focus, with no legible logos or text on them. There are no printers in the foreground.`;
  const esquina = t
    ? `The lower-left corner of the frame is completely empty negative space: only a clean, softly blurred background, with no objects, no hands, no printers and no graphics. In that corner, and only there, add a tiny, subtle, semi-transparent, elegant typographic watermark reading "${MARCA_AGUA_TEXTO}", slightly inset from the edges, with no box and no icon.`
    : "The lower-left corner of the frame is completely empty negative space: only a clean, softly blurred background, with no objects, no hands, no printers, no graphics and no text, kept clean for post-production.";
  const ropa = t
    ? `The character's clothing is completely plain, generic and solid-colored, with no logos, brand names, printed text or emblems on shirts, caps, uniforms or accessories. The printer brand and model appear only inside the giant 3D text blocks, never on the clothing.`
    : "The character's clothing is completely plain, generic and solid-colored, with no logos, brand names, printed text or emblems on shirts, caps, uniforms or accessories.";

  const textos = t
    ? [
        `Massive 3D typography with volume, beveled edges, thick dark outlines and strong shadows, perfectly legible and sharp: the giant word "RESET" in ${c.color1}, "${c.errorText}" in ${c.color2}, and "${c.printer.toUpperCase()}" in ${c.color3}. Group the main 3D texts and the badge in the upper half or along the top, away from the lower-left corner and from the lower-right corner.`,
        c.badgeSentence,
        ...(c.badge
          ? [
              "The badge sits on a solid rectangular plaque or rounded pill-shaped background in a bright solid color that contrasts strongly with its letters, like a premium advertising label. No floating letters without a background and no circular shapes.",
            ]
          : []),
        "Every quoted text is rendered exactly as written, letter by letter, with no spelling mistakes or invented characters, and there is no other text in the image except the tiny watermark.",
      ]
    : [
        "Do not render any text, letters, numbers, logos, badges or labels anywhere in the image. Keep the upper area of the frame clean and uncluttered so titles and badges can be added later in post-production.",
      ];

  const negativos = `Avoid: extra hands, extra arms, extra or missing fingers, deformed hands, distorted faces, duplicate people, logos or brand names on the clothing, any object or hand in the lower-left corner, any element in the lower-right corner, blurry or low-quality rendering, ${t ? "misspelled text, any watermark other than the specified one," : "any text at all,"} and glowing neon effects, holograms or floating icons over the environment.`;

  return [
    "Hyper-realistic cinematic photograph for a YouTube thumbnail, 16:9 widescreen, shot on a full-frame camera with an 85mm lens, shallow depth of field, dramatic high-contrast lighting, ultra-detailed skin and fabric textures, vivid saturated colors.",
    c.plano,
    c.personaje,
    ...(c.rasgosExtra ? [c.rasgosExtra] : []),
    FRASE_CINTURA,
    ARMONIA_EN,
    "Every image shows a completely different person: a unique face and a unique facial structure.",
    ...(c.gafasText ? [c.gafasText] : []),
    ...c.postura.reglasEn,
    MIRADA_API,
    ANATOMIA_API,
    EXPRESION_API,
    ropa,
    escena,
    esquina,
    ...textos,
    YOUTUBE_API,
    REALISMO_API,
    `${marcoEn} frames the entire image.`,
    negativos,
  ].join(" ");
}
