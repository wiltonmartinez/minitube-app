// Repositorio de imágenes de error ("Menú de Error"): public/Assets/errores
// Contiene dos tipos de capturas:
//   · por código de servicio Epson:  epson-sc-<código>.png   (p. ej. epson-sc-0014bd.png)
//   · por modelo de impresora:       <Modelo>.png            (p. ej. L3250.png, G6010.png)
// La lista de archivos se genera con `npm run gen:error-images`.
import { ERROR_IMAGE_FILES } from "./error-images.generated";

export const ERROR_IMAGES_DIR = "/Assets/errores";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const baseName = (file: string) => file.replace(/\.[^.]+$/, "");

// clave normalizada (sin guiones ni mayúsculas) → nombre de archivo existente
const FILE_BY_KEY = new Map<string, string>(ERROR_IMAGE_FILES.map((f) => [norm(baseName(f)), f]));

const pathFor = (file: string) => `${ERROR_IMAGES_DIR}/${encodeURIComponent(file)}`;

/** Ruta pública de un archivo del repositorio a partir de su nombre base (null si no existe). */
function pathByBaseName(base: string): string | null {
  const file = FILE_BY_KEY.get(norm(base));
  return file ? pathFor(file) : null;
}

/**
 * Diccionario "Tipo de error" (Bloque 1) → imagen dedicada del repositorio.
 *  · Códigos de servicio Epson: tienen su propia captura (epson-sc-<código>).
 *  · null: no hay imagen dedicada por tipo de error. Para Almohadillas / 5b00 se usa la captura del
 *    MODELO (ver resolveErrorImagePath); para E-11, 5b02 y 1700 no existe ninguna imagen todavía.
 */
const EPSON_CODE_TO_BASE: Record<string, string | null> = {
  Almohadillas: null,
  "Error Almohadillas": null,
  "E-11": null,
  "Error E-11": null,
  "5b00": null,
  "Error 5b00": null,
  "Codigo 5b00": null,
  "5b02": null,
  "Error 5b02": null,
  "1700": null,
  "Error 1700": null,
  "0014BD": "epson-sc-0014bd",
  "Error 0014bd": "epson-sc-0014bd",
  "00000001": "epson-sc-00000001",
  "00000004": "epson-sc-00000004",
  "00000008": "epson-sc-00000008",
  "0000000C": "epson-sc-0000000c",
  "00010000": "epson-sc-00010000",
  "00040000": "epson-sc-00040000",
  "00080000": "epson-sc-00080000",
  "000C0000": "epson-sc-000c0000",
};

export const ERROR_IMAGE_BY_TYPE: Record<string, string | null> = Object.fromEntries(
  Object.entries(EPSON_CODE_TO_BASE).map(([tipo, base]) => [tipo, base ? pathByBaseName(base) : null]),
);

// Las capturas por modelo (L3250.png, G6010.png…) muestran el aviso de almohadillas de tinta
// (Epson: «Servicio requerido…», Canon: código 5B00). Solo sirven para estos tipos de error;
// con E-11, 5b02 o 1700 usarlas pondría el mensaje equivocado sobre la pantalla verde.
const MODEL_IMAGE_ERRORS = new Set(
  ["Almohadillas", "Error Almohadillas", "5b00", "Error 5b00", "Codigo 5b00"].map(norm),
);

export type ErrorImageQuery = { marca: string; modelo: string; error: string };

/**
 * Devuelve la ruta pública (relativa) de la imagen de error, o null si no hay ninguna:
 *  1. Códigos de servicio Epson → diccionario por tipo de error (también si se escribe a mano en «Otro»).
 *  2. Almohadillas / 5b00 → captura del modelo (L3250.png, G6010.png…).
 *  3. Cualquier otro caso (E-11, 5b02, 1700…) → null: no hay imagen que mostrar.
 */
export function resolveErrorImagePath({ marca, modelo, error }: ErrorImageQuery): string | null {
  const isEpson = marca.trim().toLowerCase() === "epson";
  const tipo = error.trim();

  if (isEpson) {
    // 1) diccionario exacto (distingue mayúsculas de las opciones del select)
    if (tipo in ERROR_IMAGE_BY_TYPE && ERROR_IMAGE_BY_TYPE[tipo]) return ERROR_IMAGE_BY_TYPE[tipo];
    // 2) código de servicio escrito a mano: "Error 00080000", "0014bd"…
    const code = tipo.toLowerCase().replace(/^(error|c[oó]digo)\s+/, "");
    const porCodigo = pathByBaseName(`epson-sc-${code}`);
    if (porCodigo) return porCodigo;
  }

  // 3) imagen del modelo, solo para errores de almohadillas / 5b00
  if (!MODEL_IMAGE_ERRORS.has(norm(tipo))) return null;

  // (se ignora la marca si venía escrita en el modelo: "Epson L3250")
  const m = modelo.trim();
  const model = m.toLowerCase().startsWith(marca.trim().toLowerCase())
    ? m.slice(marca.trim().length).trim()
    : m;
  return model ? pathByBaseName(model) : null;
}
