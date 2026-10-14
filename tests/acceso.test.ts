import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claveCorrecta, cookieDe, crearSesion, sesionValida } from "@/lib/acceso";

const previo = { clave: process.env.GESTOR_CLAVE, secreto: process.env.GESTOR_SECRETO };
beforeEach(() => {
  process.env.GESTOR_CLAVE = "clave-de-prueba";
  delete process.env.GESTOR_SECRETO;
});
afterEach(() => {
  for (const [k, v] of [["GESTOR_CLAVE", previo.clave], ["GESTOR_SECRETO", previo.secreto]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("acceso con contraseña", () => {
  it("acepta solo la contraseña correcta", async () => {
    expect(await claveCorrecta("clave-de-prueba")).toBe(true);
    expect(await claveCorrecta("otra")).toBe(false);
    expect(await claveCorrecta("")).toBe(false);
  });
  it("sin contraseña configurada nadie entra (fuera de desarrollo)", async () => {
    delete process.env.GESTOR_CLAVE;
    expect(await claveCorrecta("")).toBe(false);
    expect(await sesionValida(await crearSesion())).toBe(false);
  });
  it("la sesión vale 30 días, no antes ni después, y no se puede falsificar", async () => {
    const ahora = Date.now();
    const c = await crearSesion(ahora);
    expect(await sesionValida(c, ahora + 1000)).toBe(true);
    expect(await sesionValida(c, ahora + 29 * 86_400_000)).toBe(true);
    expect(await sesionValida(c, ahora + 31 * 86_400_000)).toBe(false);
    const [caduca, firma] = c.split(".");
    expect(await sesionValida(`${Number(caduca) + 999999}.${firma}`, ahora)).toBe(false); // fecha cambiada
    expect(await sesionValida(`${caduca}.${"0".repeat(firma.length)}`, ahora)).toBe(false); // firma inventada
    expect(await sesionValida("basura", ahora)).toBe(false);
    expect(await sesionValida(undefined, ahora)).toBe(false);
  });
  it("una sesión hecha con otra contraseña no sirve", async () => {
    const c = await crearSesion();
    process.env.GESTOR_CLAVE = "otra-clave";
    expect(await sesionValida(c)).toBe(false);
  });
  it("lee la cookie de la petición", () => {
    const req = new Request("http://x/", { headers: { cookie: "a=1; gt_sesion=123.abc; b=2" } });
    expect(cookieDe(req)).toBe("123.abc");
    expect(cookieDe(new Request("http://x/"))).toBeUndefined();
  });
});
