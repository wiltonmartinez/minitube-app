import { NextResponse } from "next/server";
import { accesoConfigurado, crearEnlaceAcceso, DURACION_ENLACE_S } from "@/lib/acceso";
import { correoAutorizado, correosAutorizados } from "@/lib/acceso-cuenta";
import { ErrorCorreo, correoConfigurado, enviarCorreo } from "@/lib/correo";

// Máximo de pedidos por dirección y por correo (en memoria): evita que alguien llene tu bandeja.
const pedidos = new Map<string, number[]>();
const HORA = 60 * 60 * 1000;
function permitido(clave: string, max: number): boolean {
  const ahora = Date.now();
  const lista = (pedidos.get(clave) ?? []).filter((t) => ahora - t < HORA);
  if (lista.length >= max) return false;
  lista.push(ahora);
  pedidos.set(clave, lista);
  return true;
}

/** Dirección pública del sitio para armar el enlace: nunca se toma de datos que mande quien pide el enlace (en producción). */
function urlPublica(req: Request): string {
  const fija = process.env.GESTOR_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (fija) return fija.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new ErrorCorreo("Falta configurar la dirección pública del sitio (GESTOR_URL).");
  return new URL(req.url).origin;
}

const MENSAJE = "Si ese correo está autorizado, te enviamos un enlace para entrar. Revisa tu bandeja (y la carpeta de spam). Vale 15 minutos.";

export async function POST(req: Request) {
  if (!accesoConfigurado() || !(await correosAutorizados()).length) return NextResponse.json({ error: "La recuperación por correo no está configurada (falta GESTOR_EMAIL)." }, { status: 503 });
  const quien = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  let correo = "";
  try {
    correo = String((await req.json()).correo ?? "").trim().toLowerCase();
  } catch {
    /* cuerpo vacío */
  }
  if (!permitido("ip:" + quien, 5)) return NextResponse.json({ error: "Demasiados pedidos. Espera un rato e inténtalo de nuevo." }, { status: 429 });
  // misma respuesta si el correo no está autorizado: no se revela quién puede entrar
  if (!(await correoAutorizado(correo))) return NextResponse.json({ ok: true, mensaje: MENSAJE });
  if (!permitido("correo:" + correo, 3)) return NextResponse.json({ error: "Ya pediste varios enlaces. Espera un rato e inténtalo de nuevo." }, { status: 429 });
  try {
    const enlace = `${urlPublica(req)}/api/acceso/entrar?t=${encodeURIComponent(await crearEnlaceAcceso(correo))}`;
    if (!correoConfigurado()) {
      // solo en tu PC (desarrollo): sin servicio de correo se muestra el enlace en pantalla; en internet nunca
      if (process.env.NODE_ENV === "development") return NextResponse.json({ ok: true, mensaje: MENSAJE, enlaceDev: enlace, aviso: "Modo desarrollo: no hay servicio de correo configurado (RESEND_API_KEY), así que el enlace se muestra aquí." });
      throw new ErrorCorreo("El envío de correos no está configurado (falta RESEND_API_KEY).");
    }
    const minutos = DURACION_ENLACE_S / 60;
    await enviarCorreo({
      para: correo,
      asunto: "Tu enlace para entrar a Gestor TUBE",
      texto: `Pediste entrar a Gestor TUBE sin contraseña.\n\nAbre este enlace (vale ${minutos} minutos):\n${enlace}\n\nSi no fuiste tú, ignora este mensaje: nadie puede entrar sin el enlace.\nSi olvidaste tu contraseña, cámbiala en Vercel (Settings → Environment Variables → GESTOR_CLAVE).`,
      html: `<p>Pediste entrar a <b>Gestor TUBE</b> sin contraseña.</p><p><a href="${enlace}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Entrar a Gestor TUBE</a></p><p style="color:#555">El enlace vale ${minutos} minutos. Si el botón no abre, copia esta dirección:<br>${enlace}</p><p style="color:#555">Si no fuiste tú, ignora este mensaje: nadie puede entrar sin el enlace.<br>Si olvidaste tu contraseña, cámbiala en Vercel (Settings → Environment Variables → <code>GESTOR_CLAVE</code>).</p>`,
    });
    return NextResponse.json({ ok: true, mensaje: MENSAJE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ErrorCorreo ? e.message : "No se pudo enviar el enlace." }, { status: 502 });
  }
}
