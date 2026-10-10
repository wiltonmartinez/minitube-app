import { describe, expect, it } from "vitest";
import { generarEscenario, datosProfesion, equipoGuion, infoError, normalizarErrorGuion, promptParaIA, PROFESIONES_GUION } from "@/lib/guion";
import { ERRORES, OTRO, PROFESIONES } from "@/lib/prompt-config";

const ERRORES_DEL_PANEL = ERRORES.filter((e) => e !== OTRO) as string[];
const palabras = (t: string) => t.replace(/[¡!¿?]/g, "").trim().split(/\s+/).length;

describe("Guion · escenario del video", () => {
  it("todas las profesiones del panel tienen datos propios (nadie cae en el texto genérico)", () => {
    for (const p of PROFESIONES) expect(PROFESIONES_GUION[p], p).toBeDefined();
    for (const p of Object.keys(PROFESIONES_GUION)) expect(PROFESIONES, `sobra ${p}`).toContain(p);
  });

  it("cada profesión × cada error de la lista genera los 4 bloques completos, sin marcadores sin reemplazar", () => {
    for (const profesion of PROFESIONES) {
      for (const error of ERRORES_DEL_PANEL) {
        const e = generarEscenario({ marca: "Epson", modelo: "L3250", error, profesion });
        const ctx = `${profesion} / ${error}`;
        expect(e.visual.personaje.length, ctx).toBeGreaterThan(20);
        expect(e.visual.fondo, ctx).toBeTruthy();
        expect(e.gancho.length, ctx).toBeGreaterThan(40);
        expect(e.desarrollo.broll, ctx).toHaveLength(3);
        expect(e.desarrollo.explicacion.length, ctx).toBeGreaterThanOrEqual(3);
        expect(e.cta, ctx).toContain("por software");
        expect(e.texto, ctx).not.toMatch(/[{}]|undefined|NaN/);
      }
    }
  });

  it("el texto corto de la miniatura nunca pasa de 3 palabras", () => {
    for (const profesion of PROFESIONES) {
      for (const error of [...ERRORES_DEL_PANEL, "Tampón", "Combinado", "reset pass admin", "00080000", "algo raro"]) {
        for (let semilla = 0; semilla < 8; semilla++) {
          const e = generarEscenario({ marca: "Canon", modelo: "G6010", error, profesion, semilla });
          for (const t of [e.visual.textoCorto, ...e.visual.alternativas]) expect(palabras(t), `${profesion}/${error}: ${t}`).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it("es determinista y la semilla cambia la variante", () => {
    const base = { marca: "Epson", modelo: "L3250", error: "Almohadillas", profesion: "Sublimación" };
    expect(generarEscenario({ ...base, semilla: 2 }).texto).toBe(generarEscenario({ ...base, semilla: 2 }).texto);
    const ganchos = new Set([0, 1, 2].map((s) => generarEscenario({ ...base, semilla: s }).gancho));
    expect(ganchos.size).toBe(3);
  });

  it("el caso del ejemplo: Epson L3250 · Almohadillas · Sublimación", () => {
    const e = generarEscenario({ marca: "Epson", modelo: "L3250", error: "Almohadillas", profesion: "Sublimación" });
    expect(e.visual.personaje).toContain("negocio de estampados");
    expect(e.visual.fondo).toContain("planchas térmicas");
    expect(e.gancho).toContain("Epson L3250");
    expect(e.gancho).toContain("tazas, camisetas y regalos");
    expect(e.desarrollo.broll[0]).toContain("Una almohadilla de tinta de la impresora está al final de su vida útil");
    expect(e.desarrollo.explicacion.join(" ")).toMatch(/no quita el aviso/);
  });

  it("la regla de negocio: solo software, sin desarmar, sin reparaciones ni promesas extra", () => {
    for (const profesion of PROFESIONES) {
      const e = generarEscenario({ marca: "Canon", modelo: "G3110", error: "5b00", profesion });
      expect(e.cta).toContain("No tienes que desarmar nada");
      expect(e.cta).toContain("instalación remota");
      for (const t of ["reembolso", "gratis", "garantía", "licencia", "reparamos", "reparación"]) expect(e.texto.toLowerCase(), `${profesion}: ${t}`).not.toContain(t);
    }
  });

  it("los plotters van en masculino y las impresoras en femenino", () => {
    const plotter = equipoGuion("Epson", "F570");
    expect(plotter).toMatchObject({ tipo: "plotter", bloqueado: "bloqueado", el: "el", nombre: "Epson SureColor F570" });
    expect(equipoGuion("Epson", "SC-F571").nombre).toBe("Epson SureColor F571");
    expect(equipoGuion("Epson", "L3250")).toMatchObject({ tipo: "impresora", bloqueado: "bloqueada", el: "la", nombre: "Epson L3250" });
    const e = generarEscenario({ marca: "Epson", modelo: "F570", error: "0014BD", profesion: "Sublimación" });
    expect(e.cta).toContain("llevar el plotter");
    expect(e.visual.elemento).toContain("bloqueado");
  });

  it("los pronombres concuerdan con el equipo (la impresora / el plotter) en todas las variantes", () => {
    for (const profesion of PROFESIONES) {
      for (let semilla = 0; semilla < 3; semilla++) {
        const imp = generarEscenario({ marca: "Epson", modelo: "L3250", error: "Almohadillas", profesion, semilla }).gancho;
        const plo = generarEscenario({ marca: "Epson", modelo: "F570", error: "0014BD", profesion, semilla }).gancho;
        expect(imp, `${profesion}/${semilla}`).not.toMatch(/llevarlo|No lo lleves/);
        expect(plo, `${profesion}/${semilla}`).not.toMatch(/llevarla|No la lleves/);
        expect(imp + plo).not.toMatch(/[{}]/);
      }
    }
    expect(generarEscenario({ marca: "Epson", modelo: "L3250", error: "Almohadillas", profesion: "Sublimación", semilla: 0 }).gancho).toContain("llevarla");
    expect(generarEscenario({ marca: "Epson", modelo: "F570", error: "0014BD", profesion: "Sublimación", semilla: 2 }).gancho).toContain("No lo lleves");
  });

  it("el 0014BD avisa de la limpieza previa (no promete «cero desarme» de más)", () => {
    const e = generarEscenario({ marca: "Epson", modelo: "F570", error: "Error 0014bd", profesion: "Impresión en vinilo" });
    expect(e.avisos.join(" ")).toContain("limpiar bien el sensor de tinta");
    expect(e.cta).toContain("limpieza previa");
  });

  it("los códigos 000x000x y «reset pass admin» avisan que se revise la explicación", () => {
    expect(generarEscenario({ marca: "Epson", modelo: "F570", error: "00080000", profesion: "Fotografía" }).avisos.join(" ")).toContain("00000008");
    expect(generarEscenario({ marca: "Epson", modelo: "F570", error: "reset pass admin", profesion: "Fotografía" }).avisos.join(" ")).toContain("revisa");
    expect(generarEscenario({ marca: "Epson", modelo: "L3250", error: "5b02", profesion: "Fotografía" }).avisos.join(" ")).toContain("no está en la lista");
  });

  it("normaliza los errores de la lista del panel", () => {
    expect(normalizarErrorGuion("Error 5b00")).toBe("5B00");
    expect(normalizarErrorGuion("Codigo 5b00")).toBe("5B00");
    expect(normalizarErrorGuion("Código 5b00")).toBe("5B00");
    expect(infoError("Error Almohadillas").mensaje).toContain("almohadilla de tinta");
    expect(infoError("Error E-11").mensaje).toContain("E-11");
    expect(infoError("0000000C").revisar).toBeTruthy();
  });

  it("una profesión agregada por el usuario usa un texto genérico con su fondo", () => {
    const d = datosProfesion("Barbería", "Barbería moderna con espejos");
    expect(d.fondo).toBe("Barbería moderna con espejos");
    const e = generarEscenario({ marca: "Epson", modelo: "L3250", error: "Almohadillas", profesion: "Barbería", fondoCatalogo: "Barbería moderna con espejos" });
    expect(e.visual.personaje).toContain("Barbería");
    expect(e.texto).not.toMatch(/[{}]|undefined/);
  });

  it("el prompt para Claude o ChatGPT trae las variables y la regla de negocio", () => {
    const p = promptParaIA("Epson", "l3250", "Almohadillas", "Sublimación");
    expect(p).toContain("Marca: Epson / Modelo: L3250 / Error: Almohadillas.");
    expect(p).toContain("(Profesión del Cliente)");
    expect(p).toContain("Bloque 3 (Profesión): Sublimación.");
    expect(p).toContain("NO se venden licencias sueltas y NO se hacen reparaciones físicas de hardware");
    expect(p).not.toMatch(/\{(marca|modelo|error|profesion)\}/);
  });
});
