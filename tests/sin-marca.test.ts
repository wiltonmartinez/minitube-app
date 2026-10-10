import { describe, expect, it } from "vitest";
import { buildApiPrompt, buildPrompt, generatePrompt, marcaEquipo, type PromptInput } from "@/lib/prompt-config";
import { generarEscenario, equipoGuion } from "@/lib/guion";
import { planificar } from "@/lib/motor";

// El panel ya no pide marca, modelo ni error: la imagen es solo la persona y el fondo.
function entrada(extra: Partial<PromptInput> = {}): PromptInput {
  const base = planificar({ marca: "Epson", modelo: "L3250", error: "Almohadillas", enfoque: "error", generarImagen: false, semilla: 7 }, "normal").entrada;
  return { ...base, marca: "", modelo: "", error: "", ...extra };
}

describe("Panel sin marca, modelo ni error", () => {
  it("marcaEquipo", () => {
    expect(marcaEquipo("Epson")).toBe("Epson ");
    expect(marcaEquipo("  Canon ")).toBe("Canon ");
    expect(marcaEquipo("")).toBe("");
  });

  it("los prompts se arman sin marca: impresoras genéricas al fondo, sin huecos ni «undefined»", () => {
    for (const plotter of [false, true]) {
      for (const [nombre, p] of [["gemini", buildPrompt(entrada({ plotter }))], ["api", buildApiPrompt(entrada({ plotter }), { texto3d: false })]] as const) {
        expect(p, `${nombre}/${plotter}`).not.toMatch(/undefined|null|\{|\}/);
        expect(p, `${nombre}/${plotter}`).not.toMatch(/physical\s{2,}|\(recognizable\s{2,}|uses\s{2,}/);
        expect(p, `${nombre}/${plotter}`).toMatch(plotter ? /real, physical large-format plotters|Real physical large-format plotters|large-format plotters/i : /physical printers/i);
      }
    }
  });

  it("con marca (la API de TexTube) conserva su redacción de siempre", () => {
    const con = buildApiPrompt(entrada({ marca: "Canon" }), { texto3d: false });
    expect(con).toContain("Real physical Canon printers");
    expect(buildApiPrompt(entrada(), { texto3d: false })).toContain("Real physical printers");
  });

  it("las impresoras del fondo no nombran marca ni modelo cuando no se piden", () => {
    for (const p of [buildPrompt(entrada()), buildApiPrompt(entrada(), { texto3d: false })]) {
      for (const t of ["Epson printers", "Canon printers", "Epson large-format", "Canon large-format", "Epson plotter", "L3250"]) expect(p, t).not.toContain(t);
    }
  });

  it("generatePrompt funciona sin datos del equipo y no devuelve imagen de error", () => {
    const g = generatePrompt(entrada(), { baseUrl: "http://x" });
    expect(g.promptText).toContain("SOLO EL FONDO");
    expect(g.errorImageUrl).toBeNull();
  });
});

describe("Guion sin marca ni modelo", () => {
  it("habla de «tu impresora» o «tu plotter» cuando no se indica el equipo", () => {
    const imp = generarEscenario({ error: "Almohadillas", profesion: "Sublimación" });
    expect(imp.equipo).toBe("impresora");
    expect(imp.visual.elemento).toContain("tu impresora bloqueada");
    expect(imp.cta).toContain("llevar la impresora");
    expect(imp.desarrollo.broll[1]).toMatch(/^La impresora con/);
    const plo = generarEscenario({ error: "0014BD", profesion: "Sublimación", plotter: true });
    expect(plo.equipo).toBe("plotter");
    expect(plo.visual.elemento).toContain("tu plotter bloqueado");
    expect(plo.cta).toContain("llevar el plotter");
    expect(plo.desarrollo.broll[1]).toMatch(/^El plotter con/);
    for (const e of [imp, plo]) expect(e.texto).not.toMatch(/undefined|\{|\}|\s{2,}(?=[a-z])/);
  });

  it("solo marca, o solo modelo, también se entienden", () => {
    expect(equipoGuion("Canon", "").etiqueta).toBe("Canon");
    expect(equipoGuion("", "L3250").etiqueta).toBe("L3250");
    expect(equipoGuion("", "F570").tipo).toBe("plotter");
    expect(equipoGuion("", "", true).etiqueta).toBe("plotter");
  });

  it("todas las variantes de gancho concuerdan en género sin equipo", () => {
    for (let semilla = 0; semilla < 3; semilla++) {
      expect(generarEscenario({ error: "5b00", profesion: "Fotocopias", semilla }).gancho).not.toMatch(/llevarlo|No lo lleves/);
      expect(generarEscenario({ error: "0014BD", profesion: "Fotocopias", plotter: true, semilla }).gancho).not.toMatch(/llevarla|No la lleves/);
    }
  });
});
