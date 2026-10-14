// Marca, modelo y error de un video, a partir de su título actual (port de datos_video.py de Gestor TUBE).

/** Epson con pantalla LCD: muestran E-11 en la pantalla. */
export const EPSON_CON_PANTALLA = new Set([
  "L4150", "L4160", "L4260", "L5190", "L5290",
  "L555", "L565", "L575", "L475",
  "L3260", "ET2820", "ET2750", "ET2760",
  "ET4700", "ET4800", "WF3720",
]);

export type DatosVideo = {
  marca: string;
  modelo: string;
  modelo_texto: string;
  error: string;
  error_largo: string;
};

const PLOTTER = /(F57[01]|T3170X?)/i;
const CANON = /(G\d{4}|MB\d{4}|MG\d{4})/i;
const EPSON = /(L\d{3,4}|ET-?\d{3,4}|WF-?\d{3,4}|XP-?\d{3,4})/i;
const LARGO_ALMOHADILLA = "Una almohadilla de tinta de la impresora está al final de su vida útil";

/** {marca, modelo, error} del título, o null si no se reconoce ningún modelo. */
export function extraerDatos(titulo: string): DatosVideo | null {
  let marca: string;
  let modelo: string | undefined;
  let modeloTexto: string | undefined;
  const plot = PLOTTER.exec(titulo);
  const canon = CANON.exec(titulo);
  if (plot) {
    marca = "Epson-SC";
    modelo = plot[1].toUpperCase();
  } else if (canon) {
    marca = "Canon";
    modelo = canon[1].toUpperCase();
  } else {
    marca = "Epson";
    const m = EPSON.exec(titulo);
    modelo = m ? m[1].toUpperCase().replace(/-/g, "") : undefined;
    modeloTexto = m ? m[1].toUpperCase() : undefined;
  }
  if (!modelo) return null;

  // Epson SureColor: códigos del contador (000x000x, p. ej. 00080000) y «reset pass admin»
  const scCodigo = marca === "Epson-SC" ? /\b(0014BD|000[0-9A-F]000[0-9A-F])\b/i.exec(titulo) : null;
  const scAdmin = marca === "Epson-SC" ? /reset\s+pass\s+admin/i.test(titulo) : false;
  const canonCodigo = marca === "Canon" ? /\b(5B02|P07|E08|1700)\b/i.exec(titulo) : null;
  let error: string;
  let errorLargo: string;
  if (scCodigo || scAdmin) {
    error = scCodigo ? scCodigo[1].toUpperCase() : "reset pass admin";
    errorLargo = error;
  } else if (canonCodigo) {
    error = canonCodigo[1].toUpperCase();
    errorLargo = error === "1700" ? "Código Asistencia 5B00" : error;
  } else if (/5B00/i.test(titulo)) {
    error = "5B00";
    errorLargo = "Código Asistencia 5B00";
  } else if (/E-?11/i.test(titulo)) {
    error = "E-11";
    errorLargo = LARGO_ALMOHADILLA;
  } else if (/(00000008|0014BD)/i.test(titulo)) {
    error = /(00000008|0014BD)/i.exec(titulo)![1].toUpperCase();
    errorLargo = error;
  } else if (marca === "Canon") {
    error = "5B00";
    errorLargo = "Código Asistencia 5B00";
  } else if (marca === "Epson" && EPSON_CON_PANTALLA.has(modelo)) {
    error = "E-11";
    errorLargo = LARGO_ALMOHADILLA;
  } else {
    error = "Almohadillas";
    errorLargo = LARGO_ALMOHADILLA;
  }
  return { marca, modelo, modelo_texto: modeloTexto ?? modelo, error, error_largo: errorLargo };
}

/** ID de 11 caracteres a partir de una URL de YouTube (watch, youtu.be, shorts, embed, live) o del propio ID. */
export function extraerVideoId(texto: string): string {
  const t = (texto ?? "").trim();
  const ID = /^[A-Za-z0-9_-]{11}$/;
  if (ID.test(t)) return t;
  if (/^https?:\/\//i.test(t) || /^(www\.|youtu)/i.test(t)) {
    try {
      const u = new URL(/^https?:/i.test(t) ? t : `https://${t}`);
      const host = u.hostname.toLowerCase();
      let candidato = "";
      if (host.endsWith("youtu.be")) candidato = u.pathname.replace(/^\/+|\/+$/g, "").split("/")[0] ?? "";
      else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        if (u.pathname === "/watch") candidato = u.searchParams.get("v") ?? "";
        else {
          const partes = u.pathname.split("/").filter(Boolean);
          if (partes.length >= 2 && ["shorts", "embed", "live", "v"].includes(partes[0])) candidato = partes[1];
        }
      }
      if (ID.test(candidato)) return candidato;
    } catch {
      /* dirección mal escrita: se cae al error de abajo */
    }
  }
  throw new Error("No pude reconocer el video. Pega la URL completa (https://www.youtube.com/watch?v=…) o el ID de 11 caracteres.");
}
