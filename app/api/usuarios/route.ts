import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/acceso-cuenta";
import { ErrorCuenta, almacenamiento, problemaClaveNueva, validarPerfil } from "@/lib/cuenta";
import { TODOS_LOS_MODULOS } from "@/lib/modulos";
import { crearClave, crearIdUsuario, guardarUsuarios, leerUsuarios, modulosValidos, publico, type Usuario } from "@/lib/usuarios";

const MAX_USUARIOS = 50;
const noAdmin = () => NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 });

/** Lista de usuarios (sin contraseñas ni huellas). Solo administradores. */
export async function GET(req: Request) {
  const yo = await exigirAdmin(req);
  if (!yo) return noAdmin();
  const modo = almacenamiento();
  return NextResponse.json({ yo: yo.id, puedeGuardar: modo !== "ninguno", almacenamiento: modo, usuarios: (await leerUsuarios()).map(publico) });
}

/** Crea un usuario con su contraseña inicial, su rol y los módulos a los que puede entrar. */
export async function POST(req: Request) {
  if (!(await exigirAdmin(req))) return noAdmin();
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const perfil = validarPerfil(d);
    const clave = String(d.clave ?? "");
    const problema = problemaClaveNueva(clave);
    if (problema) throw new ErrorCuenta(problema.replace("nueva", "inicial"));
    const lista = await leerUsuarios();
    if (lista.length >= MAX_USUARIOS) throw new ErrorCuenta(`Máximo ${MAX_USUARIOS} usuarios.`);
    if (lista.some((u) => u.correo.toLowerCase() === perfil.correo)) throw new ErrorCuenta("Ya hay otro usuario con ese correo.");
    const rol = d.rol === "admin" ? "admin" : "usuario";
    const ahora = new Date().toISOString();
    const nuevo: Usuario = {
      id: crearIdUsuario(), ...perfil, rol, modulos: rol === "admin" ? [...TODOS_LOS_MODULOS] : modulosValidos(d.modulos),
      activo: true, clave: await crearClave(clave), sesionesDesde: 0, creado: ahora, actualizado: ahora,
    };
    await guardarUsuarios([...lista, nuevo]);
    return NextResponse.json({ ok: true, usuario: publico(nuevo) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo crear el usuario." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
