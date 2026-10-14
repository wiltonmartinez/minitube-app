import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "gt-cuenta-"));
  process.env.GESTOR_DATOS_DIR = dir;
  delete process.env.KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  vi.resetModules();
});
afterEach(async () => {
  delete process.env.GESTOR_DATOS_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("cuenta de usuario", () => {
  it("la contraseña se guarda como huella y solo la correcta coincide", async () => {
    const { crearClave, claveCoincide } = await import("@/lib/cuenta");
    const g = await crearClave("Clave-segura-2026");
    expect(JSON.stringify(g)).not.toContain("Clave-segura");
    expect(g.iter).toBeGreaterThanOrEqual(200_000);
    expect(await claveCoincide("Clave-segura-2026", g)).toBe(true);
    expect(await claveCoincide("clave-segura-2026", g)).toBe(false);
    expect(await claveCoincide("", g)).toBe(false);
    const otra = await crearClave("Clave-segura-2026");
    expect(otra.sal).not.toBe(g.sal); // cada huella lleva su propia sal
    expect(otra.hash).not.toBe(g.hash);
  });

  it("reglas de la contraseña nueva", async () => {
    const { problemaClaveNueva } = await import("@/lib/cuenta");
    expect(problemaClaveNueva("corta1")).toMatch(/10 caracteres/);
    expect(problemaClaveNueva("soloLetrasAquiii")).toMatch(/letras y números/);
    expect(problemaClaveNueva("1234567890123")).toMatch(/letras y números/);
    expect(problemaClaveNueva("x".repeat(129) + "1")).toMatch(/larga/);
    expect(problemaClaveNueva("MiClaveNueva2026", "MiClaveNueva2026")).toMatch(/distinta/);
    expect(problemaClaveNueva("MiClaveNueva2026", "otra")).toBeNull();
  });

  it("valida y limpia los datos personales", async () => {
    const { validarPerfil, ErrorCuenta } = await import("@/lib/cuenta");
    expect(validarPerfil({ nombre: "  Wilton ", apellido: "Martínez", correo: " INFO@Ejemplo.com ", telefono: "+57 300 123 4567" })).toEqual({ nombre: "Wilton", apellido: "Martínez", correo: "info@ejemplo.com", telefono: "+57 300 123 4567" });
    expect(validarPerfil({ nombre: "A", apellido: "B", correo: "a@b.co", telefono: "" }).telefono).toBe("");
    expect(() => validarPerfil({ nombre: "", apellido: "B", correo: "a@b.co" })).toThrow(ErrorCuenta);
    expect(() => validarPerfil({ nombre: "A", apellido: "", correo: "a@b.co" })).toThrow(/apellido/);
    expect(() => validarPerfil({ nombre: "A", apellido: "B", correo: "sin-arroba" })).toThrow(/correo/);
    expect(() => validarPerfil({ nombre: "A", apellido: "B", correo: "a@b.co", telefono: "abc" })).toThrow(/teléfono/);
    expect(() => validarPerfil({ nombre: "A", apellido: "B", correo: "a@b.co", telefono: "123" })).toThrow(/teléfono/);
    expect(validarPerfil({ nombre: "<b>X</b>", apellido: "B", correo: "a@b.co" }).nombre).toBe("bX/b"); // los signos < > se quitan
  });

  it("se guarda y se lee de un archivo; sin dónde guardar avisa", async () => {
    const m = await import("@/lib/cuenta");
    expect(m.almacenamiento()).toBe("archivo");
    expect(await m.leerCuenta()).toBeNull();
    const c = { nombre: "Ana", apellido: "Pérez", correo: "ana@ejemplo.com", telefono: "", sesionesDesde: 0, actualizado: new Date().toISOString() };
    await m.guardarCuenta({ ...c, clave: await m.crearClave("Clave-segura-2026") });
    const leida = await m.leerCuenta();
    expect(leida).toMatchObject({ nombre: "Ana", correo: "ana@ejemplo.com" });
    expect(await m.claveCoincide("Clave-segura-2026", leida!.clave!)).toBe(true);
    // sin carpeta ni base de datos no hay dónde guardar
    delete process.env.GESTOR_DATOS_DIR;
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const m2 = await import("@/lib/cuenta");
    expect(m2.almacenamiento()).toBe("ninguno");
    await expect(m2.guardarCuenta({ ...c, sesionesDesde: 0 })).rejects.toThrow(/dónde guardar/);
    vi.unstubAllEnvs();
  });

  it("las sesiones abiertas antes del cambio de contraseña dejan de valer", async () => {
    process.env.GESTOR_CLAVE = "clave-de-prueba";
    const { crearSesion, sesionValida } = await import("@/lib/acceso");
    const t0 = Date.now();
    const vieja = await crearSesion(t0);
    const nueva = await crearSesion(t0 + 5000);
    const desde = Math.floor((t0 + 3000) / 1000) * 1000; // se cambió la contraseña 3 s después
    expect(await sesionValida(vieja, t0 + 6000, desde)).toBe(false);
    expect(await sesionValida(nueva, t0 + 6000, desde)).toBe(true);
    expect(await sesionValida(vieja, t0 + 6000, 0)).toBe(true); // nunca se cambió: valen todas
    delete process.env.GESTOR_CLAVE;
  });
});
