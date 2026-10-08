import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCESORIOS_FIJOS,
  ARQUETIPOS,
  BADGES_REALES,
  PALETAS_FIJAS,
  PERFILES,
  PLANOS,
  buildApiPrompt,
  generatePrompt,
  type PromptInput,
} from "@/lib/prompt-config";
import { LISTAS_BASE, SELECCION_INICIAL, resolverPersonaje } from "@/lib/rostro";

// Prueba de regresión: el panel web (que usa estas mismas funciones) debe generar EXACTAMENTE los mismos prompts que antes
// para los mismos valores. Los textos de referencia están en tests/golden/prompts.json.
// Si un cambio de reglas del prompt es intencional: ACTUALIZAR_GOLDEN=1 npx vitest run tests/golden.test.ts
const RUTA = path.join(__dirname, "golden", "prompts.json");

const perfiles = Object.keys(PERFILES);
const arquetipos = Object.keys(ARQUETIPOS);
const emociones = [undefined, "panico", "sorpresa", "alivio"] as const;

function casos(): { id: string; entrada: PromptInput; texto3d: boolean; referencia: boolean }[] {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const manual = i % 4 === 3;
    const entrada: PromptInput = {
      marca: i % 2 ? "Canon" : "Epson",
      modelo: ["L3110", "G3110", "L3250", "F570"][i % 4],
      error: ["Almohadillas", "5B00", "E-11", "0014BD"][i % 4],
      genero: i % 3 === 0 ? "Hombre" : "Mujer",
      edad: ["Joven 18-25", "Adulto Joven 30-40", "Adulto Mayor 45-55", "Adulto Maduro 56-65"][i % 4] as PromptInput["edad"],
      etnia: ["Afro-Latina", "Caucásica/Europea", "Asiática del Este", "Colombiana Bogotá/Andino"][i % 4] as PromptInput["etnia"],
      profesion: perfiles[i % perfiles.length],
      marco: ["Marco de neón fino rojo y azul", "Marco de doble línea cian y magenta"][i % 2],
      plano: PLANOS[i % PLANOS.length].es,
      idioma: (["Español", "Inglés", "Portugués", "Francés"] as const)[i % 4],
      badge: BADGES_REALES[i % BADGES_REALES.length],
      gafas: ["Ninguna", "Azules vidIQ", "Elegantes metálicas doradas", "Retro Gruesas"][i % 4],
      accesorio: ACCESORIOS_FIJOS[i % ACCESORIOS_FIJOS.length],
      paleta: PALETAS_FIJAS[i % PALETAS_FIJAS.length],
      arquetipo: manual ? "Ninguno (usar selectores manuales)" : arquetipos[i % arquetipos.length],
      emocion: emociones[i % emociones.length],
      ...(manual
        ? { personaje: resolverPersonaje(LISTAS_BASE, SELECCION_INICIAL, { genero: "Hombre", edad: "Adulto Joven 30-40", etnia: "Caucásica/Europea" }, "Detalle completo", 0.37) }
        : {}),
    };
    out.push({ id: `caso-${String(i + 1).padStart(2, "0")}`, entrada, texto3d: i % 2 === 0, referencia: i % 5 === 4 });
  }
  return out;
}

function generar() {
  const resultado: Record<string, { gemini: string; api: string }> = {};
  for (const c of casos()) {
    resultado[c.id] = {
      gemini: generatePrompt(c.entrada, { baseUrl: "https://ejemplo.test" }).promptText,
      api: buildApiPrompt(c.entrada, { texto3d: c.texto3d, referencia: c.referencia }),
    };
  }
  return resultado;
}

describe("Regresión: los prompts del panel no cambian", () => {
  it("coinciden con los textos de referencia (16 casos × 2 prompts)", () => {
    const actual = generar();
    if (process.env.ACTUALIZAR_GOLDEN === "1" || !existsSync(RUTA)) {
      writeFileSync(RUTA, JSON.stringify(actual, null, 1));
      return;
    }
    const referencia = JSON.parse(readFileSync(RUTA, "utf-8")) as typeof actual;
    expect(Object.keys(actual)).toEqual(Object.keys(referencia));
    for (const id of Object.keys(actual)) {
      expect(actual[id].gemini, `${id} (Gemini)`).toBe(referencia[id].gemini);
      expect(actual[id].api, `${id} (API)`).toBe(referencia[id].api);
    }
  });
});
