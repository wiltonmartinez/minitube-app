import { afterEach, describe, expect, it, vi } from "vitest";
import { LETRAS_AB, ORDEN_AB, crearVariantes } from "@/lib/ab";
import { nombresLote, slug, type LoteItem } from "@/lib/lote";
import { GET } from "@/app/api/generate/route";
import {
  ARQUETIPOS,
  BADGES_REALES,
  EMOCIONES_AB,
  PALETAS_FIJAS,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  type EmocionAB,
  type PromptInput,
} from "@/lib/prompt-config";

const base = (extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Canon",
  modelo: "G3110",
  error: "Error 5B00",
  genero: "Mujer",
  edad: "Joven 18-25",
  etnia: "Afro-Latina",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Inglés",
  badge: BADGES_REALES.find((b) => !b.includes("%"))!,
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: PALETAS_FIJAS[0],
  arquetipo: Object.keys(ARQUETIPOS)[2],
  ...extra,
});

const sinVariables = (e: PromptInput) => {
  const { emocion, paleta, badge, ...resto } = e;
  void emocion;
  void paleta;
  void badge;
  return resto;
};

/** Generador pseudoaleatorio reproducible para las pruebas */
const semilla = (n: number) => () => {
  n = (n * 1664525 + 1013904223) >>> 0;
  return n / 4294967296;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Fase 5 · variantes A/B", () => {
  it("son 3: pánico, sorpresa y alivio, con letras A, B y C", () => {
    const v = crearVariantes(base(), { paletas: PALETAS_FIJAS, badges: BADGES_REALES });
    expect(v.map((x) => x.letra)).toEqual([...LETRAS_AB]);
    expect(v.map((x) => x.emocion)).toEqual(ORDEN_AB);
    expect(ORDEN_AB).toEqual(["panico", "sorpresa", "alivio"]);
    expect(v.map((x) => x.entrada.emocion)).toEqual(ORDEN_AB);
  });
  it("la A conserva la paleta y el badge actuales; B y C son distintos entre sí y de la A (200 sorteos)", () => {
    for (let i = 0; i < 200; i++) {
      const b = base({ paleta: PALETAS_FIJAS[i % PALETAS_FIJAS.length], badge: BADGES_REALES[i % BADGES_REALES.length] });
      const v = crearVariantes(b, { paletas: PALETAS_FIJAS, badges: BADGES_REALES, rnd: semilla(i + 1) });
      expect(v[0].entrada.paleta).toBe(b.paleta);
      expect(v[0].entrada.badge).toBe(b.badge);
      expect(new Set(v.map((x) => x.entrada.paleta)).size).toBe(3);
      expect(new Set(v.map((x) => x.entrada.badge)).size).toBe(3);
      for (const x of v) {
        expect(x.entrada.badge).not.toBe("Ninguno");
        expect(PALETAS_FIJAS).toContain(x.entrada.paleta);
        expect(BADGES_REALES).toContain(x.entrada.badge);
      }
    }
  });
  it("lo demás es idéntico en las tres: problema técnico, plano, idioma, persona, postura, gafas y profesión", () => {
    const b = base({ gafas: "Ninguna", accesorio: "Cable USB negro" });
    const v = crearVariantes(b, { paletas: PALETAS_FIJAS, badges: BADGES_REALES });
    for (const x of v) expect(sinVariables(x.entrada)).toEqual(sinVariables(b));
  });
  it("respeta los candados: con paleta o badge bloqueados no cambian", () => {
    const b = base();
    const p = crearVariantes(b, { paletas: PALETAS_FIJAS, badges: BADGES_REALES, bloquearPaleta: true });
    expect(new Set(p.map((x) => x.entrada.paleta))).toEqual(new Set([b.paleta]));
    expect(new Set(p.map((x) => x.entrada.badge)).size).toBe(3);
    const g = crearVariantes(b, { paletas: PALETAS_FIJAS, badges: BADGES_REALES, bloquearBadge: true });
    expect(new Set(g.map((x) => x.entrada.badge))).toEqual(new Set([b.badge]));
    expect(new Set(g.map((x) => x.entrada.paleta)).size).toBe(3);
  });
  it("«Ninguno» nunca se cuela aunque venga en la lista", () => {
    const v = crearVariantes(base(), { paletas: PALETAS_FIJAS, badges: ["Ninguno", ...BADGES_REALES], rnd: semilla(7) });
    for (const x of v) expect(x.entrada.badge).not.toBe("Ninguno");
  });
});

describe("Fase 5 · la emoción cambia, el resto de reglas no", () => {
  const emociones: EmocionAB[] = ["panico", "sorpresa", "alivio"];

  it("el prompt de la API describe la emoción de cada variante", () => {
    for (const e of emociones) {
      const p = buildApiPrompt(base({ emocion: e }), { texto3d: true });
      expect(p).toContain(EMOCIONES_AB[e].faceEn);
    }
    const sorpresa = buildApiPrompt(base({ emocion: "sorpresa" }), { texto3d: true });
    const alivio = buildApiPrompt(base({ emocion: "alivio" }), { texto3d: true });
    for (const p of [sorpresa, alivio]) {
      expect(p).not.toMatch(/panic|terrifying/);
      expect(p).toMatch(/Never sadness, crying, pouting/);
    }
    expect(buildApiPrompt(base({ emocion: "panico" }), { texto3d: true })).toContain("with panic");
  });
  it("el prompt de Gemini también cambia de emoción sin mencionar pánico en sorpresa y alivio", () => {
    for (const e of ["sorpresa", "alivio"] as EmocionAB[]) {
      const p = buildPrompt(base({ emocion: e }));
      expect(p).toContain(EMOCIONES_AB[e].faceEn);
      expect(p).not.toMatch(/pánico/i);
      expect(p).toContain("prohibido mirar el celular, el cable, la mano, hacia abajo o a la cámara");
    }
  });
  it("siempre se mantienen: mirada, postura, ropa lisa, impresoras, esquinas, waist up, marca de agua y negativos", () => {
    for (const e of emociones) {
      for (const texto3d of [true, false]) {
        const api = buildApiPrompt(base({ emocion: e }), { texto3d });
        for (const t of [
          "empty lower-left area of the frame",
          "never look at the camera",
          "Exactly one hand holds a modern smartphone",
          "no logos, brand names, printed text or emblems",
          "Real physical Canon printers",
          "lower-right corner free of important elements",
          "framed from the waist up at most, no hips, no legs visible",
          "Avoid:",
        ]) {
          expect(api, `${e}/${texto3d}: ${t}`).toContain(t);
        }
        if (texto3d) expect(api).toContain('"ResetEnLinea.com"');
        const g = buildPrompt(base({ emocion: e }));
        for (const t of ["REGLA DE BRANDING", "MARCA DE AGUA DE SEGURIDAD", "ANATOMÍA HUMANA IMPECABLE", "POSTURA CON CELULAR"]) {
          expect(g, `${e}: ${t}`).toContain(t);
        }
      }
    }
  });
  it("sin emoción A/B manda la del perfil (nada cambia)", () => {
    const sin = buildPrompt(base());
    expect(sin).toContain(PERFILES[Object.keys(PERFILES)[0]].en.emotion);
    expect(buildApiPrompt(base(), { texto3d: true })).toContain("with panic");
  });
});

describe("Fase 5 · lote con imágenes", () => {
  const item = (extra: Partial<LoteItem> = {}): LoteItem => ({ promptText: "p", errorImageUrl: null, ...extra });

  it("nombres únicos y ordenados: txt, prompt de la API e imagen PNG", () => {
    const n = nombresLote([
      item({ etiqueta: "A Pánico", imagenUrl: "https://v3.fal.media/a.png", promptApi: "x" }),
      item(),
      item({ etiqueta: "B Sorpresa", imagenUrl: "data:image/svg+xml;utf8,<svg/>", promptApi: "y" }),
    ]);
    expect(n.map((x) => x.txt)).toEqual(["prompt-01.txt", "prompt-02.txt", "prompt-03.txt"]);
    expect(n[0].api).toBe("prompt-01.api.txt");
    expect(n[0].imagen).toBe("imagenes/imagen-01-a-panico.png");
    expect(n[1]).toEqual({ txt: "prompt-02.txt", api: undefined, imagen: undefined });
    expect(n[2].imagen).toBe("imagenes/imagen-03-b-sorpresa.png");
    const todos = n.flatMap((x) => [x.txt, x.api, x.imagen]).filter(Boolean);
    expect(new Set(todos).size).toBe(todos.length);
  });
  it("el nombre de archivo es seguro (sin tildes, espacios ni símbolos)", () => {
    expect(slug("C Alivio / ¡Éxito!")).toBe("c-alivio-exito");
    expect(slug("***")).toBe("imagen");
    expect(slug("x".repeat(100)).length).toBeLessThanOrEqual(40);
  });
});

describe("Fase 5 · aviso de modo simulación", () => {
  it("GET ?modo=1 dice si hay simulación sin llamar a fal.ai", async () => {
    vi.stubEnv("FAL_KEY", "");
    const sim = await (await GET(new Request("http://localhost/api/generate?modo=1"))).json();
    expect(sim).toEqual({ simulacion: true });
    vi.stubEnv("FAL_KEY", "alguna-clave");
    const real = await (await GET(new Request("http://localhost/api/generate?modo=1"))).json();
    expect(real).toEqual({ simulacion: false });
    expect(JSON.stringify(real)).not.toContain("alguna-clave");
  });
});
