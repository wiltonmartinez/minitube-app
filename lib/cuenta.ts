import "server-only";
// Cuenta de usuario de Gestor TUBE: nombre, apellido, correo, teléfono y contraseña (guardada como huella, nunca en claro).
// Dónde se guarda (en este orden):
//   1. Upstash Redis / Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN, o UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN): sirve en internet.
//   2. Un archivo (.data/cuenta.json, o la carpeta de GESTOR_DATOS_DIR): sirve en tu PC y en servidores con disco propio. No se usa en Vercel.
//   3. Nada: la cuenta se lee de las variables de entorno (GESTOR_EMAIL, GESTOR_CLAVE) y no se puede editar desde la app.
import { promises as fs } from "node:fs";
import path from "node:path";

export type ClaveGuardada = { sal: string; iter: number; hash: string };
export type Cuenta = {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  /** Contraseña elegida desde la app. Si falta, vale la de GESTOR_CLAVE. */
  clave?: ClaveGuardada;
  /** Las sesiones abiertas antes de esta fecha (ms) ya no valen: se renueva al cambiar la contraseña. */
  sesionesDesde: number;
  actualizado: string;
};

export type Almacenamiento = "redis" | "archivo" | "ninguno";
const LLAVE = "gestor-tube:cuenta";
const ITERACIONES = 210_000;

const urlRedis = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const tokenRedis = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const carpetaDatos = () => process.env.GESTOR_DATOS_DIR?.trim() || (process.env.NODE_ENV === "development" ? path.join(process.cwd(), ".data") : "");

export function almacenamiento(): Almacenamiento {
  if (urlRedis() && tokenRedis()) return "redis";
  if (carpetaDatos() && !process.env.VERCEL) return "archivo";
  return "ninguno";
}

let cache: { valor: Cuenta | null; hasta: number } | null = null;
const olvidarCache = () => {
  cache = null;
};

async function redis(comando: (string | number)[]): Promise<unknown> {
  const r = await fetch(urlRedis(), { method: "POST", headers: { Authorization: `Bearer ${tokenRedis()}`, "Content-Type": "application/json" }, body: JSON.stringify(comando), cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("No se pudo usar la base de datos de la cuenta.");
  return d.result;
}

/** La cuenta guardada (o null si todavía no se guardó nada). Se recuerda 5 segundos para no consultar en cada página. */
export async function leerCuenta(): Promise<Cuenta | null> {
  if (cache && cache.hasta > Date.now()) return cache.valor;
  let valor: Cuenta | null = null;
  try {
    const modo = almacenamiento();
    if (modo === "redis") {
      const t = await redis(["GET", LLAVE]);
      valor = typeof t === "string" ? (JSON.parse(t) as Cuenta) : null;
    } else if (modo === "archivo") {
      valor = JSON.parse(await fs.readFile(path.join(carpetaDatos(), "cuenta.json"), "utf-8")) as Cuenta;
    }
  } catch {
    valor = null; // sin archivo todavía o sin conexión: se usan las variables de entorno
  }
  cache = { valor, hasta: Date.now() + 5_000 };
  return valor;
}

export class ErrorCuenta extends Error {}

export async function guardarCuenta(c: Cuenta): Promise<void> {
  const modo = almacenamiento();
  if (modo === "ninguno") throw new ErrorCuenta("No hay dónde guardar la cuenta: en internet falta conectar una base de datos (Upstash Redis, gratis). En tu PC se guarda sola.");
  const texto = JSON.stringify(c);
  if (modo === "redis") await redis(["SET", LLAVE, texto]);
  else {
    await fs.mkdir(carpetaDatos(), { recursive: true });
    await fs.writeFile(path.join(carpetaDatos(), "cuenta.json"), texto, { encoding: "utf-8", mode: 0o600 });
  }
  olvidarCache();
}

/** Fecha desde la que valen las sesiones (0 si nunca se cambió la contraseña). */
export const sesionesDesde = async () => (await leerCuenta())?.sesionesDesde ?? 0;

// ───────────────────────── contraseña ─────────────────────────
const aHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b instanceof Uint8Array ? b.buffer : b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const deHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

async function derivar(clave: string, sal: Uint8Array, iter: number): Promise<string> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveBits"]);
  return aHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal as BufferSource, iterations: iter }, base, 256));
}

export async function crearClave(clave: string): Promise<ClaveGuardada> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return { sal: aHex(sal), iter: ITERACIONES, hash: await derivar(clave, sal, ITERACIONES) };
}

export async function claveCoincide(clave: string, guardada: ClaveGuardada): Promise<boolean> {
  const h = await derivar(clave, deHex(guardada.sal), guardada.iter);
  if (h.length !== guardada.hash.length) return false;
  let d = 0;
  for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ guardada.hash.charCodeAt(i);
  return d === 0;
}

/** Reglas de la contraseña nueva; devuelve el motivo si no sirve. */
export function problemaClaveNueva(nueva: string, actual?: string): string | null {
  if (nueva.length < 10) return "La contraseña nueva debe tener al menos 10 caracteres.";
  if (nueva.length > 128) return "La contraseña nueva es demasiado larga (máximo 128).";
  if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return "La contraseña nueva debe llevar letras y números.";
  if (actual !== undefined && nueva === actual) return "La contraseña nueva debe ser distinta de la actual.";
  return null;
}

// ───────────────────────── datos personales ─────────────────────────
export type Perfil = Pick<Cuenta, "nombre" | "apellido" | "correo" | "telefono">;
const limpio = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Valida y limpia los datos escritos en el formulario; lanza ErrorCuenta con un mensaje claro si algo no sirve. */
export function validarPerfil(d: Record<string, unknown>): Perfil {
  const nombre = limpio(d.nombre, 60);
  const apellido = limpio(d.apellido, 60);
  const correo = limpio(d.correo, 120).toLowerCase();
  const telefono = limpio(d.telefono, 25);
  if (!nombre) throw new ErrorCuenta("Escribe tu nombre.");
  if (!apellido) throw new ErrorCuenta("Escribe tu apellido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) throw new ErrorCuenta("El correo no es válido.");
  if (telefono && (!/^[0-9 +()-]{7,25}$/.test(telefono) || (telefono.match(/\d/g) ?? []).length < 7)) throw new ErrorCuenta("El teléfono solo puede llevar números, espacios, +, - y paréntesis (mínimo 7 dígitos).");
  return { nombre, apellido, correo, telefono };
}
