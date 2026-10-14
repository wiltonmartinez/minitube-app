// Acceso con contraseña única a las secciones que tocan tu canal de YouTube (TexTUBE).
// Funciona en el servidor y en el proxy (Web Crypto): la sesión es una cookie firmada con HMAC que dura 30 días.
// Variables: GESTOR_CLAVE (la contraseña) y, opcional, GESTOR_SECRETO (para firmar; si falta se usa la contraseña).

export const COOKIE_SESION = "gt_sesion";
export const DURACION_SESION_S = 60 * 60 * 24 * 30;

const clave = () => process.env.GESTOR_CLAVE?.trim() || "";
/** Con qué se firman las sesiones y los enlaces: GESTOR_SECRETO o, si falta, GESTOR_CLAVE (no cambia cuando eliges otra contraseña desde la app). */
const secreto = () => process.env.GESTOR_SECRETO?.trim() || clave();

/** En desarrollo local sin contraseña configurada no se pide (para poder probar); en producción siempre hace falta. */
export const accesoLibre = () => !clave() && process.env.NODE_ENV === "development";
export const accesoConfigurado = () => !!clave();

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(texto: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode((secreto() || "sin-clave") + "|gestor-tube"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(texto)));
}

function igualesConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** ¿Es correcta la contraseña escrita? (comparación sin pistas de tiempo) */
export async function claveCorrecta(intento: string): Promise<boolean> {
  if (!clave()) return false;
  return igualesConstante(await hmac("clave|" + intento), await hmac("clave|" + clave()));
}

/** Valor de la cookie de sesión: «caduca.firma». */
export async function crearSesion(ahora = Date.now()): Promise<string> {
  const caduca = Math.floor(ahora / 1000) + DURACION_SESION_S;
  return `${caduca}.${await hmac("sesion|" + caduca)}`;
}

export async function sesionValida(valor: string | undefined | null, ahora = Date.now(), desdeMs = 0): Promise<boolean> {
  if (accesoLibre()) return true;
  if (!valor || !secreto()) return false;
  const [caduca, firma] = valor.split(".");
  if (!/^\d{9,12}$/.test(caduca ?? "") || !firma || Number(caduca) < Math.floor(ahora / 1000)) return false;
  // la sesión se abrió (caduca − 30 días); si fue antes de «desdeMs» (por ejemplo, antes de cambiar la contraseña), ya no vale
  if ((Number(caduca) - DURACION_SESION_S) * 1000 < desdeMs) return false;
  return igualesConstante(firma, await hmac("sesion|" + caduca));
}

/** Lee la cookie de sesión de una petición. */
export const cookieDe = (req: Request): string | undefined => req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(COOKIE_SESION + "="))?.slice(COOKIE_SESION.length + 1);
export const exigirSesion = async (req: Request) => sesionValida(cookieDe(req));

// ───────────────────────── correo autorizado y enlace de acceso ─────────────────────────
// GESTOR_EMAIL: el correo (o varios, separados por coma) que pueden entrar. Si falta, solo se pide la contraseña.
// «¿Olvidaste la contraseña?»: se manda a ese correo un enlace de acceso que dura 15 minutos (firmado, sin guardar nada en el servidor).

export const correosPermitidos = (): string[] => (process.env.GESTOR_EMAIL ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
export const correoPermitido = (correo: string) => correosPermitidos().includes(String(correo ?? "").trim().toLowerCase());
export const DURACION_ENLACE_S = 15 * 60;

const aB64 = (t: string) => btoa(String.fromCharCode(...enc.encode(t))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64 = (t: string) => new TextDecoder().decode(Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

/** Enlace de acceso para un correo autorizado: «caduca.correo.firma». */
export async function crearEnlaceAcceso(correo: string, ahora = Date.now()): Promise<string> {
  const c = correo.trim().toLowerCase();
  const caduca = Math.floor(ahora / 1000) + DURACION_ENLACE_S;
  return `${caduca}.${aB64(c)}.${await hmac(`enlace|${caduca}|${c}`)}`;
}

/** El correo del enlace si es válido (firma buena, no vencido y correo todavía autorizado); si no, null. */
export async function verificarEnlaceAcceso(token: string | null | undefined, ahora = Date.now(), permitido: (c: string) => boolean | Promise<boolean> = correoPermitido): Promise<string | null> {
  if (!token || !secreto()) return null;
  const [caduca, b64, firma] = token.split(".");
  if (!/^\d{9,12}$/.test(caduca ?? "") || !b64 || !firma || Number(caduca) < Math.floor(ahora / 1000)) return null;
  let correo: string;
  try {
    correo = deB64(b64);
  } catch {
    return null;
  }
  if (!igualesConstante(firma, await hmac(`enlace|${caduca}|${correo}`))) return null;
  return (await permitido(correo)) ? correo : null;
}
