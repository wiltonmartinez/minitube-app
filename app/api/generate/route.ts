import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { explicarError, imagenSimulada } from "@/lib/fal-helpers";
import { ASPECTO, MAX_REFERENCIAS, buscarModelo } from "@/lib/image-models";

// Genera la imagen con fal.ai usando su cola: POST envía el trabajo y GET consulta el estado.
// Así ninguna petición de Vercel espera a que la imagen termine (evita cortes por tiempo).
// La clave FAL_KEY solo existe aquí, en el servidor. Sin clave → MODO SIMULACIÓN (sin costo).
// Con fotos de referencia: se suben a fal.storage y se usa el endpoint «edit» del modelo.

const COLA = "https://queue.fal.run/";
const MAX_PROMPT = 12000;
const MAX_BYTES_FOTO = 1_500_000; // por foto ya reducida en el navegador
const MAX_BYTES_TOTAL = 4_000_000; // Vercel limita el cuerpo de la petición a ~4,5 MB
const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

type Respuesta =
  | { estado: "completado"; imagenUrl: string; simulacion: boolean; modelo: string }
  | { estado: "en_cola" | "generando"; statusUrl: string; responseUrl: string; simulacion: false; modelo: string };

const error = (mensaje: string, status = 400) => NextResponse.json({ error: mensaje }, { status });

/** Valida las fotos de referencia (data URI jpeg/png/webp) y las decodifica. */
function leerReferencias(valor: unknown): { tipo: string; bytes: Buffer }[] | string {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) return "Las fotos de referencia no son válidas.";
  if (valor.length > MAX_REFERENCIAS) return `Máximo ${MAX_REFERENCIAS} fotos de referencia.`;
  const fotos: { tipo: string; bytes: Buffer }[] = [];
  let total = 0;
  for (const v of valor) {
    const m = typeof v === "string" ? DATA_URI.exec(v) : null;
    if (!m) return "Cada foto de referencia debe ser una imagen JPG, PNG o WebP.";
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > MAX_BYTES_FOTO) return "Una de las fotos de referencia es demasiado pesada. Usa una más pequeña.";
    total += bytes.length;
    fotos.push({ tipo: m[1], bytes });
  }
  if (total > MAX_BYTES_TOTAL) return "Las fotos de referencia pesan demasiado en conjunto. Usa menos fotos o más pequeñas.";
  return fotos;
}

/** POST { prompt, modelo, aspectRatio?, imagenesReferencia? } → envía el trabajo (o devuelve la simulación). */
export async function POST(req: Request) {
  let body: { prompt?: unknown; modelo?: unknown; aspectRatio?: unknown; imagenesReferencia?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("La solicitud no es válida.");
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return error("Falta el prompt. Escribe el modelo de la impresora para generarlo.");
  if (prompt.length > MAX_PROMPT) return error("El prompt es demasiado largo.");
  const modelo = typeof body.modelo === "string" ? buscarModelo(body.modelo) : undefined;
  if (!modelo) return error("Modelo de IA desconocido.");
  if (body.aspectRatio !== undefined && body.aspectRatio !== ASPECTO) return error("Solo se admite el formato 16:9.");

  const fotos = leerReferencias(body.imagenesReferencia);
  if (typeof fotos === "string") return error(fotos);
  if (fotos.length && !modelo.endpointRef) {
    return error(`${modelo.nombre} no admite fotos de referencia. Usa Nano Banana Pro o FLUX.2 Pro.`);
  }

  const clave = process.env.FAL_KEY;
  if (!clave) {
    const r: Respuesta = {
      estado: "completado",
      imagenUrl: imagenSimulada(modelo, fotos.length),
      simulacion: true,
      modelo: modelo.id,
    };
    return NextResponse.json(r);
  }

  try {
    let endpoint = modelo.endpoint;
    let entrada = modelo.entrada(prompt);
    if (fotos.length && modelo.endpointRef && modelo.entradaRef) {
      fal.config({ credentials: clave });
      const urls: string[] = [];
      for (const f of fotos) urls.push(await fal.storage.upload(new Blob([new Uint8Array(f.bytes)], { type: f.tipo })));
      endpoint = modelo.endpointRef;
      entrada = modelo.entradaRef(prompt, urls);
    }
    const res = await fetch(`${COLA}${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Key ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify(entrada),
    });
    const texto = await res.text();
    if (!res.ok) return error(explicarError(res.status, texto), res.status === 401 || res.status === 403 ? 502 : res.status);
    const j = JSON.parse(texto) as { status_url?: string; response_url?: string };
    if (!j.status_url || !j.response_url) return error("fal.ai no devolvió los datos del trabajo.", 502);
    const r: Respuesta = {
      estado: "en_cola",
      statusUrl: j.status_url,
      responseUrl: j.response_url,
      simulacion: false,
      modelo: modelo.id,
    };
    return NextResponse.json(r);
  } catch (e) {
    const detalle = e instanceof Error ? e.message : "";
    const status = typeof (e as { status?: unknown }).status === "number" ? (e as { status: number }).status : 500;
    console.error("[generate] fallo al preparar el trabajo:", status, detalle.slice(0, 200)); // sin datos secretos
    if (fotos.length) return error(`No se pudieron subir las fotos de referencia. ${explicarError(status, detalle)}`, 502);
    return error("No se pudo conectar con fal.ai. Revisa tu conexión a internet.", 502);
  }
}

/** GET ?statusUrl=…&responseUrl=… → consulta el estado y, si terminó, devuelve la URL de la imagen. */
export async function GET(req: Request) {
  const clave = process.env.FAL_KEY;
  if (!clave) return error("Modo simulación: no hay trabajos que consultar.");
  const { searchParams } = new URL(req.url);
  const statusUrl = searchParams.get("statusUrl") ?? "";
  const responseUrl = searchParams.get("responseUrl") ?? "";
  // Anti-SSRF: solo se aceptan direcciones de la cola de fal.ai
  if (!statusUrl.startsWith(COLA) || !responseUrl.startsWith(COLA)) return error("Dirección de consulta no válida.");

  try {
    const st = await fetch(statusUrl, { headers: { Authorization: `Key ${clave}` } });
    const stTexto = await st.text();
    if (!st.ok) return error(explicarError(st.status, stTexto), 502);
    const estado = (JSON.parse(stTexto) as { status?: string }).status;
    if (estado === "IN_QUEUE") return NextResponse.json({ estado: "en_cola" });
    if (estado === "IN_PROGRESS") return NextResponse.json({ estado: "generando" });

    const res = await fetch(responseUrl, { headers: { Authorization: `Key ${clave}` } });
    const texto = await res.text();
    if (!res.ok) return error(explicarError(res.status, texto), 502);
    const url = (JSON.parse(texto) as { images?: { url?: string }[] }).images?.[0]?.url;
    if (!url) return error("fal.ai terminó, pero no devolvió ninguna imagen.", 502);
    return NextResponse.json({ estado: "completado", imagenUrl: url, simulacion: false });
  } catch {
    return error("No se pudo consultar el estado en fal.ai.", 502);
  }
}
