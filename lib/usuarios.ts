import "server-only";
// Usuarios de Gestor TUBE: quién puede entrar y a qué módulos. Se guardan en el mismo lugar que la cuenta (archivo en tu PC o Upstash Redis).
// El primer usuario es el «propietario» (administrador): sale de la cuenta guardada o de las variables GESTOR_EMAIL y GESTOR_CLAVE,
// así que lo que ya funcionaba sigue funcionando sin migrar nada a mano.
import { correosPermitidos } from "./acceso";
import { ErrorCuenta, claveCoincide, crearClave, escribirGuardado, leerCuenta, leerGuardado, olvidarGuardado, type ClaveGuardada } from "./cuenta";
import { TODOS_LOS_MODULOS, esModulo, type Modulo, type Rol } from "./modulos";

export const ID_PROPIETARIO = "propietario";

export type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: Rol;
  modulos: Modulo[];
  activo: boolean;
  /** Contraseña elegida (solo su huella). Sin ella, el propietario entra con GESTOR_CLAVE. */
  clave?: ClaveGuardada;
  /** Las sesiones abiertas antes de esta fecha (ms) ya no valen. */
  sesionesDesde: number;
  creado: string;
  actualizado: string;
};

type Guardado = { version: 2; usuarios: Usuario[] };

/** El propietario de siempre, armado con la cuenta única guardada o con las variables de entorno. */
async function propietarioInicial(): Promise<Usuario> {
  const c = await leerCuenta();
  const ahora = new Date().toISOString();
  return {
    id: ID_PROPIETARIO,
    nombre: c?.nombre ?? "",
    apellido: c?.apellido ?? "",
    correo: (c?.correo ?? correosPermitidos()[0] ?? "").toLowerCase(),
    telefono: c?.telefono ?? "",
    rol: "admin",
    modulos: [...TODOS_LOS_MODULOS],
    activo: true,
    clave: c?.clave,
    sesionesDesde: c?.sesionesDesde ?? 0,
    creado: c?.actualizado ?? ahora,
    actualizado: c?.actualizado ?? ahora,
  };
}

/** Todos los usuarios. Si todavía no se guardó ninguno, solo existe el propietario (sin escribir nada en disco). */
export async function leerUsuarios(): Promise<Usuario[]> {
  const g = await leerGuardado<Guardado>("usuarios");
  const lista = g?.version === 2 && Array.isArray(g.usuarios) ? g.usuarios : [];
  return lista.length ? lista : [await propietarioInicial()];
}

export async function guardarUsuarios(lista: Usuario[]): Promise<void> {
  if (!lista.some((u) => u.rol === "admin" && u.activo)) throw new ErrorCuenta("Tiene que quedar al menos un administrador activo.");
  const correos = lista.map((u) => u.correo.toLowerCase()).filter(Boolean);
  if (new Set(correos).size !== correos.length) throw new ErrorCuenta("Ya hay otro usuario con ese correo.");
  await escribirGuardado("usuarios", { version: 2, usuarios: lista } satisfies Guardado);
}

/** Busca en la lista guardada; si no aparece, vuelve a leerla una vez sin recuerdo (otra parte de la app pudo crear el usuario hace segundos). */
async function buscar(coincide: (u: Usuario) => boolean): Promise<Usuario | null> {
  const u = (await leerUsuarios()).find(coincide);
  if (u) return u;
  olvidarGuardado("usuarios");
  return (await leerUsuarios()).find(coincide) ?? null;
}
export const usuarioPorId = (id: string) => buscar((u) => u.id === id);
export const usuarioPorCorreo = async (correo: string) => {
  const c = String(correo ?? "").trim().toLowerCase();
  return c ? buscar((u) => u.correo.toLowerCase() === c && u.activo) : null;
};
/** ¿Hay que pedir el correo al entrar? No, si el único usuario no tiene correo (acceso solo con contraseña). */
export const pideCorreo = async () => (await leerUsuarios()).some((u) => !!u.correo);

/** ¿La contraseña escrita es la de este usuario? La elegida en la app o, para el propietario sin cambiarla, GESTOR_CLAVE. */
export async function claveDeUsuario(u: Usuario, intento: string): Promise<boolean> {
  if (u.clave) return claveCoincide(intento, u.clave);
  if (u.id === ID_PROPIETARIO) {
    const { claveCorrecta } = await import("./acceso");
    return claveCorrecta(intento);
  }
  return false;
}

/** Actualiza un usuario y guarda toda la lista. Devuelve el usuario ya guardado. */
export async function actualizarUsuario(id: string, cambios: (u: Usuario) => Usuario): Promise<Usuario> {
  const lista = await leerUsuarios();
  const i = lista.findIndex((u) => u.id === id);
  if (i < 0) throw new ErrorCuenta("No encuentro ese usuario.");
  const nuevo = { ...cambios(lista[i]), actualizado: new Date().toISOString() };
  lista[i] = nuevo;
  await guardarUsuarios(lista);
  return nuevo;
}

export const crearIdUsuario = () => "u" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export { crearClave };

/** Lo que se puede mostrar de un usuario (nunca la huella de la contraseña). */
export type UsuarioPublico = Omit<Usuario, "clave" | "sesionesDesde"> & { tieneClaveDeLaApp: boolean };
export const publico = (u: Usuario): UsuarioPublico => {
  const { clave, sesionesDesde, ...resto } = u;
  void sesionesDesde;
  return { ...resto, tieneClaveDeLaApp: !!clave };
};

/** Módulos pedidos desde un formulario, solo los que existen y sin repetir. */
export const modulosValidos = (v: unknown): Modulo[] => (Array.isArray(v) ? [...new Set(v.filter(esModulo))] : []);
