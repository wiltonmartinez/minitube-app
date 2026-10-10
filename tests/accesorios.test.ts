import { describe, expect, it } from "vitest";
import {
  ACCESORIOS,
  ACCESORIOS_FIJOS,
  ACCESORIOS_MANO,
  ACCESORIO_ALEATORIO,
  ARQUETIPOS,
  BADGES_REALES,
  PERFILES,
  PESOS_GENERAL,
  PESOS_TECNICO,
  buildApiPrompt,
  buildPrompt,
  cerebroPostura,
  posturaDe,
  accesorioDePostura,
  POSTURA_ACCESORIO,
  POSTURA_CABEZA,
  POSTURA_OPCIONES,
  resolverAccesorio,
  type PromptInput,
} from "@/lib/prompt-config";

const base = (extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  genero: "Hombre",
  edad: "Adulto Joven 30-40",
  etnia: "Caucásica/Europea",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Inglés",
  badge: BADGES_REALES.find((b) => !b.includes("%"))!,
  gafas: "Ninguna",
  accesorio: "Portátil",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  arquetipo: Object.keys(ARQUETIPOS)[0],
  ...extra,
});

const TODOS = [...ACCESORIOS_MANO, "Manos en la impresora", "Escribiendo en una laptop", "Manos a la cabeza (sin objeto)"];

describe("Accesorios · portátil y tablet", () => {
  it("el catálogo tiene 5 opciones y la frase exacta de cada accesorio", () => {
    expect(ACCESORIOS_FIJOS).toEqual(["Cable USB negro", "Teléfono celular", "Portátil", "Tablet", "Manos en la impresora", "Escribiendo en una laptop", "Manos a la cabeza (sin objeto)"]);
    expect(ACCESORIOS_MANO).toEqual(["Cable USB negro", "Teléfono celular", "Portátil", "Tablet"]);
    expect(ACCESORIOS["Portátil"].unaMano).toBe(true);
    expect(ACCESORIOS["Tablet"].unaMano).toBe(true);
  });
  it("el cerebro de postura tiene un estado por accesorio y todos son de dos manos exactas", () => {
    expect(cerebroPostura("Portátil").estado).toBe("portatil");
    expect(cerebroPostura("Tablet").estado).toBe("tablet");
    for (const a of ACCESORIOS_MANO) {
      const p = cerebroPostura(a);
      expect(p.manosEn).toContain("exactly one hand");
      expect(p.manosEn).toMatch(/other hand rests (firmly )?on the table or gestures/);
      expect(p.reglas.join(" ")).toMatch(/PROHIBIDO que una mano vaya a la cabeza/);
      expect(p.reglasEn.join(" ")).toMatch(/No hand touches the head, nose, eyes or face/);
      expect(p.manosEn).not.toMatch(/head|hair/);
    }
  });
  it("cada prompt (Gemini y API) tiene exactamente una postura, con y sin texto 3D", () => {
    const etiquetas = ["POSTURA CON CELULAR", "POSTURA CON CABLE USB", "POSTURA CON PORTÁTIL", "POSTURA CON TABLET", "POSTURA CON IMPRESORA", "POSTURA ESCRIBIENDO EN LAPTOP", "POSTURA MANOS A LA CABEZA"];
    for (const nombre of Object.keys(ARQUETIPOS)) {
      for (const a of TODOS) {
        const g = buildPrompt(base({ arquetipo: nombre, accesorio: a }));
        expect(etiquetas.filter((t) => g.includes(t))).toHaveLength(1);
        for (const texto3d of [true, false]) {
          const p = buildApiPrompt(base({ arquetipo: nombre, accesorio: a }), { texto3d });
          const objeto = (p.match(/Exactly one hand holds/g) ?? []).length;
          const cabeza = (p.match(/Both hands are placed on the sides of the head/g) ?? []).length;
          const impresora = (p.match(/Both hands touch the very same single/g) ?? []).length;
          const teclea = (p.match(/Both hands are typing on the keyboard/g) ?? []).length;
          expect(objeto + cabeza + impresora + teclea).toBe(1);
        }
      }
    }
  });
  it("con portátil o tablet no hay manos a la cabeza, y con manos a la cabeza no hay ningún objeto", () => {
    for (const a of ["Portátil", "Tablet"]) {
      const p = buildApiPrompt(base({ accesorio: a }), { texto3d: true });
      expect(p).not.toContain("Both hands are placed on the sides of the head");
      expect(p).toContain(a === "Portátil" ? "closed slim laptop" : "modern tablet");
    }
    const c = buildApiPrompt(base({ accesorio: "Manos a la cabeza (sin objeto)" }), { texto3d: true });
    expect(c).not.toContain("Exactly one hand holds");
    expect(c).toContain("there is no object in the frame");
    expect(posturaDe("Portátil")).toBe(posturaDe("Tablet"));
  });
  it("la mirada prohíbe mirar cualquier accesorio y las esquinas inferiores siguen libres", () => {
    for (const a of ACCESORIOS_MANO) {
      const api = buildApiPrompt(base({ accesorio: a }), { texto3d: true });
      expect(api).toContain("the hand, the phone, the cable, the laptop, the tablet, the printer or the keyboard");
      expect(api).toContain("lower-left corner of the frame is completely empty");
      expect(api).toContain("lower-right corner free of important elements");
      const g = buildPrompt(base({ accesorio: a }));
      expect(g).toContain("prohibido mirar hacia arriba, a la cámara, el accesorio (celular, cable, portátil o tablet), la impresora, el teclado o la mano");
    }
    for (const a of ["Portátil", "Tablet"]) {
      expect(cerebroPostura(a).reglasEn.join(" ")).toContain("away from the lower corners");
    }
  });
  it("el sorteo «según perfil» reparte entre las 7 opciones con probabilidades que suman 1", () => {
    expect(PESOS_TECNICO.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(PESOS_GENERAL.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(PESOS_TECNICO).toHaveLength(7);
    expect(PESOS_GENERAL).toHaveLength(7);
    for (const perfil of ["Técnico de Impresoras", "Recepcionista"]) {
      const cuenta: Record<string, number> = {};
      const N = 20000;
      for (let i = 0; i < N; i++) {
        const a = resolverAccesorio(ACCESORIO_ALEATORIO, perfil, (i + 0.5) / N);
        cuenta[a] = (cuenta[a] ?? 0) + 1;
      }
      expect(Object.keys(cuenta).sort()).toEqual([...ACCESORIOS_FIJOS].sort());
      const pesos = perfil === "Técnico de Impresoras" ? PESOS_TECNICO : PESOS_GENERAL;
      ACCESORIOS_FIJOS.forEach((a, k) => expect(cuenta[a] / N).toBeCloseTo(pesos[k], 1));
    }
    expect(resolverAccesorio("Tablet", "Recepcionista", 0.1)).toBe("Tablet"); // lo elegido a mano se respeta
  });

  it("manos en la impresora: las DOS manos tocan la MISMA impresora del modelo elegido", () => {
    const p = cerebroPostura("Manos en la impresora", "Epson L3110");
    expect(p.estado).toBe("impresora");
    expect(p.manosEn).toContain("both hands resting on the very same Epson L3110 printer");
    expect(p.reglasEn.join(" ")).toContain("Both hands touch the very same single Epson L3110 printer");
    expect(p.reglas.join(" ")).toContain("MISMA impresora Epson L3110");
    expect(p.reglas.join(" ")).toMatch(/PROHIBIDO que una mano vaya a la cabeza/);
    expect(p.manosEn).not.toMatch(/head|hair/);
    expect(posturaDe("Manos en la impresora")).toBe("Ambas manos en la impresora");
    expect(posturaDe("Manos en la impresora")).not.toBe(posturaDe("Tablet"));
  });
  it("en los prompts: usa el modelo seleccionado, una sola impresora cerca y lejos de las esquinas inferiores", () => {
    for (const marca of ["Epson", "Canon"]) {
      const b = base({ accesorio: "Manos en la impresora", marca, modelo: "X123" });
      const api = buildApiPrompt(b, { texto3d: true });
      expect(api).toContain(`very same single ${marca} X123 printer`);
      expect(api).toContain("The only printer in the foreground is the single one both hands are touching");
      expect(api).not.toContain("There are no printers in the foreground");
      expect(api).toContain("well away from both lower corners");
      expect(api).toContain("no legible logos or text on its body");
      expect(api).toContain("lower-left corner of the frame is completely empty");
      expect(api).toContain("lower-right corner free of important elements");
      expect(api).not.toContain("Both hands are placed on the sides of the head");
      const g = buildPrompt(b);
      expect(g).toContain(`MISMA impresora ${marca} X123`);
      expect(g).toContain("la ÚNICA impresora que puede verse de cerca es la que las dos manos tocan");
      expect(g).not.toContain("PROHIBIDO generar impresoras en primer plano o en la esquina inferior izquierda:");
      expect(g).toContain("ÁREA DE MONTAJE LIBRE");
    }
  });
  it("con los demás accesorios la regla de impresoras solo al fondo sigue igual", () => {
    for (const a of [...ACCESORIOS_MANO, "Manos a la cabeza (sin objeto)"]) {
      expect(buildApiPrompt(base({ accesorio: a }), { texto3d: true })).toContain("There are no printers in the foreground.");
      expect(buildPrompt(base({ accesorio: a }))).toContain("PROHIBIDO generar impresoras en primer plano o en la esquina inferior izquierda:");
    }
  });
  it("la mirada nunca va a la impresora ni a las manos", () => {
    const api = buildApiPrompt(base({ accesorio: "Manos en la impresora" }), { texto3d: false });
    expect(api).toContain("the tablet, the printer or the keyboard, and never look downward");
    expect(buildPrompt(base({ accesorio: "Manos en la impresora" }))).toContain("la impresora, el teclado o la mano");
  });

  it("escribiendo en una laptop: las dos manos teclean en UNA laptop y la mirada no va al teclado", () => {
    const p = cerebroPostura("Escribiendo en una laptop");
    expect(p.estado).toBe("escribiendo");
    expect(p.manosEn).toContain("both hands typing on the keyboard of a single open laptop");
    expect(p.manosEn).not.toMatch(/head|hair/);
    expect(p.reglasEn.join(" ")).toContain("never at the keyboard or the screen");
    expect(p.reglasEn.join(" ")).toContain("no logo");
    expect(p.reglas.join(" ")).toContain("NUNCA hacia el teclado ni la pantalla");
    expect(p.reglas.join(" ")).toMatch(/PROHIBIDO que una mano vaya a la cabeza/);
    expect(posturaDe("Escribiendo en una laptop")).toBe("Escribiendo en una laptop");
    expect(posturaDe("Escribiendo en una laptop")).not.toBe(posturaDe("Portátil"));
  });
  it("en los prompts: laptop abierta sobre la mesa, lejos de las esquinas, sin impresoras en primer plano", () => {
    const b = base({ accesorio: "Escribiendo en una laptop" });
    const api = buildApiPrompt(b, { texto3d: true });
    expect(api).toContain("Both hands are typing on the keyboard of a single open laptop");
    expect(api).toContain("well away from both lower corners");
    expect(api).toContain("There are no printers in the foreground.");
    expect(api).toContain("lower-left corner of the frame is completely empty");
    expect(api).toContain("lower-right corner free of important elements");
    expect(api).not.toContain("Both hands are placed on the sides of the head");
    expect(api).not.toContain("Exactly one hand holds");
    const g = buildPrompt(b);
    expect(g).toContain("POSTURA ESCRIBIENDO EN LAPTOP");
    expect(g).toContain("PROHIBIDO generar impresoras en primer plano o en la esquina inferior izquierda:");
    expect(g).toContain("ÁREA DE MONTAJE LIBRE");
  });
  it("accesorioDePostura convierte cada postura en su valor de accesorio y la ida y vuelta es coherente", () => {
    for (const post of POSTURA_OPCIONES) {
      const acc = accesorioDePostura(post, "Tablet");
      expect(posturaDe(acc)).toBe(post);
    }
    expect(accesorioDePostura(POSTURA_ACCESORIO, "Tablet")).toBe("Tablet"); // conserva el accesorio válido
    expect(accesorioDePostura(POSTURA_ACCESORIO, "Manos en la impresora")).toBe("Cable USB negro");
    expect(accesorioDePostura(POSTURA_CABEZA, "Tablet")).toBe("Manos a la cabeza (sin objeto)");
  });
});
