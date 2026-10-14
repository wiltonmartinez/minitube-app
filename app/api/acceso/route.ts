import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, accesoConfigurado, crearSesion } from "@/lib/acceso";
import { claveValida, correoAutorizado, correosAutorizados } from "@/lib/acceso-cuenta";

// Frena los intentos repetidos de adivinar la contraseña (por dirección, en memoria).
const intentos = new Map<string, { n: number; hasta: number }>();

/** ¿El correo escrito es uno de los autorizados? Si no hay correos configurados, solo se pide la contraseña. */
const informaCorreo = async () => (await correosAutorizados()).length > 0;

export async function GET() {
  // la pantalla de acceso pregunta si debe pedir el correo
  return NextResponse.json({ pideCorreo: await informaCorreo(), configurado: accesoConfigurado() });
}

export async function POST(req: Request) {
  if (!accesoConfigurado()) return NextResponse.json({ error: "Falta configurar la contraseña (GESTOR_CLAVE) en el servidor." }, { status: 503 });
  const quien = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const e = intentos.get(quien);
  if (e && e.n >= 5 && e.hasta > Date.now()) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  let clave = "";
  let correo = "";
  try {
    const d = await req.json();
    clave = String(d.clave ?? "");
    correo = String(d.correo ?? "");
  } catch {
    /* cuerpo vacío */
  }
  // el mismo mensaje para correo o contraseña malos: no se revela cuál de los dos falló
  const pide = await informaCorreo();
  const correoOk = !pide || (await correoAutorizado(correo));
  const claveOk = await claveValida(clave);
  if (!(correoOk && claveOk)) {
    intentos.set(quien, { n: (e && e.hasta > Date.now() ? e.n : 0) + 1, hasta: Date.now() + 60_000 });
    return NextResponse.json({ error: pide ? "Correo o contraseña incorrectos." : "Contraseña incorrecta." }, { status: 401 });
  }
  intentos.delete(quien);
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_SESION, await crearSesion(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
  return r;
}

export async function DELETE() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_SESION, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return r;
}
