import "server-only";
// Envío de correos (solo en el servidor) con Resend (https://resend.com). Variables: RESEND_API_KEY y, opcional,
// GESTOR_CORREO_DE (remitente). Sin dominio propio verificado, Resend solo entrega al correo con el que te registraste: justo lo que hace falta aquí.

export class ErrorCorreo extends Error {}

export const correoConfigurado = () => !!process.env.RESEND_API_KEY?.trim();

export async function enviarCorreo(o: { para: string; asunto: string; html: string; texto: string }): Promise<void> {
  const clave = process.env.RESEND_API_KEY?.trim();
  if (!clave) throw new ErrorCorreo("El envío de correos no está configurado (falta RESEND_API_KEY).");
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
