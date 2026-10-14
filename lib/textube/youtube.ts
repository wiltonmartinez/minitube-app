import "server-only";
// Conexión con la API de YouTube (solo en el servidor): lee un video y cambia su título, descripción y etiquetas.
// Credenciales en variables de entorno: YT_CLIENT_ID, YT_CLIENT_SECRET y YT_REFRESH_TOKEN (nunca llegan al navegador).
import { COSTO_CUOTA, LIMITE_DESCRIPCION, LIMITE_ETIQUETAS, LIMITE_TITULO, largo, largoEtiquetas } from "./plantillas";

export class ErrorYouTube extends Error {
  constructor(
    mensaje: string,
    readonly estado = 500,
  ) {
    super(mensaje);
  }
}

export type Snippet = { title?: string; description?: string; tags?: string[]; categoryId?: string; defaultLanguage?: string; defaultAudioLanguage?: string };

/** Lee una variable quitando espacios, saltos de línea y comillas que se cuelan al pegarla en Vercel. */
const credencial = (nombre: "YT_CLIENT_ID" | "YT_CLIENT_SECRET" | "YT_REFRESH_TOKEN") => (process.env[nombre] ?? "").trim().replace(/^["']|["']$/g, "").trim();

export const youtubeConfigurado = () => !!(credencial("YT_CLIENT_ID") && credencial("YT_CLIENT_SECRET") && credencial("YT_REFRESH_TOKEN"));

let cache: { token: string; hasta: number } | null = null;

/** Descarta el permiso temporal guardado (por ejemplo, tras renovar el permiso). */
export const olvidarTokenDeAcceso = () => {
  cache = null;
};

async function tokenDeAcceso(): Promise<string> {
  if (!youtubeConfigurado()) throw new ErrorYouTube("Falta la autorización de YouTube en el servidor (YT_CLIENT_ID, YT_CLIENT_SECRET y YT_REFRESH_TOKEN).", 503);
  if (cache && cache.hasta > Date.now() + 30_000) return cache.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: credencial("YT_CLIENT_ID"), client_secret: credencial("YT_CLIENT_SECRET"), refresh_token: credencial("YT_REFRESH_TOKEN"), grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new ErrorYouTube(`La autorización de YouTube venció o fue revocada: hay que volver a autorizarla.${typeof d.error === "string" ? ` (Google dice: ${d.error.slice(0, 40)})` : ""}`, 401);
  cache = { token: d.access_token, hasta: Date.now() + (Number(d.expires_in) || 3000) * 1000 };
  return cache.token;
}

/** Convierte un error de la API de Google en un mensaje claro en español. */
export function traducirError(estado: number, cuerpo: unknown): ErrorYouTube {
  const razon = (cuerpo as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]?.reason ?? "";
  let m: string;
  if (["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(razon)) m = "Se agotó la cuota diaria de la API de YouTube (se reinicia a medianoche, hora del Pacífico). Vuelve a intentar mañana.";
  else if (razon === "forbidden" || estado === 403) m = "YouTube no permite el cambio. Revisa que la cuenta autorizada sea la dueña del video.";
  else if (razon === "videoNotFound" || estado === 404) m = "No encontré ese video. Revisa el ID o la URL y que pertenezca al canal autorizado.";
  else if (estado === 401) m = "La autorización de YouTube venció o fue revocada: hay que volver a autorizarla.";
  else m = `YouTube devolvió un error inesperado (HTTP ${estado}${razon ? ", " + razon : ""}).`;
  return new ErrorYouTube(m, estado >= 400 && estado < 600 ? estado : 500);
}

async function llamar(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${await tokenDeAcceso()}`, "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw traducirError(r.status, d);
  return d;
}

/** El snippet actual del video (1 unidad de cuota). */
export async function leerVideo(id: string): Promise<Snippet> {
  const d = await llamar(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(id)}`);
  if (!d.items?.length) throw new ErrorYouTube("No encontré ese video en tu canal.", 404);
  return d.items[0].snippet as Snippet;
}

/** Snippet para videos.update: conserva todo lo del original (categoría, idioma…) y cambia solo lo pedido. */
export function snippetNuevo(original: Snippet, cambios: { titulo?: string; descripcion?: string; etiquetas?: string[] }): Snippet {
  const sn: Snippet = { title: original.title ?? "", description: original.description ?? "", categoryId: original.categoryId ?? "28" };
  if (original.tags) sn.tags = original.tags;
  if (original.defaultLanguage) sn.defaultLanguage = original.defaultLanguage;
  if (original.defaultAudioLanguage) sn.defaultAudioLanguage = original.defaultAudioLanguage;
  if (cambios.titulo !== undefined) sn.title = cambios.titulo;
  if (cambios.descripcion !== undefined) sn.description = cambios.descripcion;
  if (cambios.etiquetas !== undefined) sn.tags = cambios.etiquetas;
  return sn;
}

/** Revisa los límites de YouTube antes de enviar nada. */
export function validarCambios(c: { titulo?: unknown; descripcion?: unknown; etiquetas?: unknown }): { titulo?: string; descripcion?: string; etiquetas?: string[] } {
  const salida: { titulo?: string; descripcion?: string; etiquetas?: string[] } = {};
  if (c.titulo !== undefined) {
    if (typeof c.titulo !== "string" || !c.titulo.trim()) throw new ErrorYouTube("El título está vacío.", 400);
    if (largo(c.titulo) > LIMITE_TITULO) throw new ErrorYouTube(`El título tiene ${largo(c.titulo)} caracteres (máximo ${LIMITE_TITULO}).`, 400);
    if (/[<>]/.test(c.titulo)) throw new ErrorYouTube("YouTube no admite los signos < ni > en el título.", 400);
    salida.titulo = c.titulo;
  }
  if (c.descripcion !== undefined) {
    if (typeof c.descripcion !== "string") throw new ErrorYouTube("La descripción no es válida.", 400);
    if (largo(c.descripcion) > LIMITE_DESCRIPCION) throw new ErrorYouTube(`La descripción tiene ${largo(c.descripcion)} caracteres (máximo ${LIMITE_DESCRIPCION}).`, 400);
    salida.descripcion = c.descripcion;
  }
  if (c.etiquetas !== undefined) {
    if (!Array.isArray(c.etiquetas) || c.etiquetas.some((e) => typeof e !== "string")) throw new ErrorYouTube("Las etiquetas no son válidas.", 400);
    if (largoEtiquetas(c.etiquetas as string[]) > LIMITE_ETIQUETAS) throw new ErrorYouTube(`Las etiquetas suman más de ${LIMITE_ETIQUETAS} caracteres.`, 400);
    salida.etiquetas = c.etiquetas as string[];
  }
  return salida;
}

/** Cambia los textos del video y devuelve el snippet ORIGINAL (para guardar el respaldo). Cuesta 51 unidades de cuota. */
export async function aplicarTextos(id: string, cambios: { titulo?: string; descripcion?: string; etiquetas?: string[] }) {
  const original = await leerVideo(id);
  const nuevo = snippetNuevo(original, cambios);
  await llamar("https://www.googleapis.com/youtube/v3/videos?part=snippet", { method: "PUT", body: JSON.stringify({ id, snippet: nuevo }) });
  return { original, nuevo, cuota: COSTO_CUOTA };
}

/** Devuelve el snippet original guardado como respaldo (50 unidades de cuota). */
export async function restaurarSnippet(id: string, original: Snippet) {
  const sn = snippetNuevo(original, {});
  validarCambios({ titulo: sn.title, descripcion: sn.description, etiquetas: sn.tags });
  await llamar("https://www.googleapis.com/youtube/v3/videos?part=snippet", { method: "PUT", body: JSON.stringify({ id, snippet: sn }) });
  return { cuota: 50, titulo: sn.title ?? "" };
}
