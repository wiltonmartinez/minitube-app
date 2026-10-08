import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/generate/route";
import { explicarError } from "@/lib/fal-helpers";
import { MODELOS, buscarModelo } from "@/lib/image-models";
import {
  ACCESORIOS_MANO,
  ARQUETIPOS,
  BADGES_REALES,
  BADGE_ALEATORIO,
  PERFILES,
  buildPrompt,
  cerebroPostura,
  resolverBadge,
  type PromptInput,
} from "@/lib/prompt-config";

const base = (extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  genero: "Mujer",
  edad: "Joven 18-25",
  etnia: "Afro-Latina",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Español",
  badge: BADGES_REALES[0],
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: "Amarillo intenso",
  arquetipo: "Ninguno (usar selectores manuales)",
  ...extra,
});

const pedir = (cuerpo: unknown) =>
  new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify(cuerpo) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("catálogo de modelos de fal.ai", () => {
  it("tiene los 4 modelos con endpoints exactos", () => {
    expect(MODELOS.map((m) => m.endpoint)).toEqual([
      "openai/gpt-image-2",
      "fal-ai/nano-banana-pro",
      "bytedance/seedream/v5/pro/text-to-image",
      "fal-ai/flux-2-pro",
    ]);
  });
  it("todas las entradas llevan el prompt y piden 16:9 dentro de los límites del modelo", () => {
    for (const m of MODELOS) {
      const e = m.entrada("hola") as Record<string, unknown>;
      expect(e.prompt).toBe("hola");
    }
    const gpt = buscarModelo("gpt-image-2")!.entrada("x").image_size as { width: number; height: number };
    expect(gpt.width % 16).toBe(0);
    expect(gpt.height % 16).toBe(0);
    expect(gpt.width * gpt.height).toBeGreaterThanOrEqual(655_360);
    expect(gpt.width / gpt.height).toBeCloseTo(16 / 9, 2);

    const sd = buscarModelo("seedream-5-pro")!.entrada("x").image_size as { width: number; height: number };
    expect(sd.width * sd.height).toBeGreaterThanOrEqual(1024 * 1024);
    expect(sd.width * sd.height).toBeLessThanOrEqual(2048 * 2048);
    expect(sd.width / sd.height).toBeCloseTo(16 / 9, 2);

    expect(buscarModelo("nano-banana-pro")!.entrada("x").aspect_ratio).toBe("16:9");
    expect(buscarModelo("flux-2-pro")!.entrada("x").image_size).toBe("landscape_16_9");
  });
});

describe("ruta /api/generate", () => {
  it("sin FAL_KEY devuelve la simulación 16:9 sin llamar a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "");
    const fetchEspia = vi.fn();
    vi.stubGlobal("fetch", fetchEspia);
    const res = await POST(pedir({ prompt: "prueba", modelo: "flux-2-pro", aspectRatio: "16:9" }));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.simulacion).toBe(true);
    expect(j.estado).toBe("completado");
    expect(decodeURIComponent(j.imagenUrl)).toContain("SIMULACIÓN");
    expect(decodeURIComponent(j.imagenUrl)).toContain("FLUX.2 Pro");
    expect(fetchEspia).not.toHaveBeenCalled();
  });
  it("valida prompt, modelo y formato", async () => {
    vi.stubEnv("FAL_KEY", "");
    expect((await POST(pedir({ prompt: "", modelo: "flux-2-pro" }))).status).toBe(400);
    expect((await POST(pedir({ prompt: "x", modelo: "inventado" }))).status).toBe(400);
    expect((await POST(pedir({ prompt: "x", modelo: "flux-2-pro", aspectRatio: "1:1" }))).status).toBe(400);
    expect((await POST(pedir({ prompt: "x".repeat(13000), modelo: "flux-2-pro" }))).status).toBe(400);
  });
  it("con FAL_KEY envía el trabajo a la cola con la clave solo en el servidor", async () => {
    vi.stubEnv("FAL_KEY", "clave-de-prueba");
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status_url: "https://queue.fal.run/a/requests/1/status",
          response_url: "https://queue.fal.run/a/requests/1",
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchFalso);
    const res = await POST(pedir({ prompt: "hola", modelo: "seedream-5-pro" }));
    const j = await res.json();
    expect(j.estado).toBe("en_cola");
    expect(JSON.stringify(j)).not.toContain("clave-de-prueba");
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://queue.fal.run/bytedance/seedream/v5/pro/text-to-image");
    expect((init.headers as Record<string, string>).Authorization).toBe("Key clave-de-prueba");
  });
  it("rechaza consultar direcciones que no sean de la cola de fal.ai (anti-SSRF)", async () => {
    vi.stubEnv("FAL_KEY", "k");
    const fetchEspia = vi.fn();
    vi.stubGlobal("fetch", fetchEspia);
    const q = new URLSearchParams({ statusUrl: "http://169.254.169.254/", responseUrl: "https://evil.example/x" });
    const res = await GET(new Request(`http://localhost/api/generate?${q}`));
    expect(res.status).toBe(400);
    expect(fetchEspia).not.toHaveBeenCalled();
  });
  it("explica los errores de fal.ai en español", () => {
    expect(explicarError(401, "")).toContain("FAL_KEY");
    expect(explicarError(402, "")).toContain("saldo");
    expect(explicarError(429, "")).toContain("demasiadas");
    expect(explicarError(500, "")).toContain("temporal");
  });
});

describe("reglas que deben seguir intactas", () => {
  it("el cerebro de postura es mutuamente excluyente (nunca más de 2 manos)", () => {
    const celular = cerebroPostura("Teléfono celular");
    const cable = cerebroPostura("Cable USB negro");
    const cabeza = cerebroPostura("Manos a la cabeza (sin objeto)");
    expect(celular.estado).toBe("celular");
    expect(cable.estado).toBe("cable");
    expect(cabeza.estado).toBe("cabeza");
    expect(cabeza.accesorio).toBe("Manos a la cabeza (sin objeto)");
    expect(cerebroPostura("cualquier cosa").estado).toBe("cabeza");
    for (const p of [celular, cable]) expect(p.manosEn).toContain("exactly one hand");
    expect(cabeza.manosEn).not.toMatch(/smartphone|USB/);
  });
  it("cada prompt contiene exactamente una postura y la marca de agua", () => {
    for (const acc of [...ACCESORIOS_MANO, "Manos en la impresora", "Manos a la cabeza (sin objeto)"]) {
      const p = buildPrompt(base({ accesorio: acc }));
      const posturas = ["POSTURA CON CELULAR", "POSTURA CON CABLE USB", "POSTURA CON PORTÁTIL", "POSTURA CON TABLET", "POSTURA CON IMPRESORA", "POSTURA MANOS A LA CABEZA"].filter((t) =>
        p.includes(t),
      );
      expect(posturas).toHaveLength(1);
      expect(p).toContain("ResetEnLinea.com");
      expect(p).toContain("ANATOMÍA HUMANA IMPECABLE");
    }
  });
  it("con arquetipo, el género del prompt coincide con el del arquetipo", () => {
    for (const [nombre, a] of Object.entries(ARQUETIPOS)) {
      // el formulario dice lo contrario a propósito: el arquetipo manda
      const p = buildPrompt(base({ arquetipo: nombre, genero: a.genero === "Mujer" ? "Hombre" : "Mujer" }));
      const desc = p.match(/On the right side of the frame, (.+?), working as/)![1];
      expect(/ woman /.test(` ${desc} `)).toBe(a.genero === "Mujer");
    }
  });
  it("el badge aleatorio nunca es «Ninguno»", () => {
    for (let i = 0; i < 1000; i++) {
      const b = resolverBadge(BADGE_ALEATORIO);
      expect(b).not.toBe("Ninguno");
      expect(BADGES_REALES).toContain(b);
    }
  });
});
