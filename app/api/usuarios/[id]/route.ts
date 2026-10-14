import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/acceso-cuenta";
import { ErrorCuenta, problemaClaveNueva, validarPerfil } from "@/lib/cuenta";
import { TODOS_LOS_MODULOS } from "@/lib/modulos";
import { actualizarUsuario, crearClave, guardarUsuarios, leerUsuarios, modulosValidos, publico } from "@/lib/usuarios";

type Contexto = { params: Promise<{ id: string }> };
const noAdmin = () => NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 });

/** Cambia los datos, el rol, los módulos o el estado de un usuario; con «nuevaClave» le restablece la contraseña y cierra sus sesiones. */
export async function PUT(req: Request, { params }: Contexto) {
  const yo = await exigirAdmin(req);
  if (!yo) return noAdmin();
  const { id } = await params;
  try {
    const d = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const lista = await leerUsuarios();
    const actual = lista.find((u) => u.id === id);
    if (!actual) throw new ErrorCuenta("No encuentro ese usuario.");
    const perfil = validarPerfil({ nombre: d.nombre ?? actual.nombre, apellido: d.apellido ?? actual.apellido, correo: d.correo ?? actual.correo, telefono: d.telefono ?? actual.telefono });
    const rol = d.rol === "admin" || d.rol === "usuario" ? d.rol : actual.rol;
    const activo = typeof d.activo === "boolean" ? d.activo : actual.activo;
    if (id === yo.id && (rol !== "admin" || !activo)) throw new ErrorCuenta("No puedes quitarte a ti mismo el rol de administrador ni desactivar tu propia cuenta: pídeselo a otro administrador.");
    const modulos = rol === "admin" ? [...TODOS_LOS_MODULOS] : d.modulos === undefined ? actual.modulos : modulosValidos(d.modulos);
    const nuevaClave = typeof d.nuevaClave === "string" && d.nuevaClave ? d.nuevaClave : "";
    if (nuevaClave) {
      const problema = problemaClaveNueva(nuevaClave);
      if (problema) throw new ErrorCuenta(problema);
    }
    const clave = nuevaClave ? await crearClave(nuevaClave) : actual.clave;
    // se cierran las sesiones del usuario si se le quita acceso, se desactiva o se le cambia la contraseña
    const pierdeAcceso = !activo || (nuevaClave !== "") || modulos.length < actual.modulos.length || (actual.rol === "admin" && rol !== "admin");
    const guardado = await actualizarUsuario(id, (u) => ({ ...u, ...perfil, rol, modulos, activo, clave, sesionesDesde: pierdeAcceso ? Math.floor(Date.now() / 1000) * 1000 : u.sesionesDesde }));
    return NextResponse.json({ ok: true, usuario: publico(guardado) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo guardar." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}

/** Elimina un usuario (no puedes eliminarte a ti mismo ni dejar la app sin administradores). */
export async function DELETE(req: Request, { params }: Contexto) {
  const yo = await exigirAdmin(req);
  if (!yo) return noAdmin();
  const { id } = await params;
  try {
    if (id === yo.id) throw new ErrorCuenta("No puedes eliminar tu propia cuenta.");
    const lista = await leerUsuarios();
    if (!lista.some((u) => u.id === id)) throw new ErrorCuenta("No encuentro ese usuario.");
    await guardarUsuarios(lista.filter((u) => u.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo eliminar." }, { status: e instanceof ErrorCuenta ? 400 : 500 });
  }
}
