// Personalización del personaje (modo «Personalizar»): listas editables, sorteo armónico y descripción fotográfica.
// Este módulo no depende de prompt-config (para evitar importaciones circulares).

export const ALEATORIO = "🎲 Aleatorio";

/* ───────── Listas ───────── */
export type CampoForma = "forma" | "ojosForma" | "cejas" | "nariz" | "labios";
export type CampoLista =
  | CampoForma
  | "ojosColor"
  | "cabelloColor"
  | "cabelloTipo"
  | "cabelloLargo"
  | "vello"
  | "complexion"
  | "hombros"
  | "estilo";

/** id: identificador estable (las reglas de armonía lo usan; las opciones nuevas del usuario no lo tienen y siempre se admiten) */
export type Opcion = { id?: string; es: string; en: string; rasgos?: Partial<Record<CampoForma, string>> };
export type Listas = Record<CampoLista, Opcion[]>;

export const CAMPOS_FORMA: CampoForma[] = ["forma", "ojosForma", "cejas", "nariz", "labios"];

export const NOMBRE_LISTA: Record<CampoLista, string> = {
  estilo: "Estilos faciales predefinidos",
  forma: "Forma del rostro",
  ojosColor: "Color de ojos",
  ojosForma: "Forma de ojos",
  cejas: "Cejas",
  nariz: "Nariz",
  labios: "Labios",
  cabelloColor: "Color de cabello",
  cabelloTipo: "Tipo de cabello",
  cabelloLargo: "Largo / peinado",
  vello: "Vello facial (solo hombres)",
  complexion: "Complexión",
  hombros: "Hombros",
};

const o = (id: string, es: string, en: string): Opcion => ({ id, es, en });

export const LISTAS_BASE: Listas = {
  forma: [
    o("ovalado", "Ovalado", "an oval face"),
    o("redondo", "Redondo", "a round face"),
    o("cuadrado", "Cuadrado", "a square face with a defined jaw"),
    o("corazon", "Corazón", "a heart-shaped face"),
    o("alargado", "Alargado", "a long, narrow face"),
  ],
  ojosColor: [
    o("cafe_oscuro", "Café oscuro", "dark brown"),
    o("cafe_claro", "Café claro", "light brown"),
    o("miel", "Miel", "honey-colored"),
    o("avellana", "Avellana", "hazel"),
    o("verde", "Verde", "green"),
    o("gris", "Gris", "gray"),
    o("azul", "Azul", "blue"),
  ],
  ojosForma: [
    o("almendrados", "Almendrados", "almond-shaped"),
    o("redondos", "Redondos", "round"),
    o("rasgados", "Rasgados", "narrow, slightly slanted"),
    o("caidos", "Caídos", "softly downturned"),
    o("encapotados", "Encapotados", "hooded"),
  ],
  cejas: [
    o("pobladas", "Pobladas", "thick"),
    o("finas", "Finas", "thin"),
    o("arqueadas", "Arqueadas", "softly arched"),
    o("rectas", "Rectas", "straight"),
    o("naturales", "Naturales", "natural"),
  ],
  nariz: [
    o("recta", "Recta", "a straight nose"),
    o("respingada", "Respingada", "an upturned nose"),
    o("ancha", "Ancha", "a broad nose"),
    o("aguilena", "Aguileña", "an aquiline nose"),
    o("pequena", "Pequeña", "a small nose"),
    o("boton", "De botón", "a rounded button nose"),
  ],
  labios: [
    o("finos", "Finos", "thin lips"),
    o("medianos", "Medianos", "medium-full lips"),
    o("gruesos", "Gruesos", "full lips"),
    o("cupido", "Con arco de cupido marcado", "lips with a well-defined cupid's bow"),
  ],
  cabelloColor: [
    o("negro", "Negro", "jet black"),
    o("castano_oscuro", "Castaño oscuro", "dark brown"),
    o("castano_claro", "Castaño claro", "light chestnut brown"),
    o("rubio", "Rubio", "blond"),
    o("pelirrojo", "Pelirrojo", "auburn red"),
    o("canoso", "Canoso", "silver-gray"),
    o("sal_pimienta", "Sal y pimienta", "salt-and-pepper"),
  ],
  cabelloTipo: [
    o("liso", "Liso", "straight"),
    o("ondulado", "Ondulado", "wavy"),
    o("rizado", "Rizado", "curly"),
    o("afro", "Afro", "afro-textured"),
    o("crespo", "Crespo", "tightly coiled"),
  ],
  cabelloLargo: [
    o("rapado", "Rapado", "closely shaved"),
    o("corto", "Corto", "short"),
    o("mediano", "Mediano", "medium-length"),
    o("largo", "Largo", "long"),
    o("recogido", "Recogido", "pulled back in a neat updo"),
    o("coleta", "Coleta", "tied back in a ponytail"),
  ],
  vello: [
    o("ninguno", "Sin barba", "clean-shaven"),
    o("tres_dias", "Barba de 3 días", "light three-day stubble"),
    o("barba_corta", "Barba corta", "a short, neatly trimmed beard"),
    o("barba_completa", "Barba completa", "a full beard"),
    o("bigote", "Bigote", "a mustache"),
  ],
  complexion: [
    o("delgada", "Delgada", "a slim build"),
    o("promedio", "Promedio", "an average build"),
    o("atletica", "Atlética", "an athletic build"),
    o("robusta", "Robusta moderada", "a moderately sturdy build"),
  ],
  hombros: [
    o("estrechos", "Estrechos", "narrow shoulders"),
    o("medios", "Medios", "medium-width shoulders"),
    o("anchos", "Anchos", "broad shoulders"),
  ],
  estilo: [
    { id: "suaves", es: "Rasgos suaves y redondeados", en: "", rasgos: { forma: "redondo", ojosForma: "redondos", cejas: "naturales", nariz: "boton", labios: "medianos" } },
    { id: "angulosos", es: "Rasgos angulosos marcados", en: "", rasgos: { forma: "cuadrado", ojosForma: "encapotados", cejas: "rectas", nariz: "recta", labios: "finos" } },
    { id: "almendrados", es: "Mirada intensa de ojos almendrados", en: "", rasgos: { forma: "ovalado", ojosForma: "almendrados", cejas: "arqueadas", nariz: "recta", labios: "cupido" } },
    { id: "maduro", es: "Rostro maduro con líneas de expresión", en: "visible expression lines around the eyes and mouth", rasgos: { forma: "alargado", ojosForma: "caidos", cejas: "pobladas", nariz: "aguilena", labios: "medianos" } },
    { id: "joven_fino", es: "Rostro joven de rasgos finos", en: "", rasgos: { forma: "corazon", ojosForma: "almendrados", cejas: "finas", nariz: "pequena", labios: "finos" } },
    { id: "mandibula", es: "Rostro fuerte de mandíbula marcada", en: "a strong, prominent jawline", rasgos: { forma: "cuadrado", ojosForma: "encapotados", cejas: "pobladas", nariz: "ancha", labios: "gruesos" } },
    { id: "calido", es: "Rostro cálido de mejillas llenas", en: "full, warm cheeks", rasgos: { forma: "redondo", ojosForma: "redondos", cejas: "arqueadas", nariz: "respingada", labios: "gruesos" } },
    { id: "elegante", es: "Rostro alargado y elegante", en: "high, elegant cheekbones", rasgos: { forma: "alargado", ojosForma: "almendrados", cejas: "arqueadas", nariz: "recta", labios: "cupido" } },
    { id: "expresivo", es: "Rostro expresivo de ojos grandes", en: "large, very expressive eyes", rasgos: { forma: "ovalado", ojosForma: "redondos", cejas: "arqueadas", nariz: "respingada", labios: "medianos" } },
    { id: "nariz_marcada", es: "Rasgos marcados de nariz prominente", en: "a strong, characterful profile", rasgos: { forma: "alargado", ojosForma: "caidos", cejas: "pobladas", nariz: "aguilena", labios: "finos" } },
  ],
};

/* ───────── Selección y personaje concreto ───────── */
export type Seleccion = Record<CampoLista, string>;
export type Concreto = Record<CampoLista, string>;
export type ModoRostro = "Estilo predefinido" | "Detalle completo";
export const MODOS_ROSTRO: ModoRostro[] = ["Estilo predefinido", "Detalle completo"];

export const SELECCION_INICIAL: Seleccion = {
  estilo: ALEATORIO, forma: ALEATORIO, ojosColor: ALEATORIO, ojosForma: ALEATORIO, cejas: ALEATORIO, nariz: ALEATORIO,
  labios: ALEATORIO, cabelloColor: ALEATORIO, cabelloTipo: ALEATORIO, cabelloLargo: ALEATORIO, vello: ALEATORIO,
  complexion: ALEATORIO, hombros: ALEATORIO,
};

/** Opciones del menú de un campo (con «Aleatorio» al inicio) */
export const opcionesMenu = (listas: Listas, campo: CampoLista): string[] => [ALEATORIO, ...listas[campo].map((x) => x.es)];

export type Contexto = { genero: string; edad: string; etnia: string };

/* ───────── Reglas de armonía (sorteo y avisos) ───────── */
const GRUPO_ETNIA: Record<string, "europea" | "latina" | "latina_oscura" | "afro" | "indigena" | "asiatica" | "sudasiatica" | "arabe"> = {
  "Colombiana Bogotá/Andino": "latina",
  "Colombiana Medellín/Paisa": "latina",
  "Colombiana Costa Caribe": "latina_oscura",
  "Mestiza Clara México": "latina",
  "Blanca/Mediterránea Cono Sur": "europea",
  "Afro-Latina": "afro",
  "Rasgos Nativos/Indígenas": "indigena",
  "Caucásica/Europea": "europea",
  Afrodescendiente: "afro",
  "Asiática del Este": "asiatica",
  Sudasiática: "sudasiatica",
  "Medio Oriente/Árabe": "arabe",
  "Latino / Mestizo": "latina",
  "Afrodescendiente / Afro-latino": "afro",
  "Caucásico / Mediterráneo": "europea",
  "Asiático / Coreano": "asiatica",
};
const EDAD_MIN: Record<string, number> = {
  "Joven 18-25": 18,
  "Adulto Joven 30-40": 30,
  "Adulto Mayor 45-55": 45,
  "Adulto Maduro 56-65": 56,
  "Mayor 66-70": 66,
};

const OJOS: Record<string, string[] | "todos"> = {
  europea: "todos",
  latina: ["cafe_oscuro", "cafe_claro", "miel", "avellana"],
  latina_oscura: ["cafe_oscuro", "cafe_claro", "miel"],
  afro: ["cafe_oscuro", "cafe_claro", "miel"],
  indigena: ["cafe_oscuro", "cafe_claro"],
  asiatica: ["cafe_oscuro", "cafe_claro"],
  sudasiatica: ["cafe_oscuro", "cafe_claro"],
  arabe: ["cafe_oscuro", "cafe_claro", "miel", "avellana", "verde"],
};
const PELO_COLOR: Record<string, string[]> = {
  europea: ["negro", "castano_oscuro", "castano_claro", "rubio", "pelirrojo"],
  latina: ["negro", "castano_oscuro", "castano_claro"],
  latina_oscura: ["negro", "castano_oscuro"],
  afro: ["negro", "castano_oscuro"],
  indigena: ["negro", "castano_oscuro"],
  asiatica: ["negro", "castano_oscuro"],
  sudasiatica: ["negro", "castano_oscuro"],
  arabe: ["negro", "castano_oscuro", "castano_claro"],
};
const PELO_TIPO: Record<string, string[]> = {
  europea: ["liso", "ondulado", "rizado"],
  latina: ["liso", "ondulado", "rizado"],
  latina_oscura: ["liso", "ondulado", "rizado"],
  afro: ["ondulado", "rizado", "afro", "crespo"],
  indigena: ["liso", "ondulado"],
  asiatica: ["liso", "ondulado"],
  sudasiatica: ["liso", "ondulado", "rizado"],
  arabe: ["liso", "ondulado", "rizado"],
};

/** ¿Es armónica esta opción en este contexto? Las opciones sin id (creadas por el usuario) siempre se admiten. */
export function esArmonica(campo: CampoLista, id: string | undefined, ctx: Contexto): boolean {
  if (!id) return true;
  const g = GRUPO_ETNIA[ctx.etnia];
  const mujer = ctx.genero === "Mujer";
  const edadMin = EDAD_MIN[ctx.edad] ?? 30;
  switch (campo) {
    case "ojosColor": {
      const ok = g ? OJOS[g] : "todos";
      return ok === "todos" || ok.includes(id);
    }
    case "cabelloColor": {
      if (id === "canoso") return edadMin >= 56;
      if (id === "sal_pimienta") return edadMin >= 45;
      return g ? PELO_COLOR[g].includes(id) : true;
    }
    case "cabelloTipo":
      return g ? PELO_TIPO[g].includes(id) : true;
    case "cabelloLargo":
      return mujer ? id !== "rapado" : !["largo", "recogido"].includes(id);
    case "vello":
      if (mujer) return id === "ninguno";
      return edadMin < 25 ? ["ninguno", "tres_dias", "barba_corta"].includes(id) : true;
    case "hombros":
      return mujer ? id !== "anchos" : true;
    default:
      return true;
  }
}

/** Avisos suaves para una elección manual (no la bloquean). */
export function avisosCoherencia(listas: Listas, p: Concreto, ctx: Contexto): string[] {
  const out: string[] = [];
  const revisar = (campo: CampoLista, etiqueta: string) => {
    const op = listas[campo].find((x) => x.es === p[campo]);
    if (op && !esArmonica(campo, op.id, ctx)) out.push(`${etiqueta} «${op.es}» es poco habitual con ${ctx.etnia}, ${ctx.edad} o ${ctx.genero.toLowerCase()}.`);
  };
  revisar("ojosColor", "El color de ojos");
  revisar("cabelloColor", "El color de cabello");
  revisar("cabelloTipo", "El tipo de cabello");
  revisar("cabelloLargo", "El peinado");
  if (ctx.genero !== "Mujer") revisar("vello", "El vello facial");
  revisar("hombros", "Los hombros");
  return out;
}

/* ───────── Sorteo reproducible ───────── */
function prng(u: number) {
  let a = Math.floor(u * 2 ** 32) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convierte la selección (con «Aleatorio») en valores concretos y ARMÓNICOS para un número de sorteo `u`.
 * Lo elegido a mano se respeta tal cual; solo lo aleatorio pasa por las reglas de armonía.
 */
export function resolverPersonaje(listas: Listas, sel: Seleccion, ctx: Contexto, modo: ModoRostro, u: number = Math.random()): Concreto {
  const rnd = prng(u);
  const elegir = (campo: CampoLista): string => {
    const lista = listas[campo];
    if (sel[campo] !== ALEATORIO && lista.some((x) => x.es === sel[campo])) return sel[campo];
    const ok = lista.filter((x) => esArmonica(campo, x.id, ctx));
    const pool = ok.length ? ok : lista;
    return pool.length ? pool[Math.floor(rnd() * pool.length)].es : "";
  };
  const porId = (campo: CampoLista, id?: string) => (id ? listas[campo].find((x) => x.id === id)?.es : undefined);

  const r = {} as Concreto;
  // Estilo predefinido: rellena los 5 rasgos de forma. Detalle completo: cada uno por separado.
  r.estilo = modo === "Estilo predefinido" ? elegir("estilo") : "";
  const estilo = listas.estilo.find((x) => x.es === r.estilo);
  for (const c of CAMPOS_FORMA) r[c] = porId(c, estilo?.rasgos?.[c]) ?? elegir(c);
  for (const c of ["ojosColor", "cabelloColor", "cabelloTipo", "cabelloLargo", "complexion", "hombros"] as CampoLista[]) r[c] = elegir(c);
  // Vello facial: solo hombres (en mujeres no se describe nada)
  r.vello = ctx.genero === "Mujer" ? "" : elegir("vello");
  return r;
}

/* ───────── Descripción fotográfica (inglés, frase fluida) ───────── */
export type NivelPlano = "detalle" | "primer" | "medio";
export function nivelPlano(plano: string): NivelPlano {
  if (plano.startsWith("Plano Detalle")) return "detalle";
  if (plano.startsWith("Primer Plano")) return "primer";
  return "medio"; // Plano Medio y Eye Level (pecho hacia arriba)
}

const en = (listas: Listas, campo: CampoLista, es: string) => listas[campo].find((x) => x.es === es)?.en ?? "";

/** «with …» del rostro, el cabello y el vello, como una sola frase de retrato. */
export function describirRostro(listas: Listas, p: Concreto): string {
  const forma = en(listas, "forma", p.forma);
  const ojos = [en(listas, "ojosForma", p.ojosForma), en(listas, "ojosColor", p.ojosColor)].filter(Boolean).join(" ");
  const cejas = en(listas, "cejas", p.cejas);
  const nariz = en(listas, "nariz", p.nariz);
  const labios = en(listas, "labios", p.labios);
  const extra = en(listas, "estilo", p.estilo);

  const partes = [
    forma,
    ojos && `${ojos} eyes`,
    cejas && `${cejas} eyebrows`,
    nariz,
    labios,
  ].filter(Boolean);
  const rostro = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} and ${partes[partes.length - 1]}` : partes.join("");

  const color = en(listas, "cabelloColor", p.cabelloColor);
  const tipo = en(listas, "cabelloTipo", p.cabelloTipo);
  const largo = en(listas, "cabelloLargo", p.cabelloLargo);
  const base = [color, tipo].filter(Boolean).join(" ");
  const posterior = /^(pulled|tied)/.test(largo);
  const pelo = base ? (posterior ? `${base} hair ${largo}` : `${[largo, base].filter(Boolean).join(" ")} hair`) : largo ? `${largo} hair` : "";
  const vello = p.vello ? en(listas, "vello", p.vello) : "";

  return [rostro && `with ${rostro}`, extra && `showing ${extra}`, pelo && `${pelo}`, vello && `and ${vello}`].filter(Boolean).join(", ");
}

/** Frase del cuerpo según el plano: detalle = nada · primer plano = solo hombros · plano medio = complexión y hombros. */
export function describirCuerpo(complexion: string, hombros: string, nivel: NivelPlano): string {
  if (nivel === "detalle") return "";
  if (nivel === "primer") return hombros ? `The person has ${hombros}.` : "";
  return [complexion, hombros].filter(Boolean).length === 2 ? `The person has ${complexion} and ${hombros}.` : "";
}

export const FRASE_CINTURA = "The person is framed from the waist up at most, no hips, no legs visible.";
export const ARMONIA_EN =
  "The person has natural harmonious beauty with balanced proportions, realistic skin texture with visible pores and subtle imperfections, no plastic or airbrushed skin, and no exaggerated features.";
