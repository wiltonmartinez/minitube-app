// Acceso con contraseña única a las secciones que tocan tu canal de YouTube (TexTUBE).
// Funciona en el servidor y en el proxy (Web Crypto): la sesión es una cookie firmada con HMAC que dura 30 días.
// Variables: GESTOR_CLAVE (la contraseña) y, opcional, GESTOR_SECRETO (para firmar; si falta se usa la contraseña).

export const COOKIE_SESION = "gt_sesion";
export const DURACION_SESION_S = 60 * 60 * 24 * 30;

const clave = () => process.env.GESTOR_CLAVE?.trim() || "";

/** En desarrollo local sin contraseña configurada no se pide (para poder probar); en producción siempre hace falta. */
export const accesoLibre = () => !clave() && process.env.NODE_ENV === "development";
export const accesoConfigurado = () => !!clave();

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(texto: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode((process.env.GESTOR_SECRETO?.trim() || clave() || "sin-clave") + "|gestor-tube"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
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

export async function sesionValida(valor: string | undefined | null, ahora = Date.now()): Promise<boolean> {
  if (accesoLibre()) return true;
  if (!valor || !clave()) return false;
  const [caduca, firma] = valor.split(".");
  if (!/^\d{9,12}$/.test(caduca ?? "") || !firma || Number(caduca) < Math.floor(ahora / 1000)) return false;
  return igualesConstante(firma, await hmac("sesion|" + caduca));
}

/** Lee la cookie de sesión de una petición. */
export const cookieDe = (req: Request): string | undefined => req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(COOKIE_SESION + "="))?.slice(COOKIE_SESION.length + 1);
export const exigirSesion = async (req: Request) => sesionValida(cookieDe(req));
