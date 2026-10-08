import { describe, expect, it } from "vitest";
import {
  ACCESORIOS_MANO,
  ARQUETIPOS,
  BADGES_REALES,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  type PromptInput,
} from "@/lib/prompt-config";

// Badge sin «%» en su texto, para poder buscar porcentajes en el resto del prompt
const BADGE_SIN_PORCENTAJE = BADGES_REALES.find((b) => !b.includes("%"))!;

const base = (extra: Partial<PromptInput> = {}): PromptInput => ({
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  genero: "Mujer",
  edad: "Joven 18-25",
  etnia: "Afro-Latina",
  profesion: Object.keys(PERFILES)[0],
  marco: "Marco de neón fino rojo y azul",
  plano: "Plano Medio (Medium Shot)",
  idioma: "Inglés",
  badge: BADGE_SIN_PORCENTAJE,
  gafas: "Ninguna",
  accesorio: "Teléfono celular",
  paleta: "Alerta Clásica (Amarillo / Rojo)",
  arquetipo: "Ninguno (usar selectores manuales)",
  ...extra,
});

const PORCENTAJE = /\d+\s*%/;

describe("Fase 2 · sin porcentajes en las reglas espaciales", () => {
  it("ni el prompt de Gemini ni el de la API contienen porcentajes", () => {
    for (const acc of [...ACCESORIOS_MANO, "Manos a la cabeza (sin objeto)"]) {
      expect(buildPrompt(base({ accesorio: acc }))).not.toMatch(PORCENTAJE);
      expect(buildApiPrompt(base({ accesorio: acc }), { texto3d: true })).not.toMatch(PORCENTAJE);
      expect(buildApiPrompt(base({ accesorio: acc }), { texto3d: false })).not.toMatch(PORCENTAJE);
    }
  });
  it("la mirada se describe con el espacio: esquina inferior izquierda, un poco más arriba, sin mirar cámara, mano ni abajo", () => {
    const api = buildApiPrompt(base(), { texto3d: true });
    expect(api).toContain("empty lower-left area of the frame");
    expect(api).toContain("just above the very corner");
    expect(api).toMatch(/never look at the camera/);
    expect(api).toMatch(/never look downward/);
    const gemini = buildPrompt(base());
    expect(gemini).toContain("un poco por encima de la esquina inferior izquierda");
    expect(gemini).toContain("prohibido mirar el accesorio (celular, cable, portátil o tablet), la impresora, la mano, hacia abajo o a la cámara");
  });
});

describe("Fase 2 · prompt de la API (inglés)", () => {
  it("está en inglés (sin reglas ni palabras en español)", () => {
    for (const texto3d of [true, false]) {
      for (const acc of [...ACCESORIOS_MANO, "Manos a la cabeza (sin objeto)"]) {
        const p = buildApiPrompt(base({ accesorio: acc }), { texto3d });
        expect(p).not.toMatch(/[áéíóúñ¿¡]/);
        expect(p).not.toMatch(/PROHIBICI|REGLA|POSTURA CON|Sosteniendo/);
      }
    }
  });
  it("con texto 3D: incluye RESET, error, modelo, badge con placa y marca de agua", () => {
    const p = buildApiPrompt(base(), { texto3d: true });
    expect(p).toContain('"RESET"');
    expect(p).toContain('"ERROR 0X97"');
    expect(p).toContain('"EPSON L3110"');
    expect(p).toContain("rectangular plaque or rounded pill-shaped");
    expect(p).toContain('"ResetEnLinea.com"');
    expect(p).toContain("away from the lower-left corner and from the lower-right corner");
  });
  it("sin texto 3D: pide la imagen sin texto y deja las zonas libres", () => {
    const p = buildApiPrompt(base(), { texto3d: false });
    expect(p).toContain("Do not render any text");
    expect(p).not.toContain('"RESET"');
    expect(p).not.toContain("ResetEnLinea.com");
    expect(p).not.toContain("badge sits on");
    expect(p).toContain("kept clean for post-production");
  });
  it("el bloque final de restricciones negativas cubre manos, logos y las dos esquinas", () => {
    for (const texto3d of [true, false]) {
      const p = buildApiPrompt(base(), { texto3d });
      const neg = p.slice(p.lastIndexOf("Avoid:"));
      for (const t of ["extra hands", "deformed hands", "logos or brand names on the clothing", "lower-left corner", "lower-right corner"]) {
        expect(neg).toContain(t);
      }
    }
  });
  it("siempre: ropa lisa sin logos, impresoras de la marca al fondo, esquina inferior derecha libre y encuadre", () => {
    for (const marca of ["Epson", "Canon"]) {
      const p = buildApiPrompt(base({ marca }), { texto3d: true });
      expect(p).toContain("no logos, brand names, printed text or emblems");
      expect(p).toContain(`Real physical ${marca} printers`);
      expect(p).toContain("lower-right corner free of important elements");
      expect(p).toContain("frames the entire image");
    }
  });
  it("la postura de manos es única y coherente en todas las combinaciones", () => {
    for (const nombre of Object.keys(ARQUETIPOS)) {
      for (const acc of [...ACCESORIOS_MANO, "Manos a la cabeza (sin objeto)"]) {
        for (const texto3d of [true, false]) {
          const p = buildApiPrompt(base({ arquetipo: nombre, accesorio: acc }), { texto3d });
          const objeto = (p.match(/Exactly one hand holds/g) ?? []).length;
          const cabeza = (p.match(/Both hands are placed on the sides of the head/g) ?? []).length;
          expect(objeto + cabeza).toBe(1);
          if (acc.startsWith("Manos")) expect(p).not.toMatch(/smartphone|USB cable up/);
        }
      }
    }
  });
  it("el prompt de Gemini conserva su formato (reglas en español)", () => {
    const g = buildPrompt(base());
    expect(g).toContain("REGLA DE BRANDING");
    expect(g).toContain("MARCA DE AGUA DE SEGURIDAD");
    expect(g).toContain("ANATOMÍA HUMANA IMPECABLE");
  });
});
