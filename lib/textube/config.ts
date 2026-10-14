// Configuración editable de TexTUBE (menús: marcas, errores sugeridos, opciones de error por plantilla y plantillas propias).
// Se guarda en el navegador y se puede exportar/importar como archivo. Sin cambios, todo es igual a Gestor TUBE.

export type OpcionError = { nombre: string; enlace: string };
export type MarcaCfg = { valor: string; nombre: string; propia?: boolean; oculta?: boolean };
export type PlantillaPropia = { n: number; nombre: string; cuando: string; modelo: string; marca: string; error: string; opciones: OpcionError[]; opcionDefecto: string };

/** Variable propia que se puede usar en las plantillas con su marcador: «{accion}» (valor tal cual), «{accion_l}» (minúsculas) y «{accion_h}» (sin espacios ni tildes, para hashtags). */
export type VariableCfg = { clave: string; nombre: string; valores: string[]; defecto: string };

/** Marcadores que ya usan las plantillas: una variable no puede llamarse igual. */
export const CLAVES_RESERVADAS = ["modelo", "modelo_l", "modelo_h", "error", "error_texto", "error_h", "idvideo"];
export const MAX_VARIABLES = 20;
export const MAX_VALORES = 40;
export const claveValida = (c: string) => /^[a-z][a-z0-9]{0,19}$/.test(c) && !CLAVES_RESERVADAS.some((r) => r === c || r.startsWith(c + "_"));

/** A partir de un nombre («Acción», «Tipo de servicio») saca el marcador: «accion», «tiposervicio»… (minúsculas, sin tildes ni espacios). */
export const claveDeNombre = (nombre: string) =>
  nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/^[0-9]+/, "").slice(0, 20);

export type Config = {
  version: 1;
  marcas: MarcaCfg[];
  errores: string[];
  /** Opciones de error de una plantilla original (2, 3, 4, 6) cuando el usuario las cambió */
  opcionesError: Partial<Record<number, OpcionError[]>>;
  opcionDefecto: Partial<Record<number, string>>;
  /** Nombre y «se usa con» cambiados en las plantillas originales */
  nombres: Partial<Record<number, { nombre?: string; cuando?: string }>>;
  propias: PlantillaPropia[];
  variables: VariableCfg[];
};

export const MARCAS_BASE: MarcaCfg[] = [
  { valor: "Epson", nombre: "Epson" },
  { valor: "Canon", nombre: "Canon" },
  { valor: "Epson-SC", nombre: "Epson SureColor" },
];
export const ERRORES_BASE = ["Almohadillas", "E-11", "5B00", "1700", "P07", "E08", "0014BD", "00000008"];
export const PRIMERA_PROPIA = 7;
export const MAX_PROPIAS = 30;

/** La variable con la que arranca la app: «Acción» → {accion}. Si ninguna plantilla la usa, no cambia nada. */
export const VARIABLES_BASE: VariableCfg[] = [{ clave: "accion", nombre: "Acción", valores: ["Reset", "Diagnóstico", "Activación"], defecto: "Reset" }];

export const configVacia = (): Config => ({ version: 1, marcas: MARCAS_BASE.map((m) => ({ ...m })), errores: [...ERRORES_BASE], opcionesError: {}, opcionDefecto: {}, nombres: {}, propias: [], variables: VARIABLES_BASE.map((v) => ({ ...v, valores: [...v.valores] })) });

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
const listaOpciones = (v: unknown): OpcionError[] =>
  Array.isArray(v)
    ? v.map((o) => ({ nombre: texto((o as OpcionError)?.nombre, 40), enlace: texto((o as OpcionError)?.enlace, 40) })).filter((o) => o.nombre).map((o) => ({ nombre: o.nombre, enlace: o.enlace || o.nombre })).slice(0, 60)
    : [];

/** Valida y completa lo que venga del navegador o de un archivo importado: lo que falte o esté mal vuelve al valor original. */
export function normalizarConfig(x: unknown): Config {
  const base = configVacia();
  if (!x || typeof x !== "object") return base;
  const o = x as Partial<Config>;
  // marcas: las 3 originales siempre existen (se pueden renombrar u ocultar); las propias se conservan
  const marcas: MarcaCfg[] = base.marcas.map((m) => {
    const g = Array.isArray(o.marcas) ? o.marcas.find((y) => y?.valor === m.valor && !y.propia) : undefined;
    return { ...m, nombre: texto(g?.nombre, 40) || m.nombre, oculta: g?.oculta ? true : undefined };
  });
  if (Array.isArray(o.marcas)) {
    for (const g of o.marcas) {
      const valor = texto(g?.valor, 30);
      if (g?.propia && valor && /^[A-Za-z0-9 ._-]+$/.test(valor) && !marcas.some((m) => m.valor.toLowerCase() === valor.toLowerCase())) marcas.push({ valor, nombre: texto(g.nombre, 40) || valor, propia: true });
    }
  }
  const errores = Array.isArray(o.errores) ? [...new Set(o.errores.map((e) => texto(e, 30)).filter(Boolean))].slice(0, 80) : base.errores;
  const opcionesError: Config["opcionesError"] = {};
  if (o.opcionesError && typeof o.opcionesError === "object") for (const [k, v] of Object.entries(o.opcionesError)) if (Number(k) >= 1 && Number(k) < PRIMERA_PROPIA) opcionesError[Number(k)] = listaOpciones(v);
  const opcionDefecto: Config["opcionDefecto"] = {};
  if (o.opcionDefecto && typeof o.opcionDefecto === "object") for (const [k, v] of Object.entries(o.opcionDefecto)) if (typeof v === "string") opcionDefecto[Number(k)] = texto(v, 40);
  const nombres: Config["nombres"] = {};
  if (o.nombres && typeof o.nombres === "object") {
    for (const [k, v] of Object.entries(o.nombres)) {
      if (Number(k) >= 1 && Number(k) < PRIMERA_PROPIA && v && typeof v === "object") nombres[Number(k)] = { nombre: texto(v.nombre, 60) || undefined, cuando: texto(v.cuando, 160) || undefined };
    }
  }
  const usados = new Set<number>();
  const propias: PlantillaPropia[] = [];
  if (Array.isArray(o.propias)) {
    for (const p of o.propias.slice(0, MAX_PROPIAS)) {
      const n = Number(p?.n);
      if (!Number.isInteger(n) || n < PRIMERA_PROPIA || n > 999 || usados.has(n)) continue;
      usados.add(n);
      const opciones = listaOpciones(p.opciones);
      const opcionDef = texto(p.opcionDefecto, 40);
      propias.push({ n, nombre: texto(p.nombre, 60) || `Plantilla ${n}`, cuando: texto(p.cuando, 160) || "Plantilla propia (se elige a mano)", modelo: texto(p.modelo, 12) || "L4150", marca: texto(p.marca, 30), error: texto(p.error, 30), opciones, opcionDefecto: opciones.some((x) => x.nombre === opcionDef) ? opcionDef : "" });
    }
  }
  // variables propias: marcador válido y distinto, hasta 40 valores sin repetir; el valor por defecto siempre es uno de la lista
  let variables: VariableCfg[];
  if (Array.isArray(o.variables)) {
    const vistas = new Set<string>();
    variables = [];
    for (const v of o.variables.slice(0, MAX_VARIABLES)) {
      const clave = texto(v?.clave, 20).toLowerCase();
      if (!claveValida(clave) || vistas.has(clave)) continue;
      vistas.add(clave);
      const valores = [...new Set((Array.isArray(v.valores) ? v.valores : []).map((x) => texto(x, 60)).filter(Boolean))].slice(0, MAX_VALORES);
      const defecto = texto(v.defecto, 60);
      variables.push({ clave, nombre: texto(v.nombre, 40) || clave, valores, defecto: valores.includes(defecto) ? defecto : (valores[0] ?? "") });
    }
  } else variables = base.variables;
  return { version: 1, marcas, errores, opcionesError, opcionDefecto, nombres, propias, variables };
}
