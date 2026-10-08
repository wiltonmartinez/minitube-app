// Cliente mínimo de la cola de fal.ai (envío y consulta de trabajos). Lo usa la API pública /api/v1/thumbnail.
// La clave solo viaja en el encabezado de cada petición del servidor; nunca se devuelve ni se registra.

export const COLA_FAL = "https://queue.fal.run/";

/** Error del proveedor de imágenes con su código HTTP y un detalle corto (sin datos secretos). */
export class ErrorProveedor extends Error {
  constructor(
    public status: number,
    public detalle: string,
  ) {
    super(detalle);
  }
}

/** ¿El error significa que se acabó el saldo o la cuota? (el servicio debe devolver 429 con el prompt para generarlo a mano) */
export function esCuotaAgotada(status: number, detalle: string): boolean {
  const d = detalle.toLowerCase();
  return status === 402 || status === 429 || /balance|insufficient|exhausted|quota|credit/.test(d);
}

export async function enviarACola(endpoint: string, entrada: Record<string, unknown>, clave: string) {
  let res: Response;
  try {
    res = await fetch(`${COLA_FAL}${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Key ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify(entrada),
    });
  } catch {
    throw new ErrorProveedor(502, "No se pudo conectar con fal.ai.");
  }
  const texto = await res.text();
  if (!res.ok) throw new ErrorProveedor(res.status, texto.slice(0, 300));
  const j = JSON.parse(texto) as { status_url?: string; response_url?: string };
  if (!j.status_url || !j.response_url) throw new ErrorProveedor(502, "fal.ai no devolvió los datos del trabajo.");
  return { statusUrl: j.status_url, responseUrl: j.response_url };
}

export type EstadoCola =
  | { estado: "en_cola" | "generando" }
  | { estado: "completado"; url: string; ancho: number | null; alto: number | null };

export async function consultarCola(statusUrl: string, responseUrl: string, clave: string): Promise<EstadoCola> {
  // Anti-SSRF: solo direcciones de la cola de fal.ai
  if (!statusUrl.startsWith(COLA_FAL) || !responseUrl.startsWith(COLA_FAL)) throw new ErrorProveedor(400, "Dirección de consulta no válida.");
  const cabeceras = { Authorization: `Key ${clave}` };
  let st: Response;
  try {
    st = await fetch(statusUrl, { headers: cabeceras });
  } catch {
    throw new ErrorProveedor(502, "No se pudo consultar el estado en fal.ai.");
  }
  const stTexto = await st.text();
  if (!st.ok) throw new ErrorProveedor(st.status, stTexto.slice(0, 300));
  const estado = (JSON.parse(stTexto) as { status?: string }).status;
  if (estado === "IN_QUEUE") return { estado: "en_cola" };
  if (estado === "IN_PROGRESS") return { estado: "generando" };

  const res = await fetch(responseUrl, { headers: cabeceras });
  const texto = await res.text();
  if (!res.ok) throw new ErrorProveedor(res.status, texto.slice(0, 300));
  const img = (JSON.parse(texto) as { images?: { url?: string; width?: number; height?: number }[] }).images?.[0];
  if (!img?.url) throw new ErrorProveedor(502, "fal.ai terminó, pero no devolvió ninguna imagen.");
  return { estado: "completado", url: img.url, ancho: img.width ?? null, alto: img.height ?? null };
}
