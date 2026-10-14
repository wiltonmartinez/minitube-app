import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const previo = process.env.RESEND_API_KEY;
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GESTOR_CORREO_URL;
  delete process.env.GESTOR_CORREO_TOKEN;
  if (previo === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previo;
});

describe("envío de correos", () => {
  it("sin clave no envía nada", async () => {
    delete process.env.RESEND_API_KEY;
    const { enviarCorreo, correoConfigurado } = await import("@/lib/correo");
    expect(correoConfigurado()).toBe(false);
    await expect(enviarCorreo({ para: "a@b.c", asunto: "x", html: "x", texto: "x" })).rejects.toThrow(/RESEND_API_KEY/);
  });
  it("manda el correo al servicio con la clave y el destinatario", async () => {
    process.env.RESEND_API_KEY = "re_prueba";
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const { enviarCorreo } = await import("@/lib/correo");
    await enviarCorreo({ para: "dueno@ejemplo.com", asunto: "Hola", html: "<b>x</b>", texto: "x" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_prueba");
    expect(JSON.parse(String(init.body))).toMatchObject({ to: ["dueno@ejemplo.com"], subject: "Hola" });
  });
  it("traduce el rechazo de la clave", async () => {
    process.env.RESEND_API_KEY = "mala";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const { enviarCorreo } = await import("@/lib/correo");
    await expect(enviarCorreo({ para: "a@b.c", asunto: "x", html: "x", texto: "x" })).rejects.toThrow(/rechazó la clave/);
  });
  it("con el backend propio configurado manda ahí (con el token) y no usa Resend", async () => {
    process.env.GESTOR_CORREO_URL = "https://nucleo.ejemplo.com/api/public/gestor-correo/";
    process.env.GESTOR_CORREO_TOKEN = "t".repeat(30);
    delete process.env.RESEND_API_KEY;
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "success" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const { enviarCorreo, correoConfigurado } = await import("@/lib/correo");
    expect(correoConfigurado()).toBe(true);
    await enviarCorreo({ para: "dueno@ejemplo.com", asunto: "Hola", html: "<b>x</b>", texto: "x" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://nucleo.ejemplo.com/api/public/gestor-correo/");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer " + "t".repeat(30));
    expect(JSON.parse(String(init.body))).toMatchObject({ para: "dueno@ejemplo.com", asunto: "Hola" });
  });
  it("traduce el rechazo del token del backend y el backend apagado", async () => {
    process.env.GESTOR_CORREO_URL = "https://nucleo.ejemplo.com/x/";
    process.env.GESTOR_CORREO_TOKEN = "t".repeat(30);
    const { enviarCorreo } = await import("@/lib/correo");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(enviarCorreo({ para: "a@b.c", asunto: "x", html: "x", texto: "x" })).rejects.toThrow(/rechazó el token/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    await expect(enviarCorreo({ para: "a@b.c", asunto: "x", html: "x", texto: "x" })).rejects.toThrow(/apagado/);
  });
});
