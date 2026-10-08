import { describe, expect, it } from "vitest";
import {
  ARQUETIPOS,
  BADGES_REALES,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  type PromptInput,
} from "@/lib/prompt-config";

const LATINAS = Object.entries(ARQUETIPOS).filter(([, a]) => a.id.startsWith("mujer-") && a.origen && a.edad === "Joven 18-25");
const NUEVOS_IDS = [
  "mujer-mexicana", "mujer-colombiana-costena", "mujer-argentina", "mujer-chilena", "mujer-peruana",
  "mujer-venezolana", "mujer-cubana", "mujer-brasilena", "mujer-ecuatoriana", "mujer-costarricense",
];

const base = (nombre: string, extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  genero: "Hombre",
  edad: "Adulto Mayor 45-55",
  etnia: "Asiática del Este",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Inglés",
  badge: BADGES_REALES.find((b) => !b.includes("%"))!,
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  arquetipo: nombre,
  ...extra,
});

describe("10 arquetipos de mujeres latinas de 20 a 30 años", () => {
  it("existen las 10, de países distintos, con edades entre 20 y 30", () => {
    const nuevas = Object.values(ARQUETIPOS).filter((a) => NUEVOS_IDS.includes(a.id));
    expect(nuevas).toHaveLength(10);
    expect(LATINAS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(nuevas.map((a) => a.origen!.es)).size).toBe(10);
    for (const a of nuevas) {
      expect(a.genero).toBe("Mujer");
      const [min, max] = a.edadAnios.split(" to ").map(Number);
      expect(min).toBeGreaterThanOrEqual(20);
      expect(max).toBeLessThanOrEqual(30);
    }
  });
  it("cubren los países pedidos (México, Colombia, Argentina, Chile) y más", () => {
    const paises = Object.values(ARQUETIPOS).filter((a) => NUEVOS_IDS.includes(a.id)).map((a) => a.origen!.es);
    for (const p of ["Mexicana", "Argentina", "Chilena", "Peruana", "Venezolana", "Brasileña"]) {
      expect(paises.some((x) => x.startsWith(p))).toBe(true);
    }
    expect(paises.some((x) => x.startsWith("Colombiana"))).toBe(true);
  });
  it("son diferentes entre sí: cabello, rostro y cuerpo no se repiten", () => {
    const nuevas = Object.values(ARQUETIPOS).filter((a) => NUEVOS_IDS.includes(a.id));
    expect(new Set(nuevas.map((a) => a.cabello.en)).size).toBe(10);
    expect(new Set(nuevas.map((a) => a.rasgosFaciales.forma)).size).toBe(10);
    expect(new Set(nuevas.map((a) => a.rasgosFaciales.ojos)).size).toBe(10);
    expect(new Set(nuevas.map((a) => a.origen!.en)).size).toBe(10);
  });
  it("el prompt nombra el país (no una etnia genérica) y no se contradice con el formulario", () => {
    for (const [nombre, a] of LATINAS.filter(([, x]) => NUEVOS_IDS.includes(x.id))) {
      const api = buildApiPrompt(base(nombre), { texto3d: true });
      const desc = api.match(/On the right side of the frame, (.+?), working as/)![1];
      expect(desc).toContain(a.origen!.en.replace("{n}", "woman"));
      expect(desc).toContain(`aged ${a.edadAnios}`);
      expect(desc).not.toMatch(/\b(man|Asian|Caucasian)\b(?! of)/); // el formulario decía «hombre asiático»: manda el arquetipo
      expect(api).toContain("natural harmonious beauty");
      expect(api).toContain("no plastic or airbrushed skin");
      const g = buildPrompt(base(nombre));
      expect(g).toContain(a.origen!.en.replace("{n}", "woman"));
      expect(g).toContain("atractivas pero reales");
    }
  });
  it("mantienen todas las reglas (mirada, postura, ropa lisa, esquinas, waist up, marca de agua)", () => {
    for (const [nombre] of LATINAS) {
      const api = buildApiPrompt(base(nombre), { texto3d: true });
      for (const t of [
        "never look at the camera",
        "Exactly one hand holds a modern smartphone",
        "no logos, brand names, printed text or emblems",
        "lower-left corner of the frame is completely empty",
        "lower-right corner free of important elements",
        "framed from the waist up at most, no hips, no legs visible",
        '"ResetEnLinea.com"',
      ]) {
        expect(api, `${nombre}: ${t}`).toContain(t);
      }
    }
  });
});
