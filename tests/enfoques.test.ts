import { describe, expect, it } from "vitest";
import { edadInterna, edadTexto } from "@/lib/edades";
import { ENFOQUES, edadesDeEnfoque, enfoqueDe, enfoqueEfectivo, normalizarEnfoque, profesionEnEnfoque, ENFOQUE_AUTO, ENFOQUE_LIBRE, OPCIONES_ENFOQUE } from "@/lib/enfoques";
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
    const f = normalizarEnfoque({ profesion: "Técnico de computadores", etnia: "Latino / Mestizo", edad: "18 a 25 años", dispositivo: "Ninguno" });
    expect(f).toMatchObject({ etnia: "Asiático / Coreano", edad: "36 a 45 años", dispositivo: "PC" });
    const g = normalizarEnfoque({ profesion: "Sublimación", etnia: "Afrodescendiente / Afro-latino", edad: "46 a 55 años", dispositivo: "Tablet" });
    expect(g).toMatchObject({ etnia: "Afrodescendiente / Afro-latino", edad: "18 a 25 años", dispositivo: "Smartphone" });
    expect(edadesDeEnfoque(enfoqueDe("Recepcionista"))).toContain("18 a 25 años");
    expect(edadesDeEnfoque(enfoqueDe("Contador"))).toBeUndefined();
    const h = { profesion: "Otra", etnia: "x", edad: "y", dispositivo: "z" };
    expect(normalizarEnfoque(h)).toEqual(h);
  });

  it("enfoque 1: smartphone, frustración y mirada hacia el error", () => {
    const p = buildPrompt(base({ profesion: "Sublimación", enfoque: 1, dispositivo: "Smartphone" }));
    expect(p).toContain("desperation and frustration");
    expect(p).toContain("smartphone firmly");
    expect(p).toMatch(/pulls at the hair/);
    expect(p).toContain("MIRADA FIJA EN DIAGONAL HACIA ABAJO A LA IZQUIERDA");
  });

  it("enfoque 2: laptop, pánico, mano en la boca y cuerpo encorvado", () => {
    const p = buildPrompt(base({ profesion: "Recepcionista", enfoque: 2, dispositivo: "PC / Laptop" }));
    expect(p).toContain("extreme worry and desperation");
    expect(p).toMatch(/covers the mouth in panic or rubs the eyes/);
    expect(p).toContain("hunched");
    expect(p).toContain("MIRADA FIJA EN DIAGONAL HACIA ABAJO A LA IZQUIERDA");
  });

  it("enfoque 3: PC de escritorio, triunfo, pulgar arriba y mirada al frente", () => {
    const p = buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop", genero: "Mujer" }));
    expect(p).toContain("authority, confidence and calm professionalism");
    expect(p).toMatch(/thumbs up or points the index finger/);
    expect(p).toContain("leaning forward");
    expect(p).toContain("MIRADA FIJA AL FRENTE HACIA LA IZQUIERDA");
    expect(p).toContain("brillantes, firmes y serenos");
    expect(p).not.toMatch(/extreme worry and desperation/);
    expect(p).toContain("REGLA ESTRICTA DE EXPRESIÓN");
    expect(p).toContain("autoridad, seguridad");
  });

  it("auditoría: las 16 profesiones con su enfoque no generan texto ni marcas en el prompt", () => {
    for (const prof of PROFESIONES) {
      const e = enfoqueDe(prof)!;
      const f = normalizarEnfoque({ profesion: prof, etnia: "Latino / Mestizo", edad: "Joven 18-25", dispositivo: "Ninguno" });
      expect(DISPOSITIVOS as readonly string[]).toContain(f.dispositivo);
      const p = buildPrompt(base({ profesion: prof, enfoque: e, dispositivo: f.dispositivo, etnia: f.etnia as PromptInput["etnia"], edad: edadInterna(f.edad), edadTexto: edadTexto(f.edad) }));
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
  const casos: [1 | 2 | 3, string, string][] = [[1, "Sublimación", "desperation and frustration"], [2, "Recepcionista", "extreme worry and desperation"], [3, "Técnico de Impresoras", "authority, confidence and calm professionalism"]];
  for (const [e, prof, cara] of casos) {
    it(`enfoque ${e}: el texto del panel y el prompt dicen lo mismo`, () => {
      const info = ENFOQUES[e];
      const p = buildPrompt(base({ profesion: prof, enfoque: e, dispositivo: info.dispositivo }));
      expect(p).toContain(cara);
      expect(info.mirada.length).toBeGreaterThan(10);
      expect(info.manos.length).toBeGreaterThan(30);
      if (e === 3) {
        expect(info.emocion).toMatch(/Autoridad/);
        expect(p).toContain("brillantes, firmes y serenos");
        expect(p).not.toContain("desorbitados por el pánico");
      }
    });
  }
});

describe("Dirección de la mirada (el personaje está a la derecha)", () => {
  const dir = async () => await import("@/lib/prompt-config");
  const MARCAS_REGLA = ["MIRADA FIJA AL FRENTE HACIA LA IZQUIERDA", "MIRADA FIJA EN DIAGONAL HACIA ABAJO A LA IZQUIERDA", "MIRADA FIJA RECTO HACIA ABAJO"];
  it("tres puntos y cada uno produce su propia regla", async () => {
    const { MIRADA_OPCIONES, MIRADA_DEFECTO, MIRADA_TEXTO } = await dir();
    expect(MIRADA_OPCIONES).toHaveLength(3);
    expect(MIRADA_TEXTO).toHaveLength(3);
    expect(MIRADA_OPCIONES).toEqual(["Punto #1", "Punto #2", "Punto #3"]);
    expect(MIRADA_DEFECTO).toBe(MIRADA_OPCIONES[1]);
    const mk = (mirada?: string) => buildPrompt(base({ profesion: "Sublimación", enfoque: 1, dispositivo: "Smartphone", mirada }));
    expect(mk()).toBe(mk(MIRADA_OPCIONES[1]));
    MIRADA_OPCIONES.forEach((o, i) => {
      const p = mk(o);
      expect(p).toContain(MARCAS_REGLA[i]);
      MARCAS_REGLA.forEach((m, j) => j !== i && expect(p).not.toContain(m));
      expect(p).toContain("por la desesperación y la frustración");
    });
  });
  it("el enfoque 3 admite los tres con mirada segura y por defecto va al frente", async () => {
    const { MIRADA_OPCIONES, MIRADA_DEFECTO_EXPERTO } = await dir();
    expect(MIRADA_DEFECTO_EXPERTO).toBe(MIRADA_OPCIONES[0]);
    expect(buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop" }))).toContain(MARCAS_REGLA[0]);
    for (const m of MIRADA_OPCIONES) {
      const p = buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "PC / Laptop", mirada: m }));
      expect(p).toContain("brillantes, firmes y serenos");
      expect(p).not.toMatch(/desorbitados por el pánico|por la frustración/);
    }
  });
});

describe("Edades agrupadas y emociones por tono", () => {
  it("cuatro grupos: 18 a 25, 26 a 35 (operarios y clientes) y 36 a 45, 46 a 55 (autoridad)", async () => {
    const { GRUPOS_EDAD, EDADES_PANEL, tonoDeEdad, edadInterna: ei, edadTexto: et, EMOCIONES_POR_TONO } = await import("@/lib/edades");
    expect(EDADES_PANEL).toEqual(["18 a 25 años", "26 a 35 años", "36 a 45 años", "46 a 55 años"]);
    expect(GRUPOS_EDAD.map((g) => g.tono)).toEqual(["cliente", "autoridad"]);
    expect(tonoDeEdad("26 a 35 años")).toBe("cliente");
    expect(tonoDeEdad("36 a 45 años")).toBe("autoridad");
    expect(ei("18 a 25 años")).toBe("Joven 18-25");
    expect(ei("46 a 55 años")).toBe("Adulto Mayor 45-55");
    expect(et("26 a 35 años")).toBe("26 to 35");
    expect(EMOCIONES_POR_TONO.cliente).toEqual(["Desesperación", "Frustración", "Preocupación extrema"]);
    expect(EMOCIONES_POR_TONO.autoridad).toEqual(["Autoridad", "Seguridad", "Profesionalidad", "Dominio técnico", "Serenidad"]);
  });

  it("los enfoques 1 y 2 usan 18-35 y el 3 usa 36-55", () => {
    for (const p of ["Sublimación", "Fotografía", "Litografía", "Recepcionista"]) expect(edadesDeEnfoque(enfoqueDe(p))).toEqual(["18 a 25 años", "26 a 35 años"]);
    for (const p of ["Técnico de Impresoras", "Ingeniero de sistemas"]) expect(edadesDeEnfoque(enfoqueDe(p))).toEqual(["36 a 45 años", "46 a 55 años"]);
  });

  it("el prompt dice «aged 26 to 35» y aplica la emoción elegida", () => {
    const p = buildPrompt(base({ profesion: "Fotografía", edadTexto: "26 to 35", emocionEdad: "Preocupación extrema" }));
    expect(p).toContain("aged 26 to 35");
    expect(p).toContain("extreme worry and anxiety");
    expect(p).toContain("por la preocupación extrema");
    const a = buildPrompt(base({ profesion: "Ingeniero de sistemas", edadTexto: "46 to 55", emocionEdad: "Dominio técnico" }));
    expect(a).toContain("aged 46 to 55");
    expect(a).toContain("technical mastery");
    expect(a).toContain("brillantes, firmes y serenos");
    expect(a).toContain("autoridad, seguridad, profesionalidad y serenidad");
    expect(a).not.toMatch(/desorbitados por el pánico/);
  });

  it("emoción efectiva: la elegida, o «Seguridad» con edad de autoridad y sin enfoque", async () => {
    const { emocionEfectiva, EMOCION_AUTO } = await import("@/lib/edades");
    expect(emocionEfectiva("26 a 35 años", "Frustración", false)).toBe("Frustración");
    expect(emocionEfectiva("26 a 35 años", "Serenidad", false)).toBeUndefined(); // no encaja con el tono
    expect(emocionEfectiva("46 a 55 años", EMOCION_AUTO, false)).toBe("Seguridad");
    expect(emocionEfectiva("46 a 55 años", EMOCION_AUTO, true)).toBeUndefined(); // con enfoque manda el enfoque
  });
});

describe("Dispositivo editable", () => {
  it("opciones: Smartphone, Tablet, PC, Laptop y Ninguno", async () => {
    const { DISPOSITIVOS, DISPOSITIVO_NINGUNO } = await import("@/lib/prompt-config");
    expect([DISPOSITIVO_NINGUNO, ...DISPOSITIVOS]).toEqual(["Ninguno", "Smartphone", "Tablet", "PC", "Laptop"]);
  });
  it("el enfoque fija el dispositivo por defecto, pero una elección a mano se respeta", () => {
    const f = { profesion: "Sublimación", etnia: "Latino / Mestizo", edad: "18 a 25 años", dispositivo: "Ninguno", dispositivoManual: false };
    expect(normalizarEnfoque(f).dispositivo).toBe("Smartphone");
    expect(normalizarEnfoque({ ...f, dispositivo: "Tablet", dispositivoManual: true }).dispositivo).toBe("Tablet");
    expect(normalizarEnfoque({ ...f, profesion: "Recepcionista" }).dispositivo).toBe("Laptop");
    expect(normalizarEnfoque({ ...f, profesion: "Ingeniero de sistemas", edad: "36 a 45 años" }).dispositivo).toBe("PC");
  });
  it("PC y Laptop cambian el equipo del prompt en los enfoques 2 y 3", () => {
    const pc = buildPrompt(base({ profesion: "Recepcionista", enfoque: 2, dispositivo: "PC" }));
    expect(pc).toContain("UN solo monitor de escritorio");
    const lap = buildPrompt(base({ profesion: "Técnico de computadores", enfoque: 3, dispositivo: "Laptop" }));
    expect(lap).toContain("UNA sola laptop abierta");
    expect(lap).toMatch(/thumbs up or points the index finger/);
  });
});

describe("Enfoque 4: el cliente salvado (éxito y alivio)", () => {
  it("se elige en el selector y comparte profesiones con los enfoques 1 y 2", () => {
    expect(OPCIONES_ENFOQUE).toHaveLength(6);
    expect(enfoqueEfectivo(OPCIONES_ENFOQUE[4], "Sublimación")).toBe(4);
    expect(enfoqueEfectivo(ENFOQUE_AUTO, "Sublimación")).toBe(1);
    expect(enfoqueEfectivo(ENFOQUE_LIBRE, "Sublimación")).toBeUndefined();
    for (const p of ["Sublimación", "Fotocopias", "Fotografía", "Diseñador(a) Gráfico", "Asistente Corporativa"]) expect(profesionEnEnfoque(p, 4), p).toBe(true);
    expect(profesionEnEnfoque("Técnico de Impresoras", 4)).toBe(false);
    expect(ENFOQUES[4].etnias).toEqual(["Latino / Mestizo", "Afrodescendiente / Afro-latino", "Caucásico / Mediterráneo"]);
    expect(edadesDeEnfoque(4)).toEqual(["18 a 25 años", "26 a 35 años"]);
  });

  it("emociones de éxito: la elegida o «Alivio profundo»", async () => {
    const { emocionEfectiva, EMOCIONES_POR_TONO } = await import("@/lib/edades");
    expect(EMOCIONES_POR_TONO.exito).toEqual(["Alivio profundo", "Euforia", "Triunfo"]);
    expect(emocionEfectiva("26 a 35 años", "Euforia", true, 4)).toBe("Euforia");
    expect(emocionEfectiva("26 a 35 años", "Frustración", true, 4)).toBe("Alivio profundo");
  });

  it("prompt: euforia con smartphone → teléfono en la derecha y puño izquierdo en alto, sin angustia", () => {
    const p = buildPrompt(base({ profesion: "Sublimación", enfoque: 4, dispositivo: "Smartphone", emocionEdad: "Euforia", edadTexto: "26 to 35", etnia: "Latino / Mestizo" }));
    expect(p).toContain("explosive joy and euphoria");
    expect(p).toContain("aged 26 to 35");
    expect(p).toContain("left fist is closed and raised high in victory");
    expect(p).toContain("brillantes y radiantes de alegría");
    expect(p).toContain("alivio, alegría o triunfo evidentes");
    expect(p).not.toMatch(/por el pánico|desorbitados por/);
  });

  it("alivio profundo → mano izquierda en el pecho; PC o Laptop → pulgar arriba o brazo en alto", () => {
    expect(buildPrompt(base({ profesion: "Fotografía", enfoque: 4, dispositivo: "Smartphone", emocionEdad: "Alivio profundo" }))).toContain("left hand rests on the chest in relief");
    for (const d of ["PC", "Laptop"]) {
      const p = buildPrompt(base({ profesion: "Fotografía", enfoque: 4, dispositivo: d, emocionEdad: "Triunfo" }));
      expect(p, d).toMatch(/thumbs up or the arm is raised high in celebration/);
    }
  });

  it("el guion del enfoque 4 celebra: vuelve a imprimir, sin pánico", async () => {
    const { generarEscenario } = await import("@/lib/guion");
    for (let n = 0; n < 6; n++) {
      const g = generarEscenario({ error: "Almohadillas", profesion: "Sublimación", dispositivo: "Smartphone", enfoque: 4, semilla: n });
      expect(g.texto).toMatch(/vuelve a imprimir|imprimiendo/);
      expect(g.texto).not.toMatch(/pánico|angustia|frustraci|manos en la cabeza|plata que no entra/i);
    }
  });
});
