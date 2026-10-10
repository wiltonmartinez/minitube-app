import { describe, expect, it } from "vitest";
import { generarEscenario } from "@/lib/guion";
import { planificar } from "@/lib/motor";
import { auditarPrompt } from "@/lib/prohibidos";
import {
  DISPOSITIVOS,
  PROFESIONES,
  buildApiPrompt,
  buildPrompt,
  edadExacta,
  esPerfilTecnico,
  posturaDispositivo,
  rangoDeEdad,
  type PromptInput,
} from "@/lib/prompt-config";

function base(extra: Partial<PromptInput> = {}): PromptInput {
  const e = planificar({ marca: "Epson", modelo: "L3250", error: "Almohadillas", enfoque: "error", generarImagen: false, semilla: 11 }, "normal").entrada;
  return { ...e, marca: "", modelo: "", error: "", arquetipo: "Ninguno", genero: "Hombre", edad: "Adulto Mayor 45-55", ...extra };
}

describe("Edad exacta", () => {
  it("solo acepta enteros de 16 a 85", () => {
    expect(edadExacta("42")).toBe(42);
    expect(edadExacta(" 42 ")).toBe(42);
    expect(edadExacta(16)).toBe(16);
    expect(edadExacta("85")).toBe(85);
    for (const malo of ["", "  ", "15", "86", "4.5", "-3", "abc", "1e2", "0042x", undefined, null]) expect(edadExacta(malo as never), String(malo)).toBeUndefined();
  });

  it("el rango interno sigue a la edad exacta", () => {
    expect(rangoDeEdad(18)).toBe("Joven 18-25");
    expect(rangoDeEdad(25)).toBe("Joven 18-25");
    expect(rangoDeEdad(26)).toBe("Adulto Joven 30-40");
    expect(rangoDeEdad(42)).toBe("Adulto Mayor 45-55");
    expect(rangoDeEdad(55)).toBe("Adulto Mayor 45-55");
    expect(rangoDeEdad(60)).toBe("Adulto Maduro 56-65");
    expect(rangoDeEdad(70)).toBe("Mayor 66-70");
  });

  it("el prompt dice «aged 42» en lugar del rango, en el de Gemini y en el de la API", () => {
    for (const p of [buildPrompt(base({ edadAnios: 42 })), buildApiPrompt(base({ edadAnios: 42 }), { texto3d: false })]) {
      expect(p).toContain("aged 42");
      expect(p).not.toContain("aged 45 to 55");
    }
    expect(buildApiPrompt(base(), { texto3d: false })).toContain("aged 45 to 55"); // sin edad exacta, todo igual que antes
  });
});

describe("Dispositivo y mapeo de las manos", () => {
  const frases: Record<string, RegExp[]> = {
    Smartphone: [/right hand holds a modern smartphone/, /left hand is pressed against the temple/],
    "PC / Laptop": [/right hand rests on a computer mouse/, /left hand grabs the face or covers the mouth/],
    Tablet: [/left hand holds a modern tablet/, /right hand is suspended halfway in the air or placed on the head/],
  };

  it("cada dispositivo fija la postura de las dos manos en el prompt de la API y en el de Gemini", () => {
    for (const d of DISPOSITIVOS) {
      const api = buildApiPrompt(base({ dispositivo: d }), { texto3d: false });
      for (const f of frases[d]) expect(api, d).toMatch(f);
      const gemini = buildPrompt(base({ dispositivo: d }));
      const bloque = d === "Smartphone" ? "POSTURA CON SMARTPHONE" : d === "Tablet" ? "POSTURA CON TABLET" : "POSTURA CON PC / LAPTOP";
      expect(gemini, d).toContain(bloque);
    }
  });

  it("el dispositivo manda sobre el accesorio: no se mezclan dos posturas", () => {
    const api = buildApiPrompt(base({ dispositivo: "PC / Laptop", accesorio: "Teléfono celular" }), { texto3d: false });
    expect(api).toMatch(/computer mouse/);
    expect(api).not.toContain("Exactly one hand holds a modern smartphone with its screen on, low in the frame and passively");
    const gemini = buildPrompt(base({ dispositivo: "Tablet", accesorio: "Cable USB negro" }));
    expect(gemini).toContain("POSTURA CON TABLET");
    expect(gemini).not.toContain("POSTURA CON CABLE USB");
    expect(gemini.split("POSTURA CON").length - 1).toBe(1); // exactamente una postura
  });

  it("en un perfil técnico, el PC lleva pulgar arriba o señalar la pantalla", () => {
    expect(esPerfilTecnico("Técnico de Impresoras")).toBe(true);
    expect(esPerfilTecnico("Sublimación")).toBe(false);
    expect(buildApiPrompt(base({ dispositivo: "PC / Laptop", profesion: "Técnico de Impresoras" }), { texto3d: false })).toMatch(/thumbs up or points at the screen/);
    expect(buildApiPrompt(base({ dispositivo: "PC / Laptop", profesion: "Sublimación" }), { texto3d: false })).not.toMatch(/thumbs up/);
  });

  it("sin dispositivo no cambia nada respecto a la postura de siempre", () => {
    expect(posturaDispositivo(undefined)).toBeNull();
    expect(posturaDispositivo("Ninguno (usar la postura de abajo)")).toBeNull();
    expect(buildApiPrompt(base({ accesorio: "Teléfono celular" }), { texto3d: false })).toContain("Exactly one hand holds a modern smartphone");
  });

  it("todas las profesiones × dispositivos pasan la auditoría de palabras prohibidas y mantienen las reglas de siempre", () => {
    for (const profesion of PROFESIONES) {
      for (const dispositivo of DISPOSITIVOS) {
        const e = base({ profesion, dispositivo, edadAnios: 42 });
        for (const [n, p] of [["gemini", buildPrompt(e)], ["api", buildApiPrompt(e, { texto3d: false })]] as const) {
          expect(auditarPrompt(p), `${profesion}/${dispositivo}/${n}`).toEqual([]);
          expect(p, `${profesion}/${dispositivo}/${n}`).not.toMatch(/undefined|\{|\}/);
        }
        const api = buildApiPrompt(e, { texto3d: false });
        for (const t of ["exactly two hands", "lower-left corner", "framed from the waist up at most"]) {
          expect(api.toLowerCase(), `${profesion}/${dispositivo}: ${t}`).toContain(t.toLowerCase());
        }
      }
    }
  });

  it("las emociones de alivio y sorpresa adaptan las palabras de las manos", () => {
    for (const emocion of ["alivio", "sorpresa"] as const) {
      const api = buildApiPrompt(base({ dispositivo: "PC / Laptop", emocion }), { texto3d: false });
      expect(api, emocion).not.toMatch(/frustration|desperation/);
    }
  });
});

describe("Guion con género, edad y dispositivo", () => {
  it("agrega «Edad y género» y «Dispositivo y postura de manos» solo si se eligen", () => {
    const sin = generarEscenario({ error: "Almohadillas", profesion: "Fotografía" });
    expect(sin.visual.edadGenero).toBeUndefined();
    expect(sin.visual.manos).toBeUndefined();
    expect(sin.texto).not.toContain("Edad y género");
    const con = generarEscenario({ error: "Almohadillas", profesion: "Fotografía", genero: "Hombre", edadAnios: 42, dispositivo: "PC / Laptop" });
    expect(con.visual.edadGenero).toBe("Hombre de 42 años, con el rostro real de esa edad (no un modelo de stock).");
    expect(con.visual.manos).toContain("mano derecha en el ratón");
    expect(con.visual.manos).toContain("frustración");
    expect(con.texto).toContain("• Edad y género:");
    expect(con.texto).toContain("• Dispositivo y postura de manos:");
  });

  it("el dispositivo y el género cambian según la profesión técnica y el género elegido", () => {
    expect(generarEscenario({ error: "5b00", profesion: "Técnico de Impresoras", dispositivo: "PC / Laptop" }).visual.manos).toMatch(/pulgar arriba|señala/);
    expect(generarEscenario({ error: "5b00", profesion: "Fotografía", genero: "Mujer", edadAnios: 31 }).visual.edadGenero).toMatch(/^Mujer de 31 años/);
    expect(generarEscenario({ error: "5b00", profesion: "Fotografía", edadAnios: 31 }).visual.edadGenero).toMatch(/^Persona de 31 años/);
    expect(generarEscenario({ error: "5b00", profesion: "Fotografía", dispositivo: "Tablet" }).visual.manos).toContain("mano izquierda sostiene la tablet");
  });
});
