import { describe, expect, it } from "vitest";
import { aplicarAzar, sorteoRespetandoBloqueos } from "@/lib/azar";
import {
  ARQUETIPOS,
  BADGES_REALES,
  BADGE_ALEATORIO,
  EDADES,
  ETNIAS,
  GENEROS,
  PALETA_ALEATORIA,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  type PromptInput,
} from "@/lib/prompt-config";
import {
  ALEATORIO,
  CAMPOS_FORMA,
  LISTAS_BASE,
  SELECCION_INICIAL,
  avisosCoherencia,
  esArmonica,
  nivelPlano,
  resolverPersonaje,
  type CampoLista,
  type Concreto,
  type ModoRostro,
} from "@/lib/rostro";

const PLANOS_ES = [
  "Plano Detalle (Extreme Close-Up)",
  "Primer Plano (Close-Up)",
  "Plano Medio (Medium Shot)",
  "Ángulo a la altura de los ojos (Eye Level Shot)",
];

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
  accesorio: "Teléfono celular",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  arquetipo: "Ninguno (usar selectores manuales)",
  ...extra,
});

const porId = (campo: CampoLista, es: string) => LISTAS_BASE[campo].find((x) => x.es === es)?.id;
const MODOS: ModoRostro[] = ["Estilo predefinido", "Detalle completo"];

describe("Fase 3 · listas de fábrica", () => {
  it("tienen las opciones pedidas", () => {
    const n = (c: CampoLista) => LISTAS_BASE[c].length;
    expect(n("estilo")).toBeGreaterThanOrEqual(8);
    expect(n("estilo")).toBeLessThanOrEqual(20);
    expect([n("forma"), n("ojosColor"), n("ojosForma"), n("cejas"), n("nariz"), n("labios")]).toEqual([5, 7, 5, 5, 6, 4]);
    expect([n("cabelloColor"), n("cabelloTipo"), n("cabelloLargo"), n("vello"), n("complexion"), n("hombros")]).toEqual([7, 5, 6, 5, 4, 3]);
  });
  it("cada estilo predefinido rellena los 5 rasgos con opciones que existen", () => {
    for (const e of LISTAS_BASE.estilo) {
      for (const c of CAMPOS_FORMA) {
        const id = e.rasgos?.[c];
        expect(id, `${e.es}/${c}`).toBeTruthy();
        expect(LISTAS_BASE[c].some((x) => x.id === id)).toBe(true);
      }
    }
  });
  it("el modo estilo aplica exactamente los rasgos del estilo elegido", () => {
    const estilo = LISTAS_BASE.estilo[3];
    const p = resolverPersonaje(
      LISTAS_BASE,
      { ...SELECCION_INICIAL, estilo: estilo.es },
      { genero: "Hombre", edad: "Adulto Mayor 45-55", etnia: "Caucásica/Europea" },
      "Estilo predefinido",
      0.3,
    );
    for (const c of CAMPOS_FORMA) expect(porId(c, p[c])).toBe(estilo.rasgos![c]);
  });
});

describe("Fase 3 · validador de armonía (500 sorteos)", () => {
  it("el azar nunca produce combinaciones prohibidas", () => {
    let revisados = 0;
    for (let i = 0; i < 500; i++) {
      const ctx = {
        genero: GENEROS[i % 2],
        edad: EDADES[i % EDADES.length],
        etnia: ETNIAS[i % ETNIAS.length],
      };
      const modo = MODOS[i % 2];
      const p = resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, ctx, modo, (i + 1) / 503);
      for (const c of ["ojosColor", "cabelloColor", "cabelloTipo", "cabelloLargo", "hombros"] as CampoLista[]) {
        expect(esArmonica(c, porId(c, p[c]), ctx), `${c}=${p[c]} con ${JSON.stringify(ctx)}`).toBe(true);
      }
      if (ctx.genero === "Mujer") expect(p.vello).toBe("");
      else expect(esArmonica("vello", porId("vello", p.vello), ctx)).toBe(true);
      // reglas explícitas del encargo
      if (EDADES.indexOf(ctx.edad) <= 1) expect(["canoso", "sal_pimienta"]).not.toContain(porId("cabelloColor", p.cabelloColor));
      expect(avisosCoherencia(LISTAS_BASE, p, ctx)).toEqual([]);
      revisados++;
    }
    expect(revisados).toBe(500);
  });
  it("lo elegido a mano se respeta, pero muestra un aviso suave", () => {
    const sel = { ...SELECCION_INICIAL, cabelloColor: "Canoso", ojosColor: "Azul" };
    const ctx = { genero: "Hombre", edad: "Joven 18-25", etnia: "Afrodescendiente" };
    const p = resolverPersonaje(LISTAS_BASE, sel, ctx, "Detalle completo", 0.5);
    expect(p.cabelloColor).toBe("Canoso");
    expect(p.ojosColor).toBe("Azul");
    const avisos = avisosCoherencia(LISTAS_BASE, p, ctx);
    expect(avisos.length).toBeGreaterThanOrEqual(2);
    expect(avisos.join(" ")).toContain("Canoso");
  });
  it("es reproducible: el mismo número de sorteo da la misma persona", () => {
    const ctx = { genero: "Mujer", edad: "Joven 18-25", etnia: "Asiática del Este" };
    const a = resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, ctx, "Detalle completo", 0.77);
    const b = resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, ctx, "Detalle completo", 0.77);
    expect(a).toEqual(b);
  });
});

describe("Fase 3 · arquetipos listos", () => {
  it("hay variedad: al menos 20, ambos géneros, etnias y edades de 20 a 70 años", () => {
    const lista = Object.values(ARQUETIPOS);
    expect(lista.length).toBeGreaterThanOrEqual(20);
    expect(lista.filter((a) => a.genero === "Mujer").length).toBeGreaterThanOrEqual(8);
    expect(lista.filter((a) => a.genero === "Hombre").length).toBeGreaterThanOrEqual(8);
    expect(new Set(lista.map((a) => a.etnia)).size).toBeGreaterThanOrEqual(8);
    const anios = lista.flatMap((a) => a.edadAnios.split(" to ").map(Number));
    expect(Math.min(...anios)).toBeLessThanOrEqual(22);
    expect(Math.max(...anios)).toBe(70);
  });
});

describe("Fase 3 · plano y cuerpo", () => {
  const personaje = (genero: string): Concreto =>
    resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, { genero, edad: "Adulto Joven 30-40", etnia: "Caucásica/Europea" }, "Detalle completo", 0.4);

  it("niveles de plano", () => {
    expect(nivelPlano(PLANOS_ES[0])).toBe("detalle");
    expect(nivelPlano(PLANOS_ES[1])).toBe("primer");
    expect(nivelPlano(PLANOS_ES[2])).toBe("medio");
    expect(nivelPlano(PLANOS_ES[3])).toBe("medio");
  });
  it("detalle y primer plano no mencionan la complexión; el plano medio sí; todos incluyen «waist up»", () => {
    const frase = "framed from the waist up at most, no hips, no legs visible";
    const casos: [string, Partial<PromptInput>][] = [
      ["manual", { genero: "Hombre", personaje: personaje("Hombre") }],
      ["arquetipo", { arquetipo: Object.keys(ARQUETIPOS)[0] }],
    ];
    for (const [, extra] of casos) {
      for (const plano of PLANOS_ES) {
        const nivel = nivelPlano(plano);
        for (const p of [buildPrompt(base({ ...extra, plano })), buildApiPrompt(base({ ...extra, plano }), { texto3d: true })]) {
          expect(p).toContain(frase);
          expect(/\b(slim|average|athletic|moderately sturdy|sturdy) build\b/.test(p)).toBe(nivel === "medio");
          expect(/\b(narrow|medium-width|broad) shoulders\b/.test(p)).toBe(nivel !== "detalle");
        }
      }
    }
  });
  it("armonía natural en ambos prompts; nunca «modelo irreal»", () => {
    for (const p of [buildPrompt(base({ genero: "Mujer", personaje: personaje("Mujer") })), buildApiPrompt(base({ personaje: personaje("Hombre") }), { texto3d: false })]) {
      expect(p).toContain("natural harmonious beauty");
      expect(p).toContain("no plastic or airbrushed skin");
    }
    expect(buildPrompt(base({ genero: "Mujer" }))).not.toMatch(/extremadamente hermosas/);
  });
  it("la personalización se describe como frase de retrato y el vello solo aparece en hombres", () => {
    const hombre = { ...personaje("Hombre"), vello: "Barba completa" };
    const pH = buildApiPrompt(base({ genero: "Hombre", personaje: hombre }), { texto3d: false });
    expect(pH).toMatch(/with an? [^.]*face[^.]*eyes[^.]*eyebrows/);
    expect(pH).toContain("a full beard");
    const pM = buildApiPrompt(base({ genero: "Mujer", personaje: personaje("Mujer") }), { texto3d: false });
    expect(pM).not.toMatch(/beard|stubble|mustache|clean-shaven/);
    expect(pM).not.toContain(" | ");
  });
});

describe("Fase 3 · candados y azar", () => {
  const form = { badge: "A", paleta: "P", etnia: "X", profesion: "Y", marco: "M", genero: "Mujer", edad: "E" };
  const r = { badge: "B", paleta: "Q", etnia: "X2", profesion: "Y2", marco: "M2", genero: "Hombre", edad: "E2" };

  it("«Generar al Azar» no cambia los campos bloqueados", () => {
    const bloqueos = { etnia: true, profesion: true, genero: true, badge: true, paleta: true };
    const out = aplicarAzar(form, r, bloqueos, "ALEA_B", "ALEA_P");
    expect(out).toMatchObject({ etnia: "X", profesion: "Y", genero: "Mujer", badge: "A", paleta: "P" });
    expect(out.marco).toBe("M2");
    expect(out.edad).toBe("E2");
  });
  it("sin candados cambia todo y con «Aleatorio» conserva la opción", () => {
    expect(aplicarAzar(form, r, {}, "ALEA_B", "ALEA_P")).toMatchObject({ badge: "B", paleta: "Q", etnia: "X2" });
    expect(aplicarAzar({ ...form, badge: "ALEA_B" }, r, {}, "ALEA_B", "ALEA_P").badge).toBe("ALEA_B");
  });
  it("el re-sorteo respeta los candados de gafas, accesorio, paleta, badge y arquetipo", () => {
    const antes = { paleta: "p1", gafas: "g1", badge: "b1", u: 0.1, up: 0.2, ua: 0.3 };
    const nuevo = { paleta: "p2", gafas: "g2", badge: "b2", u: 0.9, up: 0.8, ua: 0.7 };
    const claves = { paleta: "paleta", gafas: "gafas", badge: "badge", u: "accesorio", ua: "arquetipo" };
    expect(sorteoRespetandoBloqueos(antes, nuevo, { gafas: true, accesorio: true, arquetipo: true }, claves)).toEqual({
      paleta: "p2", gafas: "g1", badge: "b2", u: 0.1, up: 0.8, ua: 0.3,
    });
    expect(sorteoRespetandoBloqueos(antes, nuevo, {}, claves)).toEqual(nuevo);
  });
  it("las constantes de «Aleatorio» no chocan con las del módulo de rostro", () => {
    expect(ALEATORIO).toBeTruthy();
    expect(BADGE_ALEATORIO).toBeTruthy();
    expect(PALETA_ALEATORIA).toBeTruthy();
  });
});
