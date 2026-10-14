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
import { PLANTILLAS_DEFECTO } from "./plantillas-defecto";

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

export const NUMEROS = [1, 2, 3, 4, 5, 6] as const;
export type NumeroPlantilla = (typeof NUMEROS)[number];

/** Datos que una plantilla trae por defecto: al elegirla no se piden. */
export const PLANTILLA_FIJA: Partial<Record<number, { marca: string; error?: string }>> = {
  1: { marca: "Epson", error: "Almohadillas" },
  2: { marca: "Epson" },
  3: { marca: "Canon" },
  4: { marca: "Canon" },
  5: { marca: "Epson-SC", error: "0014BD" },
  6: { marca: "Epson-SC" },
};

/** Errores que se eligen de una lista cerrada → cómo van en el enlace de WhatsApp. */
export const PLANTILLA_ERRORES: Partial<Record<number, Record<string, string>>> = {
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
export const PLANTILLA_ERROR_DEFECTO: Partial<Record<number, string>> = { 2: "Combinado", 3: "Combinado", 4: "Combinado" };
export const ERROR_POR_DEFECTO: Record<number, string> = { 1: "Almohadillas", 2: "Almohadillas", 3: "5B00", 4: "5B00", 5: "0014BD", 6: "00000008" };
export const MODELO_EJEMPLO: Record<number, string> = { 1: "L4150", 2: "L4160", 3: "G6010", 4: "G3110", 5: "F570", 6: "F570" };
export const NOMBRES: Record<number, string> = {
  1: "Epson · Almohadillas",
  2: "Epson (pantalla) · E-11 / Almohadillas",
  3: "Canon G5xxx–G7xxx · 5B00 / 1700",
  4: "Canon G1xxx–G4xxx · P07 / E08 / 5B00",
  5: "Epson SureColor · 0014BD",
  6: "Epson SureColor · aviso 000x000x",
};
export const CUANDO: Record<number, string> = {
  1: "Epson sin E-11 · Almohadillas (p. ej. L4150)",
  2: "Epson con pantalla · E-11 / Tampón / Almohadillas (p. ej. L4160)",
  3: "Canon G5xxx–G7xxx · 5B00 / 1700 / combinado (no 5B02, E08 ni P07)",
  4: "Canon G1xxx–G4xxx · 5B00 / P07 y 1700 / E08, o combinado",
  5: "Epson SureColor F570 / F571 · error 0014BD",
  6: "Epson SureColor F570 / F571 · aviso 000x000x",
};
export const MARCAS_VALIDAS: Record<string, string> = { EPSON: "Epson", CANON: "Canon", "EPSON-SC": "Epson-SC", "EPSON SC": "Epson-SC", EPSONSC: "Epson-SC" };

export type InfoPlantilla = { n: number; nombre: string; cuando: string; modelo: string; fijos: { marca: string; error?: string } | null; opciones_error: string[]; error_defecto: string | null };
export const listaPlantillas = (): InfoPlantilla[] =>
  NUMEROS.map((n) => ({ n, nombre: NOMBRES[n], cuando: CUANDO[n], modelo: MODELO_EJEMPLO[n], fijos: PLANTILLA_FIJA[n] ?? null, opciones_error: Object.keys(PLANTILLA_ERRORES[n] ?? {}), error_defecto: PLANTILLA_ERROR_DEFECTO[n] ?? null }));

/** Textos de las plantillas: las ediciones del usuario (si hay) mandan sobre las originales. */
export type TextosPlantillas = Partial<Record<number, string>>;
const textoDe = (n: number, editadas?: TextosPlantillas) => editadas?.[n] ?? PLANTILLAS_DEFECTO[n];

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
    return Object.keys(PLANTILLA_ERRORES[6]!).some((o) => o.toUpperCase() === error) ? 6 : null;
  }
  return null;
}

/** El error tal como aparece en la lista de la plantilla (sin importar mayúsculas ni tilde). */
export function errorDeLaLista(numero: number | null, error: string): string {
  const opciones = numero ? PLANTILLA_ERRORES[numero] : undefined;
  if (!opciones) return String(error ?? "").trim();
  if (!String(error ?? "").trim() && numero && PLANTILLA_ERROR_DEFECTO[numero]) return PLANTILLA_ERROR_DEFECTO[numero]!;
  const limpio = (v: string) => String(v).trim().toUpperCase().replace(/Ó/g, "O");
  for (const nombre of Object.keys(opciones)) if (limpio(nombre) === limpio(error)) return nombre;
  throw new ErrorTextos(`Elige el error de la lista: ${Object.keys(opciones).join(", ")}.`);
}

/** El error como va en el enlace de WhatsApp. */
export function errorParaEnlace(error: string, numero: number): string {
  const lista = PLANTILLA_ERRORES[numero];
  if (lista) {
    try {
      return lista[errorDeLaLista(numero, error)];
    } catch {
      return ERROR_POR_DEFECTO[numero];
    }
  }
  const e = String(error ?? "").trim().replace(/\s+/g, "-");
  if (!e) return ERROR_POR_DEFECTO[numero];
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
export function rellenar(texto: string, modelo: string, error = "", video = "", errorTexto = ""): string {
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
  const error = (typeof numero === "number" ? ERROR_POR_DEFECTO[numero] : undefined) ?? "Almohadillas";
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
  const conocidos = new Set(["{modelo}", "{modelo_l}", "{modelo_h}", "{error}", "{idvideo}", "{error_texto}", "{error_h}"]);
  const sobrantes = [...new Set((desc + p.titulos.join("") + p.etiquetas).match(/\{[a-z_]+\}/g) ?? [])].filter((m) => !conocidos.has(m)).sort();
  if (sobrantes.length) avisos.push(`Marcadores desconocidos (no se reemplazarán): ${sobrantes.join(", ")}.`);
  return { titulos: p.titulos.map(r), etiquetas, etiquetas_largo: largoEtiquetas(etiquetas), descripcion: desc, descripcion_largo: largo(desc), avisos };
}

/** Comprueba que el texto de una plantilla editada es válido (lanza ErrorTextos si no). */
export const validarPlantilla = (numero: number, texto: string) => vistaPlantilla(texto, MODELO_EJEMPLO[numero], numero);

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

export type OpcionesGenerar = { tituloN?: number | null; semilla?: string; plantilla?: number | null; videoId?: string | null; editadas?: TextosPlantillas };

/** Textos listos para YouTube, o null si el video no encaja en ninguna plantilla. */
export function generarTextos(datos: DatosPlantilla, o: OpcionesGenerar = {}): Textos | null {
  const sugerida = elegirPlantilla(datos);
  const numero = o.plantilla ?? sugerida;
  if (numero == null) return null;
  if (!(NUMEROS as readonly number[]).includes(numero)) throw new ErrorTextos(`La plantilla debe ser un número del 1 al ${NUMEROS.length}.`);
  const p = parsearPlantilla(textoDe(numero, o.editadas), numero);
  const modelo = String(datos.modelo_texto || datos.modelo).toUpperCase();
  const errorEnlace = errorParaEnlace(datos.error ?? "", numero);
  const errorTexto = PLANTILLA_ERRORES[numero] ? errorDeLaLista(numero, datos.error ?? "") : String(datos.error ?? "").trim() || ERROR_POR_DEFECTO[numero];
  const video = o.videoId || "";
  let i: number;
  if (o.tituloN != null) {
    if (o.tituloN < 1 || o.tituloN > p.titulos.length) throw new ErrorTextos(`El título debe ser un número entre 1 y ${p.titulos.length}.`);
    i = o.tituloN - 1;
  } else {
    i = [...(o.semilla || modelo)].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0) % p.titulos.length;
  }
  const r = (t: string) => rellenar(t, modelo, errorEnlace, video, errorTexto);
  const { etiquetas, recortadas } = etiquetasDe(r(p.etiquetas));
  const textos: Textos = {
    plantilla: numero,
    sugerida,
    nombre_plantilla: NOMBRES[numero],
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
  if (!Number.isInteger(n) || !(NUMEROS as readonly number[]).includes(n)) throw new ErrorTextos(`La plantilla debe ser un número del 1 al ${NUMEROS.length}.`);
  return n;
}

/** Marca, modelo y error escritos a mano, ya limpios. null si no se escribió nada. */
export function datosManual(d: EntradaManual): DatosVideo | null {
  const plantilla = plantillaElegida(d.plantilla);
  const fijos = plantilla ? PLANTILLA_FIJA[plantilla] : undefined;
  let marca = String(d.marca ?? "").trim();
  let error = String(d.error ?? "").trim();
  const modelo = String(d.modelo ?? "").trim();
  if (fijos) {
    marca = fijos.marca;
    if (fijos.error) error = fijos.error;
  }
  if (plantilla && PLANTILLA_ERRORES[plantilla]) error = errorDeLaLista(plantilla, error);
  if (!(marca || modelo || error)) return null;
  const marcaOk = MARCAS_VALIDAS[marca.toUpperCase()];
  if (!marcaOk) throw new ErrorTextos("Elige la marca: Epson, Canon o Epson SureColor.");
  if (!/^[A-Za-z0-9-]{2,12}$/.test(modelo)) throw new ErrorTextos("Escribe el modelo, p. ej. L4150, G6010 o F570 (letras, números y guion).");
  if (!/^[A-Za-z0-9 ./áéíóúüñÁÉÍÓÚÜÑ-]{0,30}$/.test(error)) throw new ErrorTextos("El error solo puede llevar letras, números, espacio, punto, guion y barra.");
  return { marca: marcaOk, modelo: modelo.toUpperCase().replace(/-/g, ""), modelo_texto: modelo.toUpperCase(), error: error.toUpperCase(), error_largo: error };
}
