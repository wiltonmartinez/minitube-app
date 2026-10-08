import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/thumbnail/route";
import { ARQUETIPOS } from "@/lib/prompt-config";
import { planificar } from "@/lib/motor";
import {
  ARQUETIPOS_ALTA,
  PLANO_ALTA,
  PROFESIONES_ALTA,
  elegirRuta,
  esPrioridadAlta,
  normalizarModelo,
} from "@/lib/prioridad";

const TOKEN = "token-de-prueba-muy-largo-0123456789abcdef";
const post = (cuerpo: unknown) =>
  POST(
    new Request("http://localhost/api/v1/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(cuerpo),
    }),
  );

beforeEach(() => {
  vi.stubEnv("MINITUBE_API_TOKEN", TOKEN);
  vi.stubEnv("FAL_KEY", "");
  vi.stubEnv("MINITUBE_MODELO_NORMAL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Enrutador · normalización y prioridad", () => {
  it("estos modelos son prioridad ALTA", () => {
    for (const m of [
      "F570", "f570", "sc-f570", "SC-F570", "SureColor F571", "surecolor f571", "SC F571", "T3170X", "t3170", "SC-T3170",
      "sc t3170x", "Epson SureColor SC-T3170X", "EPSON F-570", "  F570  ", "SureColor-SC_T3170",
    ]) {
      expect(esPrioridadAlta(m), m).toBe(true);
    }
  });
  it("estos modelos son prioridad NORMAL", () => {
    for (const m of ["L3250", "G6010", "T3170Z", "L3110", "ET-4850", "F5700", "F570X", "T31700", "F572", "T3270", "SC-P600", "XP-2100", "", "   ", "F"]) {
      expect(esPrioridadAlta(m), m).toBe(false);
    }
  });
  it("T3170 y T3170X son distintos pero ambos son alta", () => {
    expect(normalizarModelo("T3170")).toBe("T3170");
    expect(normalizarModelo("T3170X")).toBe("T3170X");
    expect(normalizarModelo("T3170")).not.toBe(normalizarModelo("T3170X"));
    expect(esPrioridadAlta("T3170") && esPrioridadAlta("T3170X")).toBe(true);
  });
  it("normaliza mayúsculas, espacios, guiones y prefijos", () => {
    expect(normalizarModelo("SC-F570")).toBe("F570");
    expect(normalizarModelo("SureColor F571")).toBe("F571");
    expect(normalizarModelo("sc t3170x")).toBe("T3170X");
    expect(normalizarModelo("Epson SureColor SC-T3170")).toBe("T3170");
    expect(normalizarModelo("L3250")).toBe("L3250");
    expect(normalizarModelo("SC-P600")).toBe("P600");
  });
});

describe("Enrutador · rutas y modelos de IA", () => {
  it("alta → Seedream 5.0 Pro (fal.ai, bytedance/seedream/v5/pro/text-to-image)", () => {
    const r = elegirRuta("SC-F570", {});
    expect(r.prioridad).toBe("alta");
    expect(r.modelo.id).toBe("seedream-5-pro");
    expect(r.modelo.endpoint).toBe("bytedance/seedream/v5/pro/text-to-image");
    expect(r.generacion).toBe("fal");
  });
  it("normal → FLUX.2 Pro por defecto; con «manual» no se genera nada", () => {
    expect(elegirRuta("L3250", {}).modelo.id).toBe("flux-2-pro");
    expect(elegirRuta("L3250", { MINITUBE_MODELO_NORMAL: "manual" }).generacion).toBe("manual");
    expect(elegirRuta("L3250", { MINITUBE_MODELO_NORMAL: "nano-banana-pro" }).modelo.id).toBe("nano-banana-pro");
    // la prioridad alta no depende de esa variable
    expect(elegirRuta("F570", { MINITUBE_MODELO_NORMAL: "manual" }).modelo.id).toBe("seedream-5-pro");
  });
});

describe("Prioridad ALTA · la escena (200 semillas)", () => {
  const sol = (semilla: number, modelo = "F570") => ({ marca: "Epson", modelo, error: "Almohadillas", enfoque: "error" as const, generarImagen: false, semilla });

  it("siempre: mujer joven de 20 a 30 años, plano detalle y una de las 3 profesiones", () => {
    const profesiones = new Set<string>();
    const arquetipos = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      const p = planificar(sol(s), "alta");
      const a = ARQUETIPOS[p.personaje.arquetipo];
      expect(a.genero).toBe("Mujer");
      const [min, max] = a.edadAnios.split(" to ").map(Number);
      expect(min).toBeGreaterThanOrEqual(20);
      expect(max).toBeLessThanOrEqual(30);
      expect(p.plano).toBe(PLANO_ALTA);
      expect(PLANO_ALTA).toContain("Plano Detalle");
      expect(PROFESIONES_ALTA).toContain(p.profesion as (typeof PROFESIONES_ALTA)[number]);
      profesiones.add(p.profesion);
      arquetipos.add(p.personaje.arquetipo);
    }
    expect(profesiones.size).toBe(3);
    expect(arquetipos.size).toBeGreaterThanOrEqual(8); // rasgos y etnia variados, no siempre la misma mujer
    expect(ARQUETIPOS_ALTA.length).toBeGreaterThanOrEqual(10);
  });
  it("el fondo muestra plotters de la marca, el prompt va sin texto y mantiene las reglas", () => {
    for (let s = 1; s <= 50; s++) {
      const p = planificar(sol(s), "alta");
      expect(p.promptImagen).toContain("large-format plotters");
      expect(p.promptImagen).toContain("Do not render any text");
      expect(p.promptImagen).toContain("Extreme close-up");
      expect(p.promptImagen).toContain("lower-left corner of the frame is completely empty");
      expect(p.promptImagen).toContain("lower-right corner free of important elements");
      expect(p.promptGemini).toContain("large-format plotters");
    }
  });
  it("en prioridad normal el fondo sigue mostrando impresoras (sin plotters)", () => {
    const p = planificar(sol(5, "L3250"), "normal");
    expect(p.promptImagen).toContain("printers sit on shelves");
    expect(p.promptImagen).not.toContain("plotters");
  });
  it("el vestuario y el fondo corresponden a la profesión elegida", () => {
    const vistos: Record<string, string> = {};
    for (let s = 1; s <= 60; s++) {
      const p = planificar(sol(s), "alta");
      vistos[p.profesion] = p.promptImagen;
    }
    expect(vistos["Sublimación"]).toMatch(/heat press|transfer paper|mugs/i);
    expect(vistos["Impresión en vinilo"]).toMatch(/vinyl/i);
    expect(vistos["Fotografía"]).toMatch(/softbox|photo|camera bags/i);
  });
});

describe("Prioridad en la API", () => {
  it("modelo de alta → prioridad «alta», Seedream y la escena de plotter (sin FAL_KEY: simulación)", async () => {
    const r = await post({ marca: "Epson-SC", modelo: "SureColor F571", error: "Almohadillas", semilla: 3 });
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j).toMatchObject({ prioridad: "alta", modeloIA: "Seedream 5.0 Pro", plano: PLANO_ALTA, simulacion: true });
    expect(PROFESIONES_ALTA).toContain(j.profesion);
    expect(j.personaje.genero).toBe("Mujer");
    expect(j.promptImagen).toContain("large-format plotters");
  });
  it("con FAL_KEY envía el trabajo a Seedream con la imagen 1920×1080 y cobra ≈ 0.0675", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const espia = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status_url: "https://queue.fal.run/a/requests/1/status", response_url: "https://queue.fal.run/a/requests/1" })),
    );
    vi.stubGlobal("fetch", espia);
    const r = await post({ marca: "Epson", modelo: "T3170X", error: "Almohadillas" });
    expect(r.status).toBe(202);
    const j = await r.json();
    expect(j).toMatchObject({ prioridad: "alta", costoAproxUSD: 0.0675 });
    expect(espia.mock.calls[0][0]).toBe("https://queue.fal.run/bytedance/seedream/v5/pro/text-to-image");
    expect(JSON.parse(espia.mock.calls[0][1].body).image_size).toEqual({ width: 1920, height: 1080 });
  });
  it("modelo normal → prioridad «normal» y FLUX.2 Pro", async () => {
    const j = await (await post({ marca: "Epson", modelo: "L3250", error: "Almohadillas", generarImagen: false })).json();
    expect(j).toMatchObject({ prioridad: "normal", modeloIA: "FLUX.2 Pro" });
  });
  it("normal en modo «manual»: 429 con el promptGemini y SIN llamar a ningún modelo de pago", async () => {
    vi.stubEnv("FAL_KEY", "k");
    vi.stubEnv("MINITUBE_MODELO_NORMAL", "manual");
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const r = await post({ marca: "Epson", modelo: "L3250", error: "Almohadillas" });
    expect(r.status).toBe(429);
    const j = await r.json();
    expect(j.error.codigo).toBe("CUOTA_AGOTADA");
    expect(j.promptGemini).toContain("REGLA DE BRANDING");
    expect(espia).not.toHaveBeenCalled();
  });
  it("la prioridad alta sigue generando aunque la normal esté en «manual»", async () => {
    vi.stubEnv("MINITUBE_MODELO_NORMAL", "manual");
    const r = await post({ marca: "Epson", modelo: "F570", error: "Almohadillas" });
    expect(r.status).toBe(200);
    expect((await r.json()).prioridad).toBe("alta");
  });
  it("sin sobrescribir: solo prompt de un plotter no consume nada", async () => {
    const espia = vi.fn();
    vi.stubGlobal("fetch", espia);
    const j = await (await post({ marca: "Epson", modelo: "F570", error: "Almohadillas", generarImagen: false })).json();
    expect(j).toMatchObject({ prioridad: "alta", imagen: null, costoAproxUSD: 0 });
    expect(espia).not.toHaveBeenCalled();
  });
});
