import { describe, expect, it } from "vitest";
import {
  ARQUETIPOS,
  BADGES_REALES,
  GAFAS,
  GAFAS_EN,
  GAFAS_ESTILOS,
  GAFAS_OPCIONES,
  GAFAS_SORTEO,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  resolverGafas,
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
  idioma: "Inglés",
  badge: BADGES_REALES.find((b) => !b.includes("%"))!,
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  // un arquetipo sin nombres propios con tilde (p. ej. «Bogotá»), para poder comprobar que no hay español
  arquetipo: Object.keys(ARQUETIPOS).find((n) => ARQUETIPOS[n].etnia === "Afrodescendiente")!,
  ...extra,
});

describe("Gafas · pasta gruesa o elegantes metálicas", () => {
  it("hay 5 de pasta, 2 metálicas (dorada y plateada) y «Ninguna»", () => {
    expect(GAFAS_ESTILOS).toHaveLength(7);
    expect(GAFAS_ESTILOS).toContain("Elegantes metálicas doradas");
    expect(GAFAS_ESTILOS).toContain("Elegantes metálicas plateadas");
    expect(GAFAS_OPCIONES).toContain("Ninguna");
    expect(GAFAS_OPCIONES.at(-1)).toBe("🎲 Aleatorio");
    expect(GAFAS["Elegantes metálicas doradas"]).toMatch(/metálica fina de color dorado/);
    expect(GAFAS["Elegantes metálicas plateadas"]).toMatch(/metálica fina de color plateado/);
  });
  it("el sorteo aleatorio puede dar cualquier estilo, también las metálicas y «Ninguna»", () => {
    expect(GAFAS_SORTEO).toHaveLength(8);
    const vistos = new Set<string>();
    for (let i = 0; i < 400; i++) vistos.add(resolverGafas("🎲 Aleatorio", () => (i % 8) / 8 + 0.01));
    expect([...vistos].sort()).toEqual([...GAFAS_SORTEO].sort());
    expect(resolverGafas("Elegantes metálicas plateadas")).toBe("Elegantes metálicas plateadas");
  });
  it("cada opción tiene su frase en inglés para la API, con cristales claros y sin logos", () => {
    for (const k of Object.keys(GAFAS)) {
      if (k === "Ninguna") expect(GAFAS_EN[k]).toBe("");
      else {
        expect(GAFAS_EN[k]).not.toMatch(/[áéíóúñ]/);
        expect(GAFAS_EN[k]).toContain("The lenses are clear and non-reflective so the eyes stay fully visible");
        expect(GAFAS_EN[k]).toContain("no logos or text");
      }
    }
    expect(GAFAS_EN["Elegantes metálicas doradas"]).toContain("thin, polished gold metal frames");
    expect(GAFAS_EN["Elegantes metálicas plateadas"]).toContain("thin, polished silver metal frames");
    expect(GAFAS_EN["Azules vidIQ"]).toContain("plastic-framed");
  });
  it("el prompt de la API usa la frase en inglés y el de Gemini la frase en español", () => {
    for (const k of GAFAS_ESTILOS) {
      const api = buildApiPrompt(base({ gafas: k }), { texto3d: true });
      expect(api).toContain(GAFAS_EN[k]);
      expect(api).not.toContain("Lleva puestas");
      expect(api).not.toMatch(/[áéíóúñ¿¡]/);
      expect(buildPrompt(base({ gafas: k }))).toContain(GAFAS[k]);
    }
    expect(buildApiPrompt(base({ gafas: "Ninguna" }), { texto3d: true })).not.toContain("glasses with");
  });
  it("las gafas no tocan el resto de reglas (mirada, postura, ropa lisa, esquinas)", () => {
    for (const k of ["Elegantes metálicas doradas", "Elegantes metálicas plateadas"]) {
      const api = buildApiPrompt(base({ gafas: k }), { texto3d: true });
      for (const t of [
        "never look at the camera",
        "Exactly one hand holds a modern smartphone",
        "no logos, brand names, printed text or emblems",
        "lower-left corner of the frame is completely empty",
        "lower-right corner free of important elements",
      ]) {
        expect(api).toContain(t);
      }
    }
  });
});
