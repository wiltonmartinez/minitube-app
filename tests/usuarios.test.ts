import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TODOS_LOS_MODULOS, modulosDe, moduloDeRuta, primeraRuta, puedeAcceder } from "@/lib/modulos";

vi.mock("server-only", () => ({}));

describe("módulos y permisos", () => {
  const admin = { rol: "admin" as const, modulos: [], activo: true };
  const solo = (m: ("textube" | "promptube" | "capatube")[]) => ({ rol: "usuario" as const, modulos: m, activo: true });

  it("cada dirección pertenece a un módulo, a los administradores o a cualquiera con sesión", () => {
    for (const [ruta, esperado] of [
      ["/textube", "textube"], ["/textube/", "textube"], ["/api/youtube/video", "textube"], ["/api/youtube/aplicar", "textube"],
      ["/editor", "capatube"], ["/editor/index.html", "capatube"], ["/editor/editor.js", "capatube"], ["/fuentes/Rubik.ttf", "capatube"],
      ["/", "promptube"], ["/api/generate", "promptube"], ["/api/chat", "promptube"], ["/api/credits", "promptube"], ["/api/assets", "promptube"],
      ["/usuarios", "admin"], ["/api/usuarios", "admin"], ["/api/usuarios/u123", "admin"],
      ["/cuenta", null], ["/api/cuenta", null], ["/api/cuenta/clave", null], ["/cambios", null], ["/sin-acceso", null],
    ] as const) expect(moduloDeRuta(ruta), ruta).toBe(esperado);
  });

  it("un usuario solo entra a lo que se le dio; el administrador, a todo; el desactivado, a nada", () => {
    expect(puedeAcceder(solo(["textube"]), "textube")).toBe(true);
    expect(puedeAcceder(solo(["textube"]), "capatube")).toBe(false);
    expect(puedeAcceder(solo([]), "promptube")).toBe(false);
    for (const m of TODOS_LOS_MODULOS) expect(puedeAcceder(admin, m)).toBe(true);
    expect(puedeAcceder({ ...admin, activo: false }, "textube")).toBe(false);
    expect(puedeAcceder(null, "textube")).toBe(false);
    expect(modulosDe(solo(["capatube", "textube"]))).toEqual(["textube", "capatube"]); // siempre en el orden de la barra
    expect(modulosDe(admin)).toEqual(TODOS_LOS_MODULOS);
    expect(modulosDe({ ...admin, activo: false })).toEqual([]);
  });

  it("a quien no tiene PrompTUBE (la página de inicio) se le manda a su primer módulo", () => {
    expect(primeraRuta(solo(["capatube"]))).toBe("/editor");
    expect(primeraRuta(solo(["textube", "capatube"]))).toBe("/textube");
    expect(primeraRuta(solo([]))).toBe("/sin-acceso");
    expect(primeraRuta(admin)).toBe("/textube");
  });
});

describe("usuarios guardados", () => {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "gt-usuarios-"));
    process.env.GESTOR_DATOS_DIR = dir;
    process.env.GESTOR_EMAIL = "dueno@ejemplo.com";
    process.env.GESTOR_CLAVE = "clave-del-dueno-2026";
    delete process.env.KV_REST_API_URL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    vi.resetModules();
  });
  afterEach(async () => {
    for (const k of ["GESTOR_DATOS_DIR", "GESTOR_EMAIL", "GESTOR_CLAVE"]) delete process.env[k];
    await rm(dir, { recursive: true, force: true });
  });

  it("sin nada guardado existe solo el propietario, administrador, con la contraseña y el correo de las variables", async () => {
    const m = await import("@/lib/usuarios");
    const lista = await m.leerUsuarios();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: "propietario", correo: "dueno@ejemplo.com", rol: "admin", activo: true });
    expect(await m.claveDeUsuario(lista[0], "clave-del-dueno-2026")).toBe(true);
    expect(await m.claveDeUsuario(lista[0], "otra")).toBe(false);
    expect((await m.usuarioPorCorreo(" DUENO@ejemplo.com "))?.id).toBe("propietario");
    expect(await m.usuarioPorCorreo("nadie@ejemplo.com")).toBeNull();
    expect(await m.pideCorreo()).toBe(true);
  });

  it("se crea un usuario con sus módulos y entra con su propia contraseña, no con la del propietario", async () => {
    const m = await import("@/lib/usuarios");
    const [propietario] = await m.leerUsuarios();
    const ahora = new Date().toISOString();
    const nuevo = { id: m.crearIdUsuario(), nombre: "Ana", apellido: "Gómez", correo: "ana@ejemplo.com", telefono: "", rol: "usuario" as const, modulos: ["capatube" as const], activo: true, clave: await m.crearClave("Clave-de-Ana-2026"), sesionesDesde: 0, creado: ahora, actualizado: ahora };
    await m.guardarUsuarios([propietario, nuevo]);
    const ana = (await m.usuarioPorCorreo("ana@ejemplo.com"))!;
    expect(ana.modulos).toEqual(["capatube"]);
    expect(await m.claveDeUsuario(ana, "Clave-de-Ana-2026")).toBe(true);
    expect(await m.claveDeUsuario(ana, "clave-del-dueno-2026")).toBe(false); // la del propietario no abre la cuenta de Ana
    const dueno = (await m.usuarioPorId("propietario"))!;
    expect(await m.claveDeUsuario(dueno, "clave-del-dueno-2026")).toBe(true); // y el propietario sigue con la suya
  });

  it("no deja correos repetidos ni quedarse sin administradores", async () => {
    const m = await import("@/lib/usuarios");
    const [propietario] = await m.leerUsuarios();
    const otro = { ...propietario, id: "u1", correo: "DUENO@ejemplo.com", rol: "usuario" as const };
    await expect(m.guardarUsuarios([propietario, otro])).rejects.toThrow(/mismo correo|otro usuario con ese correo/);
    await expect(m.guardarUsuarios([{ ...propietario, rol: "usuario" }])).rejects.toThrow(/administrador/);
    await expect(m.guardarUsuarios([{ ...propietario, activo: false }])).rejects.toThrow(/administrador/);
  });

  it("un usuario desactivado no puede entrar por correo; los módulos inválidos se descartan", async () => {
    const m = await import("@/lib/usuarios");
    const [propietario] = await m.leerUsuarios();
    const ahora = new Date().toISOString();
    await m.guardarUsuarios([propietario, { id: "u2", nombre: "B", apellido: "C", correo: "b@ejemplo.com", telefono: "", rol: "usuario", modulos: [], activo: false, sesionesDesde: 0, creado: ahora, actualizado: ahora }]);
    expect(await m.usuarioPorCorreo("b@ejemplo.com")).toBeNull();
    expect(m.modulosValidos(["textube", "hackeo", "textube", 7])).toEqual(["textube"]);
    expect(m.modulosValidos("textube")).toEqual([]);
  });

  it("lo público de un usuario nunca incluye la huella de la contraseña", async () => {
    const m = await import("@/lib/usuarios");
    const u = { ...(await m.leerUsuarios())[0], clave: await m.crearClave("Clave-de-Ana-2026") };
    const p = m.publico(u) as Record<string, unknown>;
    expect(p.clave).toBeUndefined();
    expect(p.sesionesDesde).toBeUndefined();
    expect(p.tieneClaveDeLaApp).toBe(true);
    expect(JSON.stringify(p)).not.toContain(u.clave.hash);
  });
});
