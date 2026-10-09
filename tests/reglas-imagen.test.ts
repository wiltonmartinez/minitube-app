import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/thumbnail/route";
import { COMPOSICION, planificar } from "@/lib/motor";
import { auditarPrompt } from "@/lib/prohibidos";
import {
  ARQUETIPOS,
  BADGES_REALES,
  MARCOS,
  PERFILES,
  buildApiPrompt,
  buildPrompt,
  familiaColor,
  marcoCompatible,
  type PromptInput,
} from "@/lib/prompt-config";

const TOKEN = "token-de-prueba-muy-largo-0123456789abcdef";
const post = (cuerpo: unknown) =>
  POST(
    new Request("http://localhost/api/v1/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(cuerpo),
    }),
  );

beforeEach(() => {
  vi.stubEnv("MINITUBE_API_TOKEN", TOKEN);
  vi.stubEnv("FAL_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

const MODELOS = ["L3250", "G6010", "F570", "T3170X", "SC-F571", "T3170Z"];
const ERRORES = ["Almohadillas", "5B00", "E-11", "00000008", "0014BD"];

function escenas(n = 120) {
  const salida = [];
  for (let s = 1; s <= n; s++) {
    const modelo = MODELOS[s % MODELOS.length];
    const alta = ["F570", "T3170X", "SC-F571"].includes(modelo);
    for (const enfoque of ["error", "solucion"] as const) {
      salida.push({ s, modelo, alta, enfoque, plan: planificar({ marca: "Epson", modelo, error: ERRORES[s % ERRORES.length], enfoque, generarImagen: false, semilla: s }, alta ? "alta" : "normal") });
    }
  }
  return salida;
}

describe("Fase 3 · palabras prohibidas en los prompts de imagen", () => {
  it("el auditor detecta WhatsApp, teléfonos, «reparar» y «tutorial»", () => {
    for (const malo of ["WhatsApp", "whats app", "wa.me/57", "+57 3001234567", "300-123-4567", "3001234567890", "reparar", "reparación", "repair", "repairing", "tutorial", "Tutoriales", "número de teléfono", "phone number"]) {
      expect(auditarPrompt(`algo ${malo} algo`).length, malo).toBeGreaterThan(0);
    }
  });
  it("no da falsos positivos con códigos de error, modelos y medidas", () => {
    for (const bueno of ["00000008", "0014BD", "L3250", "F570", "1920x1080", "16:9", "85mm lens", "Error 5B00", "aged 20 to 30", "preparar", "prepared"]) {
      expect(auditarPrompt(`texto ${bueno} texto`), bueno).toEqual([]);
    }
  });
  it("ningún prompt (imagen ni Gemini) los contiene: 6 modelos × 2 enfoques × 120 semillas", () => {
    for (const e of escenas()) {
      expect(auditarPrompt(e.plan.promptImagen), `imagen s${e.s} ${e.modelo}`).toEqual([]);
      expect(auditarPrompt(e.plan.promptGemini), `gemini s${e.s} ${e.modelo}`).toEqual([]);
    }
  });
  it("también en todas las profesiones y arquetipos del motor", () => {
    for (const profesion of Object.keys(PERFILES)) {
      for (const arquetipo of Object.keys(ARQUETIPOS)) {
        const entrada: PromptInput = {
          marca: "Canon", modelo: "G3110", error: "5B00", genero: "Mujer", edad: "Joven 18-25", etnia: "Afro-Latina", profesion,
          marco: MARCOS[0].es, plano: "Plano Medio (Medium Shot)", idioma: "Español", badge: BADGES_REALES[0], gafas: "Ninguna",
          accesorio: "Teléfono celular", paleta: "Alerta Clásica (Amarillo / Rojo)", arquetipo,
        };
        expect(auditarPrompt(buildApiPrompt(entrada, { texto3d: false })), `${profesion}/${arquetipo}`).toEqual([]);
        expect(auditarPrompt(buildPrompt(entrada)), `${profesion}/${arquetipo} (Gemini)`).toEqual([]);
      }
    }
  });
  it("la API rechaza (400) marca, modelo o error con palabras prohibidas", async () => {
    for (const cuerpo of [
      { marca: "Epson", modelo: "L3250", error: "tutorial" },
      { marca: "Epson", modelo: "WhatsApp", error: "Almohadillas" },
      { marca: "reparar", modelo: "L3250", error: "Almohadillas" },
      { marca: "Epson", modelo: "L3250", error: "llama 300-123-4567" },
    ]) {
      const r = await post(cuerpo);
      expect(r.status, JSON.stringify(cuerpo)).toBe(400);
      const j = await r.json();
      expect(j.error.codigo).toBe("DATOS_INVALIDOS");
      expect(j.error.mensaje).toContain("palabra no permitida");
    }
    expect((await post({ marca: "Epson", modelo: "L3250", error: "00000008", generarImagen: false })).status).toBe(200);
  });
});

describe("Fase 3 · reglas obligatorias del prompt de imagen", () => {
  const todas = escenas(60);

  it("está en inglés (solo los nombres propios llevan tilde)", () => {
    for (const e of todas) {
      const texto = e.plan.promptImagen.replace(/Bogotá|Medellín/g, "");
      expect(texto, `s${e.s}`).not.toMatch(/[áéíóúñ¿¡]/);
      expect(texto).not.toMatch(/\b(el|la|los|las|una|para|pero|con|sin|del)\b/);
    }
  });
  it("ultra realismo armónico: frases exactas", () => {
    for (const e of todas) {
      for (const f of ["natural harmonious beauty", "realistic skin texture with visible pores and subtle imperfections", "no plastic or airbrushed skin", "no exaggerated features"]) {
        expect(e.plan.promptImagen, f).toContain(f);
      }
    }
  });
  it("exactamente 2 brazos y 2 manos, con una sola postura", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      expect(p).toContain("exactly one person with exactly two arms and two hands");
      const posturas = (p.match(/Exactly one hand holds|Both hands are placed on the sides|Both hands touch the very same|Both hands are typing/g) ?? []).length;
      expect(posturas).toBe(1);
    }
  });
  it("mirada: frase exacta, sin porcentajes, nunca a la cámara", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      expect(p).toContain("eyes looking toward the empty lower-left corner of the frame, slightly above it, not at the camera");
      expect(p).toContain("never look at the camera");
      expect(p).not.toMatch(/\d+\s*%/);
    }
  });
  it("esquina inferior izquierda libre y esquina inferior derecha sin nada importante", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      expect(p).toContain("lower-left corner of the frame is completely empty");
      expect(p).toContain("no objects, no hands, no printers, no graphics and no text");
      expect(p).toContain("lower-right corner free of important elements");
    }
  });
  it("ropa lisa sin logos e impresoras (o plotters) reales de la marca en el fondo desenfocado", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      expect(p).toContain("no logos, brand names, printed text or emblems on shirts, caps, uniforms or accessories");
      expect(p).toMatch(e.alta ? /large, clearly recognizable Epson wide-format plotter .* plainly visible in the right-hand background/ : /Real physical Epson printers sit on shelves and tables in the blurred background/);
      expect(p).toMatch(/no legible logos or text on (?:them|it)/);
    }
  });
  it("«framed from the waist up at most, no hips, no legs visible»", () => {
    for (const e of todas) expect(e.plan.promptImagen).toContain("framed from the waist up at most, no hips, no legs visible");
  });
  it("emoción: enfoque «error» → pánico o desesperación; «solucion» → alivio o alegría", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      if (e.enfoque === "error") {
        expect(e.plan.emocion).toBe("panico");
        expect(p).toContain("panic and desperation");
        expect(p).not.toMatch(/relief|joy/);
      } else {
        expect(e.plan.emocion).toBe("alivio");
        expect(p).toContain("relief and joy");
        expect(p).not.toMatch(/panic|desperation|terrifying/);
      }
    }
  });
  it("restricciones negativas: sin manos extra, sin dedos deformes, sin logos y sin texto", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      const neg = p.slice(p.lastIndexOf("Avoid:"));
      for (const t of ["extra hands", "extra arms", "extra or missing fingers", "deformed hands", "logos or brand names on the clothing", "any other logos", "any text at all"]) {
        expect(neg, t).toContain(t);
      }
    }
  });
  it("la imagen se genera SIN texto (ni marca de agua): eso lo agrega TexTube por código", () => {
    for (const e of todas) {
      const p = e.plan.promptImagen;
      expect(p).toContain("Do not render any text, letters, numbers, logos, badges or labels anywhere in the image");
      expect(p).not.toContain("ResetEnLinea");
      expect(p).not.toContain('"RESET"');
    }
  });
  it("la API entrega a TexTube cómo componer: marca de agua, ventana de error y zonas libres", async () => {
    const j = await (await post({ marca: "Epson", modelo: "L3250", error: "Almohadillas", generarImagen: false })).json();
    expect(j.composicion).toEqual(JSON.parse(JSON.stringify(COMPOSICION)));
    expect(j.composicion.marcaDeAgua.texto).toBe("ResetEnLinea.com");
    expect(j.composicion.marcaDeAgua.esquina).toBe("inferior-izquierda");
    expect(j.composicion.zonasLibres).toEqual(["inferior-izquierda", "inferior-derecha"]);
    expect(j.composicion.textoPrincipal.evitarEsquina).toBe("inferior-derecha");
    expect(j.composicion.ancho).toBe(1280);
    expect(j.composicion.alto).toBe(720);
  });
});

describe("Fase 3 · marco y fondo nunca de la misma familia de color", () => {
  const escenasPerfil = Object.entries(PERFILES).map(([nombre, p]) => ({ nombre, escena: p.en.scene }));

  it("clasifica los colores en cálidos, fríos y neutros", () => {
    expect(familiaColor("a bright yellow neon border with a soft glow")).toBe("calido");
    expect(familiaColor("a border of fire and orange sparks")).toBe("calido");
    expect(familiaColor("a border of blue electric lightning")).toBe("frio");
    expect(familiaColor("a modern office with cool bluish lighting")).toBe("frio");
    expect(familiaColor("a modern workshop with heat presses and yellow neon lighting")).toBe("calido");
    expect(familiaColor("a polished chrome metallic border with reflections")).toBe("neutro");
    expect(familiaColor("a thin red and blue neon border")).toBe("neutro"); // mezcla: no choca con ninguno
  });
  it("para TODAS las combinaciones de marco y escenario, el marco efectivo nunca comparte familia con el fondo", () => {
    let ajustadas = 0;
    for (const m of MARCOS) {
      for (const { escena } of escenasPerfil) {
        const r = marcoCompatible(m.es, escena);
        const mf = familiaColor(r.en);
        const ff = familiaColor(escena);
        expect(mf === "neutro" || ff === "neutro" || mf !== ff, `${m.es} / ${escena}`).toBe(true);
        if (r.ajustado) ajustadas++;
        else expect(r.es).toBe(m.es); // si no choca, se respeta la elección
      }
    }
    expect(ajustadas).toBeGreaterThan(0); // hay choques reales que se corrigen
  });
  it("los prompts usan siempre el marco compatible", () => {
    for (const m of MARCOS) {
      for (const [nombre, p] of Object.entries(PERFILES)) {
        const entrada: PromptInput = {
          marca: "Epson", modelo: "L3250", error: "Almohadillas", genero: "Mujer", edad: "Joven 18-25", etnia: "Afro-Latina", profesion: nombre,
          marco: m.es, plano: "Plano Medio (Medium Shot)", idioma: "Español", badge: BADGES_REALES[0], gafas: "Ninguna",
          accesorio: "Teléfono celular", paleta: "Alerta Clásica (Amarillo / Rojo)", arquetipo: Object.keys(ARQUETIPOS)[0],
        };
        const ok = marcoCompatible(m.es, p.en.scene);
        const frase = ok.en.charAt(0).toUpperCase() + ok.en.slice(1);
        expect(buildApiPrompt(entrada, { texto3d: true }), `${m.es}/${nombre}`).toContain(`${frase} frames the entire image.`);
        // sin texto (TexTube compone): la imagen va a sangre, sin marco propio, para no duplicar el de TexTube
        const sinTexto = buildApiPrompt(entrada, { texto3d: false });
        expect(sinTexto).toContain("full-bleed to all four edges: no border, no frame");
        expect(sinTexto).not.toContain("frames the entire image");
        expect(buildPrompt(entrada)).toContain(`${frase} frames the entire image.`);
      }
    }
  });
});
