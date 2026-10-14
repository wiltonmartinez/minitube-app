// Títulos, descripción y etiquetas de un video a partir de las plantillas (port de textos_video.py de Gestor TUBE).
//
//  1 · Epson sin pantalla LCD · Almohadillas
//  2 · Epson con pantalla LCD · E-11 / Tampón / Almohadillas
//  3 · Canon G5xxx–G7xxx · 5B00 / 1700        (NO aplica 5B02, E08 ni P07)
//  4 · Canon G1xxx–G4xxx · 5B00 / 1700 / E08 / P07
//  5 · Epson SureColor F570 / F571 · 0014BD
//  6 · Epson SureColor F570 / F571 · aviso 000x000x
//
// Lógica pura (sin red ni disco): se usa en el navegador y se puede probar con Vitest.
import { EPSON_CON_PANTALLA, type DatosVideo } from "./datos-video";
import { configVacia, type Config } from "./config";
import { PLANTILLAS_DEFECTO } from "./plantillas-defecto";

/** Configuración activa (menús editados por el usuario). Sin cambios es la de Gestor TUBE. */
let cfg: Config = configVacia();
export const configurar = (c: Config) => {
  cfg = c;
};
export const configActual = () => cfg;

export const LIMITE_TITULO = 100;
export const LIMITE_DESCRIPCION = 5000;
export const LIMITE_ETIQUETAS = 490; // YouTube admite 500; se deja margen
export const COSTO_CUOTA = 51; // videos.list (1) + videos.update (50)

export class ErrorTextos extends Error {}

/** Largo en caracteres reales (un emoji cuenta 1, como en Python y en YouTube). */
export const largo = (t: string) => [...t].length;

/** Epson que el bot antiguo tenía como «con pantalla» pero que van con la plantilla 1 (Almohadillas). */
const EPSON_SIN_E11 = new Set(["L4150"]);
const PLOTTERS_CON_PLANTILLA = new Set(["F570", "F571"]);

export const NUMEROS_BASE = [1, 2, 3, 4, 5, 6] as const;
/** Las 6 originales más las plantillas propias. */
export const numerosPlantilla = (): number[] => [...NUMEROS_BASE, ...cfg.propias.map((p) => p.n)];
const esNumeroValido = (n: number) => numerosPlantilla().includes(n);
const propia = (n: number) => cfg.propias.find((p) => p.n === n);

/** Datos que una plantilla trae por defecto: al elegirla no se piden. */
const FIJOS_BASE: Partial<Record<number, { marca: string; error?: string }>> = {
  1: { marca: "Epson", error: "Almohadillas" },
  2: { marca: "Epson" },
  3: { marca: "Canon" },
  4: { marca: "Canon" },
  5: { marca: "Epson-SC", error: "0014BD" },
  6: { marca: "Epson-SC" },
};

/** Errores que se eligen de una lista cerrada → cómo van en el enlace de WhatsApp. */
const ERRORES_BASE_POR_PLANTILLA: Partial<Record<number, Record<string, string>>> = {
  2: { Almohadillas: "Almohadillas", "E-11": "E-11", Tampón: "Tampon", Combinado: "Almohadillas" },
  3: { "5B00": "5B00", "1700": "1700", Combinado: "5B00" },
  4: { "5B00": "5B00", "1700": "1700", E08: "E08", P07: "P07", Combinado: "5B00" },
  6: {
    "00000001": "00000001", "00000004": "00000004", "00000008": "00000008", "0000000c": "0000000c", "00010000": "00010000", "00040000": "00040000", "00080000": "00080000", "000c0000": "000c0000",
    "00040008": "00040008", "00040001": "00040001", "0004000c": "0004000c", "00080001": "00080001", "00080004": "00080004", "0008000c": "0008000c", "00010004": "00010004", "00010008": "00010008",
    "0001000c": "0001000c", "000c0001": "000c0001", "000c0004": "000c0004", "000c0008": "000c0008", "reset pass admin": "reset-pass-admin",
  },
};
/** La plantilla 6 está redactada para el aviso 00000008. */
const ERROR_BASE_PLANTILLA: Partial<Record<number, string>> = { 6: "00000008" };
/** Opción marcada de entrada. */
const DEFECTO_BASE: Partial<Record<number, string>> = { 2: "Combinado", 3: "Combinado", 4: "Combinado" };
const ERROR_POR_DEFECTO_BASE: Record<number, string> = { 1: "Almohadillas", 2: "Almohadillas", 3: "5B00", 4: "5B00", 5: "0014BD", 6: "00000008" };
const MODELO_EJEMPLO_BASE: Record<number, string> = { 1: "L4150", 2: "L4160", 3: "G6010", 4: "G3110", 5: "F570", 6: "F570" };
const NOMBRES_BASE: Record<number, string> = {
  1: "Epson · Almohadillas",
  2: "Epson (pantalla) · E-11 / Almohadillas",
  3: "Canon G5xxx–G7xxx · 5B00 / 1700",
  4: "Canon G1xxx–G4xxx · P07 / E08 / 5B00",
  5: "Epson SureColor · 0014BD",
  6: "Epson SureColor · aviso 000x000x",
};
const CUANDO_BASE: Record<number, string> = {
  1: "Epson sin E-11 · Almohadillas (p. ej. L4150)",
  2: "Epson con pantalla · E-11 / Tampón / Almohadillas (p. ej. L4160)",
  3: "Canon G5xxx–G7xxx · 5B00 / 1700 / combinado (no 5B02, E08 ni P07)",
  4: "Canon G1xxx–G4xxx · 5B00 / P07 y 1700 / E08, o combinado",
  5: "Epson SureColor F570 / F571 · error 0014BD",
  6: "Epson SureColor F570 / F571 · aviso 000x000x",
};

// ── lo que cambia según la configuración (plantillas originales o propias) ──
export const fijosDe = (n: number | null | undefined): { marca?: string; error?: string } | undefined => {
  if (!n) return undefined;
  const p = propia(n);
  if (p) return p.marca || p.error ? { ...(p.marca ? { marca: p.marca } : {}), ...(p.error ? { error: p.error } : {}) } : undefined;
  return FIJOS_BASE[n];
};
/** Opciones de error de una plantilla (nombre → texto del enlace de WhatsApp); undefined si el error se escribe libre. */
export const erroresDe = (n: number | null | undefined): Record<string, string> | undefined => {
  if (!n) return undefined;
  const p = propia(n);
  const lista = p ? p.opciones : cfg.opcionesError[n];
  if (lista) return lista.length ? Object.fromEntries(lista.map((o) => [o.nombre, o.enlace])) : undefined;
  return ERRORES_BASE_POR_PLANTILLA[n];
};
/** Orden de las opciones originales (un objeto de JavaScript pondría «1700» antes que «5B00»; en Gestor TUBE va al revés). */
const ORDEN_BASE: Partial<Record<number, string[]>> = { 3: ["5B00", "1700", "Combinado"], 4: ["5B00", "1700", "E08", "P07", "Combinado"] };
/** Opciones de error de la plantilla EN ORDEN (lista vacía si el error se escribe libre). */
export const opcionesDe = (n: number | null | undefined): { nombre: string; enlace: string }[] => {
  if (!n) return [];
  const p = propia(n);
  const lista = p ? p.opciones : cfg.opcionesError[n];
  if (lista) return lista;
  const base = ERRORES_BASE_POR_PLANTILLA[n];
  return base ? (ORDEN_BASE[n] ?? Object.keys(base)).map((nombre) => ({ nombre, enlace: base[nombre] })) : [];
};
export const errorDefectoDe = (n: number): string | undefined => {
  const op = erroresDe(n);
  if (!op) return undefined;
  const d = propia(n) ? propia(n)!.opcionDefecto : (cfg.opcionDefecto[n] ?? DEFECTO_BASE[n]);
  return d && d in op ? d : undefined;
};
/** Error que se usa si no se elige ninguno. */
export const errorPorDefecto = (n: number): string => {
  const p = propia(n);
  if (p) return p.error || errorDefectoDe(n) || Object.keys(erroresDe(n) ?? {})[0] || "Almohadillas";
  const base = ERROR_POR_DEFECTO_BASE[n] ?? "Almohadillas";
  const op = erroresDe(n);
  return !op || base in op ? base : Object.keys(op)[0];
};
export const nombreDe = (n: number) => propia(n)?.nombre ?? cfg.nombres[n]?.nombre ?? NOMBRES_BASE[n] ?? `Plantilla ${n}`;
export const cuandoDe = (n: number) => propia(n)?.cuando ?? cfg.nombres[n]?.cuando ?? CUANDO_BASE[n] ?? "";
export const modeloEjemploDe = (n: number) => propia(n)?.modelo ?? MODELO_EJEMPLO_BASE[n] ?? "L4150";
export const esPropia = (n: number) => !!propia(n);
/** Marcas aceptadas al escribir los datos a mano: la clave (en mayúsculas) → el valor guardado. */
const marcasValidas = (): Record<string, string> => {
  const m: Record<string, string> = { "EPSON SC": "Epson-SC", EPSONSC: "Epson-SC" };
  for (const x of cfg.marcas) {
    m[x.valor.toUpperCase()] = x.valor;
    m[x.nombre.toUpperCase()] = x.valor;
  }
  return m;
};

export type InfoPlantilla = { n: number; nombre: string; cuando: string; modelo: string; fijos: { marca: string; error?: string } | null; opciones_error: string[]; error_defecto: string | null };
export const listaPlantillas = (): InfoPlantilla[] =>
  numerosPlantilla().map((n) => {
    const f = fijosDe(n);
    return { n, nombre: nombreDe(n), cuando: cuandoDe(n), modelo: modeloEjemploDe(n), fijos: f?.marca ? { marca: f.marca, ...(f.error ? { error: f.error } : {}) } : null, opciones_error: opcionesDe(n).map((o) => o.nombre), error_defecto: errorDefectoDe(n) ?? null };
  });

/** Textos de las plantillas: las ediciones del usuario (si hay) mandan sobre las originales. */
export type TextosPlantillas = Partial<Record<number, string>>;
const textoDe = (n: number, editadas?: TextosPlantillas) => {
  const t = editadas?.[n] ?? PLANTILLAS_DEFECTO[n];
  if (t === undefined) throw new ErrorTextos(`Falta el texto de la plantilla ${n}: escríbelo en la pestaña «Plantillas».`);
  return t;
};
/** Texto con el que arranca una plantilla original (las propias no tienen: se crean con una copia). */
export const textoOriginal = (n: number): string | undefined => PLANTILLAS_DEFECTO[n];

// ───────────────────────── qué plantilla corresponde ─────────────────────────
function familiaCanon(modelo: string): 3 | 4 | null {
  const m = /^G(\d)\d{3}$/i.exec(modelo);
  if (!m) return null;
  return "567".includes(m[1]) ? 3 : "1234".includes(m[1]) ? 4 : null;
}

export type DatosPlantilla = Pick<DatosVideo, "marca" | "modelo" | "error"> & Partial<Pick<DatosVideo, "modelo_texto" | "error_largo">>;

/** Número de plantilla (1-6) para {marca, modelo, error}, o null si ninguna aplica. */
export function elegirPlantilla(datos: DatosPlantilla): number | null {
  const marca = datos.marca;
  const modelo = String(datos.modelo).toUpperCase();
  const error = String(datos.error).toUpperCase();
  if (marca === "Epson") {
    if (EPSON_SIN_E11.has(modelo)) return ["ALMOHADILLAS", "ALMOHADILLA", "E-11", "E11", "TAMPÓN", "TAMPON"].includes(error) ? 1 : null;
    if (["E-11", "E11", "TAMPÓN", "TAMPON"].includes(error)) return 2;
    if (["ALMOHADILLAS", "ALMOHADILLA"].includes(error)) return EPSON_CON_PANTALLA.has(modelo) ? 2 : 1;
    return null;
  }
  if (marca === "Canon") {
    const f = familiaCanon(modelo);
    if (f === 3) return ["5B00", "1700"].includes(error) ? 3 : null;
    if (f === 4) return ["5B00", "1700", "E08", "P07"].includes(error) ? 4 : null;
    return null;
  }
  if (marca === "Epson-SC") {
    if (!PLOTTERS_CON_PLANTILLA.has(modelo)) return null;
    if (error === "0014BD") return 5;
    return Object.keys(erroresDe(6) ?? {}).some((o) => o.toUpperCase() === error) ? 6 : null;
  }
  return null;
}

/** El error tal como aparece en la lista de la plantilla (sin importar mayúsculas ni tilde). */
export function errorDeLaLista(numero: number | null, error: string): string {
  const opciones = numero ? erroresDe(numero) : undefined;
  if (!opciones) return String(error ?? "").trim();
  if (!String(error ?? "").trim() && numero && errorDefectoDe(numero)) return errorDefectoDe(numero)!;
  const limpio = (v: string) => String(v).trim().toUpperCase().replace(/Ó/g, "O");
  for (const nombre of Object.keys(opciones)) if (limpio(nombre) === limpio(error)) return nombre;
  throw new ErrorTextos(`Elige el error de la lista: ${Object.keys(opciones).join(", ")}.`);
}

/** El error como va en el enlace de WhatsApp. */
export function errorParaEnlace(error: string, numero: number): string {
  const lista = erroresDe(numero);
  if (lista) {
    try {
      return lista[errorDeLaLista(numero, error)];
    } catch {
      return lista[errorPorDefecto(numero)] ?? errorPorDefecto(numero);
    }
  }
  const e = String(error ?? "").trim().replace(/\s+/g, "-");
  if (!e) return errorPorDefecto(numero);
  if (["ALMOHADILLA", "ALMOHADILLAS"].includes(e.toUpperCase())) return "Almohadillas";
  return e.toUpperCase();
}

// ───────────────────────── leer y completar las plantillas ─────────────────────────
export type PlantillaLeida = { titulos: string[]; etiquetas: string; descripcion: string };

/** Separa el texto de una plantilla en sus tres secciones. */
export function parsearPlantilla(texto: string, numero: number | string = "?"): PlantillaLeida {
  const partes = texto.replace(/\r\n/g, "\n").split(/^---(TITULOS|ETIQUETAS|DESCRIPCION)---[ \t]*$/m);
  const secciones: Record<string, string> = {};
  for (let i = 1; i < partes.length - 1; i += 2) secciones[partes[i]] = partes[i + 1].replace(/^\n+|\n+$/g, "");
  const claves = Object.keys(secciones);
  if (claves.length !== 3 || !["TITULOS", "ETIQUETAS", "DESCRIPCION"].every((k) => k in secciones)) {
    throw new ErrorTextos(`La plantilla ${numero} debe tener las secciones ---TITULOS---, ---ETIQUETAS--- y ---DESCRIPCION---.`);
  }
  const titulos = secciones.TITULOS.split("\n").map((t) => t.trim()).filter(Boolean);
  if (!titulos.length) throw new ErrorTextos(`La plantilla ${numero} no tiene títulos.`);
  if (!secciones.DESCRIPCION.trim()) throw new ErrorTextos(`La plantilla ${numero} no tiene descripción.`);
  return { titulos, etiquetas: secciones.ETIQUETAS.trim(), descripcion: secciones.DESCRIPCION.trim() };
}

/** {error} y {idvideo} completan el enlace de WhatsApp; {modelo} MAYÚSCULAS con guion · {modelo_l} minúsculas · {modelo_h} sin guion (hashtags). */
/** Valor de cada variable: el elegido (si está en su lista) o el que viene marcado. */
export function valoresDeVariables(elegidos?: Record<string, string>): Record<string, string> {
  const r: Record<string, string> = {};
  for (const v of cfg.variables) r[v.clave] = elegidos?.[v.clave] !== undefined && v.valores.includes(elegidos[v.clave]) ? elegidos[v.clave] : v.defecto;
  return r;
}
/** «Diagnóstico de red» → «DiagnosticoDeRed» (para hashtags). */
const paraHashtag = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ""));

export function rellenar(texto: string, modelo: string, error = "", video = "", errorTexto = "", variables: Record<string, string> = valoresDeVariables()): string {
  for (const [clave, valor] of Object.entries(variables)) {
    texto = texto.split(`{${clave}_h}`).join(paraHashtag(valor)).split(`{${clave}_l}`).join(valor.toLowerCase()).split(`{${clave}}`).join(valor);
  }
  return texto
    .split("{modelo_l}").join(modelo.toLowerCase())
    .split("{modelo_h}").join(modelo.replace(/-/g, ""))
    .split("{modelo}").join(modelo)
    .split("{error_texto}").join(errorTexto)
    .split("{error_h}").join(errorTexto.replace(/[^A-Za-z0-9]/g, ""))
    .split("{error}").join(error)
    .split("?v={idvideo}").join(video ? `?v=${video}` : "")
    .split("{idvideo}").join(video);
}

/** Caracteres que cuenta YouTube: cada etiqueta con espacios lleva comillas (+2) y entre etiquetas va una coma. */
export const largoEtiquetas = (etiquetas: string[]) => etiquetas.reduce((a, e) => a + largo(e) + (e.includes(" ") ? 2 : 0), 0) + Math.max(0, etiquetas.length - 1);

function etiquetasDe(texto: string): { etiquetas: string[]; recortadas: number } {
  let etiquetas = [...new Set(texto.split(",").map((e) => e.trim()).filter(Boolean))];
  let recortadas = 0;
  while (largoEtiquetas(etiquetas) > LIMITE_ETIQUETAS && etiquetas.length > 1) {
    etiquetas = etiquetas.slice(0, -1);
    recortadas++;
  }
  return { etiquetas, recortadas };
}

export type VistaPlantilla = { titulos: string[]; etiquetas: string[]; etiquetas_largo: number; descripcion: string; descripcion_largo: number; avisos: string[] };

/** Cómo quedaría una plantilla (aunque esté a medio editar) con un modelo dado, validando los límites de YouTube. */
export function vistaPlantilla(texto: string, modeloEntrada: string, numero: number | string = "?"): VistaPlantilla {
  const p = parsearPlantilla(texto, numero);
  const modelo = modeloEntrada.trim().toUpperCase();
  const error = typeof numero === "number" ? errorPorDefecto(numero) : "Almohadillas";
  const r = (t: string) => rellenar(t, modelo, error, "rdMXeYj8c7Y", error);
  const { etiquetas, recortadas } = etiquetasDe(r(p.etiquetas));
  const avisos: string[] = [];
  p.titulos.forEach((t0, i) => {
    const t = r(t0);
    if (largo(t) > LIMITE_TITULO) avisos.push(`El título ${i + 1} tiene ${largo(t)} caracteres (máximo ${LIMITE_TITULO}).`);
    if (t.includes("<") || t.includes(">")) avisos.push(`El título ${i + 1} lleva < o >, que YouTube no admite.`);
  });
  const desc = r(p.descripcion);
  if (largo(desc) > LIMITE_DESCRIPCION) avisos.push(`La descripción tiene ${largo(desc)} caracteres (máximo ${LIMITE_DESCRIPCION}).`);
  if (!p.descripcion.includes("{modelo") && !p.titulos.join("").includes("{modelo")) avisos.push("La plantilla no usa {modelo}: todos los videos llevarían el mismo texto.");
  if (recortadas) avisos.push(`Con este modelo se quitarían ${recortadas} etiqueta(s) del final por el límite de YouTube.`);
  const conocidos = new Set(["{modelo}", "{modelo_l}", "{modelo_h}", "{error}", "{idvideo}", "{error_texto}", "{error_h}", ...cfg.variables.flatMap((v) => [`{${v.clave}}`, `{${v.clave}_l}`, `{${v.clave}_h}`])]);
  const sobrantes = [...new Set((desc + p.titulos.join("") + p.etiquetas).match(/\{[a-z][a-z0-9_]*\}/g) ?? [])].filter((m) => !conocidos.has(m)).sort();
  if (sobrantes.length) avisos.push(`Marcadores desconocidos (no se reemplazarán): ${sobrantes.join(", ")}.`);
  return { titulos: p.titulos.map(r), etiquetas, etiquetas_largo: largoEtiquetas(etiquetas), descripcion: desc, descripcion_largo: largo(desc), avisos };
}

/** Comprueba que el texto de una plantilla editada es válido (lanza ErrorTextos si no). */
export const validarPlantilla = (numero: number, texto: string) => vistaPlantilla(texto, modeloEjemploDe(numero), numero);

// ───────────────────────── generar los textos ─────────────────────────
export type Textos = {
  plantilla: number;
  sugerida: number | null;
  nombre_plantilla: string;
  titulo_n: number;
  titulo: string;
  titulos: string[];
  descripcion: string;
  avisos: string[];
  etiquetas: string[];
  falta_video: boolean;
  etiquetas_recortadas: number;
};

function avisosPlantilla(numero: number, errorTexto: string): string[] {
  const base = ERROR_BASE_PLANTILLA[numero];
  if (base && errorTexto.toLowerCase() !== base.toLowerCase()) {
    return [`La plantilla ${numero} está redactada para el aviso ${base} («muy pronto se va a bloquear»). Con «${errorTexto}» solo cambia el código en el texto, no la explicación: revisa el texto antes de aplicar o edita la plantilla.`];
  }
  return [];
}

/** Revisa los límites de YouTube y que no quede ningún marcador sin reemplazar. */
export function validarTextos(t: Pick<Textos, "titulo" | "descripcion" | "etiquetas">): void {
  if (largo(t.titulo) > LIMITE_TITULO) throw new ErrorTextos(`El título tiene ${largo(t.titulo)} caracteres (máximo ${LIMITE_TITULO}).`);
  if (largo(t.descripcion) > LIMITE_DESCRIPCION) throw new ErrorTextos(`La descripción tiene ${largo(t.descripcion)} caracteres (máximo ${LIMITE_DESCRIPCION}).`);
  if (largoEtiquetas(t.etiquetas) > LIMITE_ETIQUETAS) throw new ErrorTextos(`Las etiquetas suman ${largoEtiquetas(t.etiquetas)} caracteres (máximo ${LIMITE_ETIQUETAS}).`);
  for (const campo of ["titulo", "descripcion"] as const) if (t[campo].includes("{modelo")) throw new ErrorTextos(`Quedó un marcador sin reemplazar en ${campo}.`);
  if (t.titulo.includes("<") || t.titulo.includes(">")) throw new ErrorTextos("YouTube no admite los signos < ni > en el título.");
}

export type OpcionesGenerar = { tituloN?: number | null; semilla?: string; plantilla?: number | null; videoId?: string | null; editadas?: TextosPlantillas; variables?: Record<string, string> };

/** Textos listos para YouTube, o null si el video no encaja en ninguna plantilla. */
export function generarTextos(datos: DatosPlantilla, o: OpcionesGenerar = {}): Textos | null {
  const sugerida = elegirPlantilla(datos);
  const numero = o.plantilla ?? sugerida;
  if (numero == null) return null;
  if (!esNumeroValido(numero)) throw new ErrorTextos("Esa plantilla no existe.");
  const p = parsearPlantilla(textoDe(numero, o.editadas), numero);
  const modelo = String(datos.modelo_texto || datos.modelo).toUpperCase();
  const errorEnlace = errorParaEnlace(datos.error ?? "", numero);
  const errorTexto = erroresDe(numero) ? errorDeLaLista(numero, datos.error ?? "") : String(datos.error ?? "").trim() || errorPorDefecto(numero);
  const video = o.videoId || "";
  let i: number;
  if (o.tituloN != null) {
    if (o.tituloN < 1 || o.tituloN > p.titulos.length) throw new ErrorTextos(`El título debe ser un número entre 1 y ${p.titulos.length}.`);
    i = o.tituloN - 1;
  } else {
    i = [...(o.semilla || modelo)].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0) % p.titulos.length;
  }
  const vars = valoresDeVariables(o.variables);
  const r = (t: string) => rellenar(t, modelo, errorEnlace, video, errorTexto, vars);
  const { etiquetas, recortadas } = etiquetasDe(r(p.etiquetas));
  const textos: Textos = {
    plantilla: numero,
    sugerida,
    nombre_plantilla: nombreDe(numero),
    titulo_n: i + 1,
    titulo: r(p.titulos[i]),
    titulos: p.titulos.map(r),
    descripcion: r(p.descripcion),
    avisos: avisosPlantilla(numero, errorTexto),
    etiquetas,
    falta_video: !o.videoId,
    etiquetas_recortadas: recortadas,
  };
  validarTextos(textos);
  return textos;
}

// ───────────────────────── datos escritos a mano ─────────────────────────
export type EntradaManual = { plantilla?: string | number | null; marca?: string; modelo?: string; error?: string };

/** Número de plantilla elegido en el menú («auto» o vacío = ninguna). */
export function plantillaElegida(v: EntradaManual["plantilla"]): number | null {
  if (v === undefined || v === null || v === "" || v === "auto" || v === 0 || v === "0") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || !esNumeroValido(n)) throw new ErrorTextos("Esa plantilla no existe.");
  return n;
}

/** Marca, modelo y error escritos a mano, ya limpios. null si no se escribió nada. */
export function datosManual(d: EntradaManual): DatosVideo | null {
  const plantilla = plantillaElegida(d.plantilla);
  const fijos = fijosDe(plantilla);
  let marca = String(d.marca ?? "").trim();
  let error = String(d.error ?? "").trim();
  const modelo = String(d.modelo ?? "").trim();
  if (fijos) {
    if (fijos.marca) marca = fijos.marca;
    if (fijos.error) error = fijos.error;
  }
  if (plantilla && erroresDe(plantilla)) error = errorDeLaLista(plantilla, error);
  if (!(marca || modelo || error)) return null;
  const marcaOk = marcasValidas()[marca.toUpperCase()];
  if (!marcaOk) throw new ErrorTextos("Elige la marca: " + cfg.marcas.filter((m) => !m.oculta).map((m) => m.nombre).join(", ") + ".");
  if (!/^[A-Za-z0-9-]{2,12}$/.test(modelo)) throw new ErrorTextos("Escribe el modelo, p. ej. L4150, G6010 o F570 (letras, números y guion).");
  if (!/^[A-Za-z0-9 ./áéíóúüñÁÉÍÓÚÜÑ-]{0,30}$/.test(error)) throw new ErrorTextos("El error solo puede llevar letras, números, espacio, punto, guion y barra.");
  return { marca: marcaOk, modelo: modelo.toUpperCase().replace(/-/g, ""), modelo_texto: modelo.toUpperCase(), error: error.toUpperCase(), error_largo: error };
}
