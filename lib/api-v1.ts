import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Utilidades de la API pública v1: autenticación por token, identificadores firmados y errores en JSON (en español).

export const VERSION_API = "1";

export type CodigoError =
  | "DATOS_INVALIDOS"
  | "NO_AUTORIZADO"
  | "NO_ENCONTRADO"
  | "CUOTA_AGOTADA"
  | "FALLO_PROVEEDOR"
  | "SERVICIO_NO_CONFIGURADO";

/** Respuesta de error uniforme: { version, error: { codigo, mensaje }, ...extra } */
export function respuestaError(codigo: CodigoError, mensaje: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ version: VERSION_API, error: { codigo, mensaje }, ...extra }, { status });
}

const sha = (t: string) => createHash("sha256").update(t).digest();

/**
 * Exige «Authorization: Bearer <MINITUBE_API_TOKEN>». Devuelve null si todo está bien o la respuesta de error.
 * Si el servidor no tiene token configurado, NUNCA queda abierto: responde 503.
 */
export function verificarToken(req: Request): Response | null {
  const esperado = process.env.MINITUBE_API_TOKEN;
  if (!esperado) {
    return respuestaError(
      "SERVICIO_NO_CONFIGURADO",
      "El servidor no tiene configurado MINITUBE_API_TOKEN, por seguridad la API está cerrada.",
      503,
    );
  }
  const cabecera = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(cabecera);
  // Se comparan los hashes (misma longitud) en tiempo constante
  if (!m || !timingSafeEqual(sha(m[1]), sha(esperado))) {
    return respuestaError("NO_AUTORIZADO", "Falta el token o no es válido. Envía el encabezado «Authorization: Bearer <token>».", 401);
  }
  return null;
}

/** Datos mínimos de un trabajo en la cola de fal.ai que viajan dentro del identificador. */
export type DatosTrabajo = { s: string; r: string; m: string };

const firmar = (cuerpo: string, token: string) => createHmac("sha256", token).update(cuerpo).digest("base64url");

/** Identificador opaco y firmado: no hace falta base de datos y nadie puede inventar ni alterar uno. */
export function crearId(datos: DatosTrabajo, token: string): string {
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo, token)}`;
}

export function leerId(id: string, token: string): DatosTrabajo | null {
  const [cuerpo, firma, sobra] = id.split(".");
  if (!cuerpo || !firma || sobra !== undefined) return null;
  const esperada = firmar(cuerpo, token);
  if (firma.length !== esperada.length || !timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try {
    const d = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf-8")) as DatosTrabajo;
    return typeof d.s === "string" && typeof d.r === "string" && typeof d.m === "string" ? d : null;
  } catch {
    return null;
  }
}
