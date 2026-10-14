import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, accesoConfigurado, claveCorrecta, crearSesion } from "@/lib/acceso";

// Frena los intentos repetidos de adivinar la contraseña (por dirección, en memoria).
const intentos = new Map<string, { n: number; hasta: number }>();

export async function POST(req: Request) {
  if (!accesoConfigurado()) return NextResponse.json({ error: "Falta configurar la contraseña (GESTOR_CLAVE) en el servidor." }, { status: 503 });
  const quien = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const e = intentos.get(quien);
  if (e && e.n >= 5 && e.hasta > Date.now()) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  let clave = "";
  try {
    clave = String((await req.json()).clave ?? "");
  } catch {
    /* cuerpo vacío */
  }
  if (!(await claveCorrecta(clave))) {
    intentos.set(quien, { n: (e && e.hasta > Date.now() ? e.n : 0) + 1, hasta: Date.now() + 60_000 });
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
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
