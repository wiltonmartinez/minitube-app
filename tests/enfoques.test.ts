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
    expect(p).toContain("MIRADA FIJA AL FRENTE HACIA LA IZQUIERDA");
    expect(p).toContain("brillantes y seguros");
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

describe("Enfoque 3 en el guion y en el panel", () => {
  it("técnicos e ingenieros: autoridad y seguridad, sin pánico ni angustia", async () => {
    const { generarEscenario } = await import("@/lib/guion");
    for (const prof of ["Técnico de Impresoras", "Técnico de computadores", "Ingeniero de sistemas"]) {
      for (let n = 0; n < 6; n++) {
        const g = generarEscenario({ error: "Almohadillas", profesion: prof, dispositivo: "PC / Laptop", enfoque: 3, semilla: n });
        expect(g.texto, prof).not.toMatch(/pánico|angustia|frustraci|manos en la cabeza|plata que no entra|desesper/i);
        expect(g.visual.personaje).toMatch(/seguridad y autoridad/);
        expect(g.visual.manos).toMatch(/pulgar arriba|monitor/);
        expect(g.gancho).not.toMatch(/\{/);
      }
    }
  });

  it("sin enfoque, el guion de un técnico no cambia", async () => {
    const { generarEscenario } = await import("@/lib/guion");
    const g = generarEscenario({ error: "Almohadillas", profesion: "Técnico de computadores", semilla: 0 });
    expect(g.visual.personaje).toMatch(/angustia/);
  });
});

describe("Coherencia de emoción, mirada y manos en los 3 enfoques", () => {
  const casos: [1 | 2 | 3, string, string][] = [[1, "Sublimación", "extreme frustration and shock"], [2, "Recepcionista", "panic and desperation"], [3, "Técnico de Impresoras", "confidence and triumph"]];
  for (const [e, prof, cara] of casos) {
    it(`enfoque ${e}: el texto del panel y el prompt dicen lo mismo`, () => {
      const info = ENFOQUES[e];
      const p = buildPrompt(base({ profesion: prof, enfoque: e, dispositivo: info.dispositivo }));
      expect(p).toContain(cara);
      expect(info.mirada.length).toBeGreaterThan(10);
      expect(info.manos.length).toBeGreaterThan(30);
      if (e === 3) {
        expect(info.emocion).toMatch(/Confianza/);
        expect(p).toContain("brillantes y seguros");
        expect(p).not.toContain("desorbitados por el pánico");
      }
    });
  }
});

describe("Dirección de la mirada (el personaje está a la derecha)", () => {
  const dir = async () => await import("@/lib/prompt-config");
  const MARCAS_REGLA = ["MIRADA FIJA AL FRENTE HACIA LA IZQUIERDA", "MIRADA FIJA Y ALTA HACIA LA IZQUIERDA", "MIRADA FIJA RECTO HACIA ABAJO", "MIRADA FIJA A LA PANTALLA A SU DERECHA"];
  it("cuatro opciones y cada una produce su propia regla", async () => {
    const { MIRADA_OPCIONES, MIRADA_DEFECTO, MIRADA_TEXTO } = await dir();
    expect(MIRADA_OPCIONES).toHaveLength(4);
    expect(MIRADA_TEXTO).toHaveLength(4);
    expect(MIRADA_DEFECTO).toBe(MIRADA_OPCIONES[1]);
    const mk = (mirada?: string) => buildPrompt(base({ profesion: "Sublimación", enfoque: 1, dispositivo: "Smartphone", mirada }));
    expect(mk()).toBe(mk(MIRADA_OPCIONES[1]));
    MIRADA_OPCIONES.forEach((o, i) => {
      const p = mk(o);
      expect(p).toContain(MARCAS_REGLA[i]);
      MARCAS_REGLA.forEach((m, j) => j !== i && expect(p).not.toContain(m));
      expect(p).toContain("por la frustración extrema y el shock");
    });
  });
  it("el enfoque 3 admite las cuatro con mirada segura y por defecto va al frente", async () => {
    const { MIRADA_OPCIONES, MIRADA_DEFECTO_EXPERTO } = await dir();
    expect(MIRADA_DEFECTO_EXPERTO).toBe(MIRADA_OPCIONES[0]);
    expect(buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop" }))).toContain(MARCAS_REGLA[0]);
    for (const m of MIRADA_OPCIONES) {
      const p = buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop", mirada: m }));
      expect(p).toContain("brillantes y seguros");
      expect(p).not.toMatch(/desorbitados por el pánico|por la frustración/);
    }
  });
});
