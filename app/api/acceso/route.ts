import { NextResponse } from "next/server";
import { COOKIE_SESION, DURACION_SESION_S, accesoConfigurado, claveCorrecta, crearSesion } from "@/lib/acceso";
import { bloqueado, falloRegistrado, olvidarFallos, quienEs } from "@/lib/frenos";
import { ID_PROPIETARIO, claveDeUsuario, leerUsuarios, pideCorreo, usuarioPorCorreo } from "@/lib/usuarios";

export async function GET() {
  // la pantalla de acceso pregunta si debe pedir el correo
  return NextResponse.json({ pideCorreo: await pideCorreo(), configurado: accesoConfigurado() });
}

export async function POST(req: Request) {
  if (!accesoConfigurado()) return NextResponse.json({ error: "Falta configurar la contraseña (GESTOR_CLAVE) en el servidor." }, { status: 503 });
  const quien = "acceso:" + quienEs(req);
  if (bloqueado(quien)) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  let clave = "";
  let correo = "";
  try {
    const d = await req.json();
    clave = String(d.clave ?? "");
    correo = String(d.correo ?? "");
  } catch {
    /* cuerpo vacío */
  }
  const pide = await pideCorreo();
  const usuario = pide ? await usuarioPorCorreo(correo) : ((await leerUsuarios()).find((u) => u.id === ID_PROPIETARIO) ?? null);
  // se comprueba siempre una contraseña (aunque el correo no exista) para tardar lo mismo, y el mensaje es el mismo: no se revela qué falló
  const claveOk = usuario ? await claveDeUsuario(usuario, clave) : (await claveCorrecta(clave), false);
  if (!usuario || !claveOk) {
    falloRegistrado(quien);
    return NextResponse.json({ error: pide ? "Correo o contraseña incorrectos." : "Contraseña incorrecta." }, { status: 401 });
  }
  olvidarFallos(quien);
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_SESION, await crearSesion(Date.now(), usuario.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SESION_S });
  return r;
}

export async function DELETE() {
  const r = NextResponse.json({ ok: true });
  r.cookies.set(COOKIE_SESION, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return r;
}
