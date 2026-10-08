import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/credits/route";
import { explicarErrorCreditos, formatearSaldo } from "@/lib/fal-helpers";

const pedir = () => GET(new Request("http://localhost/api/credits"));
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Créditos de fal.ai", () => {
  it("sin ninguna clave: modo simulación y no llama a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "");
    vi.stubEnv("FAL_ADMIN_KEY", "");
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    expect(await (await pedir()).json()).toEqual({ simulacion: true });
    expect(espia).not.toHaveBeenCalled();
  });
  it("consulta el endpoint oficial con expand=credits y devuelve el saldo sin exponer la clave", async () => {
    vi.stubEnv("FAL_KEY", "clave-normal");
    vi.stubEnv("FAL_ADMIN_KEY", "");
    const espia = vi.fn().mockResolvedValue(json({ username: "mi-equipo", credits: { current_balance: 24.5, currency: "USD" } }));
    vi.stubGlobal("fetch", espia);
    const res = await pedir();
    const j = await res.json();
    expect(j).toEqual({ saldo: 24.5, moneda: "USD", usuario: "mi-equipo", usaClaveAdmin: false });
    expect(JSON.stringify(j)).not.toContain("clave-normal");
    const [url, init] = espia.mock.calls[0];
    expect(url).toBe("https://api.fal.ai/v1/account/billing?expand=credits");
    expect(init.headers.Authorization).toBe("Key clave-normal");
    expect(init.method ?? "GET").toBe("GET"); // solo lectura
  });
  it("prefiere FAL_ADMIN_KEY cuando existe", async () => {
    vi.stubEnv("FAL_KEY", "clave-normal");
    vi.stubEnv("FAL_ADMIN_KEY", "clave-admin");
    const espia = vi.fn().mockResolvedValue(json({ username: "x", credits: { current_balance: 0, currency: "USD" } }));
    vi.stubGlobal("fetch", espia);
    const j = await (await pedir()).json();
    expect(espia.mock.calls[0][1].headers.Authorization).toBe("Key clave-admin");
    expect(j.usaClaveAdmin).toBe(true);
    expect(j.saldo).toBe(0);
    expect(JSON.stringify(j)).not.toContain("clave-admin");
  });
  it("si la clave no es Admin explica cómo arreglarlo", async () => {
    vi.stubEnv("FAL_KEY", "clave-normal");
    vi.stubEnv("FAL_ADMIN_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { type: "authorization_error", message: "x" } }, 403)));
    const res = await pedir();
    expect(res.status).toBe(502);
    const j = await res.json();
    expect(j.error).toContain("Admin");
    expect(j.error).toContain("FAL_ADMIN_KEY");
  });
  it("maneja límite de consultas, errores del servidor, respuestas sin saldo y fallos de red", async () => {
    vi.stubEnv("FAL_KEY", "k");
    vi.stubEnv("FAL_ADMIN_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { type: "rate_limited", message: "x" } }, 429)));
    const limite = await pedir();
    expect(limite.status).toBe(429);
    expect((await limite.json()).error).toContain("demasiadas");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { type: "server_error", message: "x" } }, 500)));
    expect((await (await pedir()).json()).error).toContain("temporal");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ username: "x" })));
    const sinSaldo = await pedir();
    expect(sinSaldo.status).toBe(502);
    expect((await sinSaldo.json()).error).toContain("no devolvió el saldo");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    expect((await (await pedir()).json()).error).toContain("conexión");
  });
  it("da formato al saldo y traduce los errores", () => {
    expect(formatearSaldo(24.5, "USD")).toBe("USD 24.50");
    expect(formatearSaldo(0, "")).toBe("USD 0.00");
    expect(formatearSaldo(3.14159, "EUR")).toBe("EUR 3.14");
    expect(explicarErrorCreditos(401)).toContain("Admin");
    expect(explicarErrorCreditos(200, "authorization_error")).toContain("Admin");
    expect(explicarErrorCreditos(429)).toContain("demasiadas");
    expect(explicarErrorCreditos(503)).toContain("temporal");
    expect(explicarErrorCreditos(400)).toContain("No se pudo consultar");
  });
});
