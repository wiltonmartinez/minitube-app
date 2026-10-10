import { describe, expect, it } from "vitest";
import { ETNIAS_PANEL } from "@/lib/prompt-config";
import { ESTILO_GRUPOS, LISTAS_BASE, MODOS_ROSTRO, SELECCION_INICIAL, ALEATORIO, esArmonica, resolverPersonaje } from "@/lib/rostro";

const GRUPO: Record<string, string> = {
  "Latino / Mestizo": "latina",
  "Afrodescendiente / Afro-latino": "afro",
  "Caucásico / Mediterráneo": "europea",
  "Asiático / Coreano": "asiatica",
};

describe("etnia ↔ estilos faciales", () => {
  it("cada etnia del panel tiene estilos propios y universales para elegir", () => {
    for (const e of ETNIAS_PANEL) {
      const ok = LISTAS_BASE.estilo.filter((x) => esArmonica("estilo", x.id, { genero: "Mujer", edad: "Adulto Joven 30-40", etnia: e }));
      expect(ok.length).toBeGreaterThanOrEqual(5);
      expect(ok.some((x) => ESTILO_GRUPOS[x.id ?? ""]?.length === 1 && ESTILO_GRUPOS[x.id ?? ""][0] === GRUPO[e])).toBe(true);
    }
  });

  it("el sorteo nunca da un estilo de otra etnia", () => {
    for (const e of ETNIAS_PANEL)
      for (let i = 0; i < 150; i++) {
        const p = resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, { genero: i % 2 ? "Hombre" : "Mujer", edad: "Adulto Joven 30-40", etnia: e }, MODOS_ROSTRO[0], i / 150);
        const id = LISTAS_BASE.estilo.find((x) => x.es === p.estilo)?.id ?? "";
        const g = ESTILO_GRUPOS[id];
        expect(!g || g.includes(GRUPO[e])).toBe(true);
      }
  });

  it("un estilo elegido que no encaja con la etnia se cambia por uno coherente", () => {
    const coreano = LISTAS_BASE.estilo.find((x) => x.id === "coreano_suave")!.es;
    const p = resolverPersonaje(LISTAS_BASE, { ...SELECCION_INICIAL, estilo: coreano }, { genero: "Mujer", edad: "Joven 18-25", etnia: "Afrodescendiente / Afro-latino" }, MODOS_ROSTRO[0], 0.3);
    expect(p.estilo).not.toBe(coreano);
    expect(p.estilo).not.toBe(ALEATORIO);
    const q = resolverPersonaje(LISTAS_BASE, { ...SELECCION_INICIAL, estilo: coreano }, { genero: "Mujer", edad: "Joven 18-25", etnia: "Asiático / Coreano" }, MODOS_ROSTRO[0], 0.3);
    expect(q.estilo).toBe(coreano);
  });
});
