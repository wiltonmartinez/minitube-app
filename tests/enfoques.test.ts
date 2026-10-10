import { describe, expect, it } from "vitest";
import { ENFOQUES, edadesDelEnfoque, enfoqueDe, normalizarEnfoque } from "@/lib/enfoques";
import { planificar } from "@/lib/motor";
import { auditarPrompt } from "@/lib/prohibidos";
import { DISPOSITIVOS, ETNIAS_PANEL, PROFESIONES, buildPrompt, type PromptInput } from "@/lib/prompt-config";

function base(extra: Partial<PromptInput> = {}): PromptInput {
  const e = planificar({ marca: "Epson", modelo: "L3250", error: "Almohadillas", enfoque: "error", generarImagen: false, semilla: 11 }, "normal").entrada;
  return { ...e, marca: "", modelo: "", error: "", arquetipo: "Ninguno", genero: "Hombre", edad: "Adulto Mayor 45-55", etnia: "Latino / Mestizo", ...extra };
}

describe("Los 3 enfoques estratégicos", () => {
  it("las 16 profesiones del panel tienen un enfoque", () => {
    for (const p of PROFESIONES) expect(enfoqueDe(p), p).toBeDefined();
  });

  it("asignación según la matriz", () => {
    for (const p of ["Sublimación", "Fotocopias", "Fotografía"]) expect(enfoqueDe(p)).toBe(1);
    for (const p of ["Litografía", "Diseñador(a) Gráfico", "Recepcionista", "Profesor(a) Primaria"]) expect(enfoqueDe(p)).toBe(2);
    for (const p of ["Técnico de computadores", "Ingeniero de sistemas"]) expect(enfoqueDe(p)).toBe(3);
  });

  it("las etnias permitidas son de las 4 opciones y no se mezclan", () => {
    for (const e of [1, 2, 3] as const) for (const x of ENFOQUES[e].etnias) expect(ETNIAS_PANEL as readonly string[]).toContain(x);
    expect(ENFOQUES[1].etnias).toEqual(["Latino / Mestizo", "Afrodescendiente / Afro-latino"]);
    expect(ENFOQUES[2].etnias).toEqual(["Caucásico / Mediterráneo", "Latino / Mestizo"]);
    expect(ENFOQUES[3].etnias).toEqual(["Asiático / Coreano", "Caucásico / Mediterráneo"]);
  });

  it("normalizarEnfoque corrige etnia, edad y dispositivo", () => {
    const f = normalizarEnfoque({ profesion: "Técnico de computadores", etnia: "Latino / Mestizo", edad: "Joven 18-25", dispositivo: "Ninguno" });
    expect(f).toMatchObject({ etnia: "Asiático / Coreano", edad: "Adulto Joven 30-40", dispositivo: "PC / Laptop" });
    const g = normalizarEnfoque({ profesion: "Sublimación", etnia: "Afrodescendiente / Afro-latino", edad: "Adulto Mayor 45-55", dispositivo: "Tablet" });
    expect(g).toMatchObject({ etnia: "Afrodescendiente / Afro-latino", edad: "Adulto Mayor 45-55", dispositivo: "Smartphone" });
    expect(edadesDelEnfoque("Recepcionista")).toContain("Joven 18-25");
    expect(edadesDelEnfoque("Contador")).toBeUndefined();
    const h = { profesion: "Otra", etnia: "x", edad: "y", dispositivo: "z" };
    expect(normalizarEnfoque(h)).toEqual(h);
  });

  it("enfoque 1: smartphone, frustración y mirada hacia el error", () => {
    const p = buildPrompt(base({ profesion: "Sublimación", enfoque: 1, dispositivo: "Smartphone" }));
    expect(p).toContain("extreme frustration and shock");
    expect(p).toContain("smartphone firmly");
    expect(p).toMatch(/pulls at the hair/);
    expect(p).toContain("MIRADA FIJA Y ALTA HACIA LA IZQUIERDA");
    expect(p).not.toContain("MIRADA AL FRENTE");
  });

  it("enfoque 2: laptop, pánico, mano en la boca y cuerpo encorvado", () => {
    const p = buildPrompt(base({ profesion: "Recepcionista", enfoque: 2, dispositivo: "PC / Laptop" }));
    expect(p).toContain("panic and desperation");
    expect(p).toMatch(/covers the mouth in panic or rubs the eyes/);
    expect(p).toContain("hunched");
    expect(p).toContain("MIRADA FIJA Y ALTA HACIA LA IZQUIERDA");
  });

  it("enfoque 3: PC de escritorio, triunfo, pulgar arriba y mirada al frente", () => {
    const p = buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop", genero: "Mujer" }));
    expect(p).toContain("confidence and triumph");
    expect(p).toMatch(/thumbs up or points the index finger/);
    expect(p).toContain("leaning forward");
    expect(p).toContain("MIRADA AL FRENTE");
    expect(p).not.toContain("MIRADA FIJA Y ALTA HACIA LA IZQUIERDA");
    expect(p).not.toMatch(/panic and desperation/);
    expect(p).toContain("REGLA ESTRICTA DE EXPRESIÓN");
    expect(p).toContain("confianza absoluta");
  });

  it("auditoría: las 16 profesiones con su enfoque no generan texto ni marcas en el prompt", () => {
    for (const prof of PROFESIONES) {
      const e = enfoqueDe(prof)!;
      const f = normalizarEnfoque({ profesion: prof, etnia: "Latino / Mestizo", edad: "Joven 18-25", dispositivo: "Ninguno" });
      expect(DISPOSITIVOS as readonly string[]).toContain(f.dispositivo);
      const p = buildPrompt(base({ profesion: prof, enfoque: e, dispositivo: f.dispositivo, etnia: f.etnia as PromptInput["etnia"], edad: f.edad as PromptInput["edad"] }));
      expect(auditarPrompt(p), prof).toEqual([]);
    }
  });
});
