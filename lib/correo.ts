import "server-only";
// Envío de correos (solo en el servidor). Dos caminos, el primero que esté configurado:
//  1. El backend propio (api/public/gestor-correo/ de nucleo.resetalmohadillas.com, que manda por el SMTP de Brevo):
//     GESTOR_CORREO_URL (dirección completa del endpoint) y GESTOR_CORREO_TOKEN (el mismo token de GESTOR_CORREO_TOKEN en ese servidor).
//  2. Resend (https://resend.com): RESEND_API_KEY y, opcional, GESTOR_CORREO_DE (remitente).

export class ErrorCorreo extends Error {}

const backend = () => {
  const url = process.env.GESTOR_CORREO_URL?.trim();
  const token = process.env.GESTOR_CORREO_TOKEN?.trim();
  return url && token ? { url, token } : null;
};

export const correoConfigurado = () => !!backend() || !!process.env.RESEND_API_KEY?.trim();

async function porBackend(b: { url: string; token: string }, o: { para: string; asunto: string; html: string; texto: string }): Promise<void> {
  const r = await fetch(b.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${b.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(o),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!r) throw new ErrorCorreo("No se pudo conectar con el servidor de correo.");
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new ErrorCorreo(r.status === 401 ? "El servidor de correo rechazó el token (GESTOR_CORREO_TOKEN)." : r.status === 503 ? "El servidor de correo está apagado (falta GESTOR_CORREO_TOKEN allá)." : `No se pudo enviar el correo (${d?.message ?? "HTTP " + r.status}).`);
  }
}

export async function enviarCorreo(o: { para: string; asunto: string; html: string; texto: string }): Promise<void> {
  const b = backend();
  if (b) return porBackend(b, o);
  const clave = process.env.RESEND_API_KEY?.trim();
  if (!clave) throw new ErrorCorreo("El envío de correos no está configurado (falta GESTOR_CORREO_URL y GESTOR_CORREO_TOKEN, o RESEND_API_KEY).");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.GESTOR_CORREO_DE?.trim() || "Gestor TUBE <onboarding@resend.dev>", to: [o.para], subject: o.asunto, html: o.html, text: o.texto }),
    cache: "no-store",
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new ErrorCorreo(r.status === 401 || r.status === 403 ? "El servicio de correo rechazó la clave (RESEND_API_KEY)." : `No se pudo enviar el correo (${d?.message ?? "HTTP " + r.status}).`);
  }
}
