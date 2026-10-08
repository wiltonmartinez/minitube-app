import { describe, expect, it } from "vitest";
import { aplicarTodoAlAzar } from "@/lib/azar";

// Formulario completo de ejemplo (los mismos campos que el de la página)
const form = {
  marca: "Epson",
  modelo: "L3110",
  error: "Error 0x97",
  errorOtro: "",
  genero: "Mujer",
  edad: "Joven 18-25",
  etnia: "Afro-Latina",
  profesion: "Técnico",
  marco: "M1",
  plano: "Plano Detalle",
  idioma: "Español",
  modoPersonaje: "Arquetipo listo",
  modoRostro: "Estilo predefinido",
  gafas: "Azules vidIQ",
  accesorio: "Tablet",
  badge: "100% Seguro",
  paleta: "Alerta",
  arquetipo: "Mujer rubia",
  pers: { estilo: "S1", forma: "Ovalado", ojosColor: "Verde", cejas: "Finas" } as Record<string, string>,
};
const azar = {
  genero: "Hombre",
  edad: "Mayor 66-70",
  etnia: "Asiática del Este",
  profesion: "Diseñador",
  marco: "M2",
  plano: "Primer Plano",
  idioma: "Inglés",
  modoPersonaje: "Personalizar",
  modoRostro: "Detalle completo",
  gafas: "🎲 Aleatorio",
  accesorio: "🎲 Aleatorio (según perfil)",
  badge: "🎲 Aleatorio",
  paleta: "🎲 Aleatorio",
  arquetipo: "🎲 Aleatorio (arquetipo)",
  pers: { estilo: "🎲 Aleatorio", forma: "🎲 Aleatorio", ojosColor: "🎲 Aleatorio", cejas: "🎲 Aleatorio" },
};
const BLOQUE_1 = ["marca", "modelo", "error", "errorOtro"] as const;

describe("Todo al azar excepto marca, modelo y error", () => {
  it("cambia todos los campos de los bloques 2, 3 y 4 y nunca toca el bloque 1", () => {
    const sal = aplicarTodoAlAzar(form, azar, {});
    for (const k of BLOQUE_1) expect(sal[k]).toBe(form[k]);
    for (const k of Object.keys(azar) as (keyof typeof azar)[]) {
      if (k === "pers") continue;
      expect(sal[k], k).toBe(azar[k]);
    }
    expect(Object.values(sal.pers).every((v) => v === "🎲 Aleatorio")).toBe(true);
  });
  it("incluye plano e idioma, que antes eran fijos", () => {
    const sal = aplicarTodoAlAzar(form, azar, {});
    expect(sal.plano).toBe("Primer Plano");
    expect(sal.idioma).toBe("Inglés");
    expect(sal.modoPersonaje).toBe("Personalizar");
  });
  it("los campos con candado 🔒 no cambian (cualquier combinación)", () => {
    const claves = ["genero", "edad", "etnia", "profesion", "marco", "plano", "idioma", "modoPersonaje", "modoRostro", "gafas", "accesorio", "badge", "paleta", "arquetipo"] as const;
    for (const c of claves) {
      const sal = aplicarTodoAlAzar(form, azar, { [c]: true });
      expect(sal[c], c).toBe(form[c]);
      for (const otra of claves.filter((x) => x !== c)) expect(sal[otra], otra).toBe(azar[otra]);
    }
    const todos = Object.fromEntries(claves.map((c) => [c, true]));
    const sal = aplicarTodoAlAzar(form, azar, todos);
    for (const c of claves) expect(sal[c]).toBe(form[c]);
  });
  it("los candados del personaje se aplican campo por campo", () => {
    const sal = aplicarTodoAlAzar(form, azar, { "pers.forma": true, "pers.ojosColor": true });
    expect(sal.pers).toEqual({ estilo: "🎲 Aleatorio", forma: "Ovalado", ojosColor: "Verde", cejas: "🎲 Aleatorio" });
  });
  it("no modifica el formulario original", () => {
    const copia = JSON.stringify(form);
    aplicarTodoAlAzar(form, azar, { genero: true });
    expect(JSON.stringify(form)).toBe(copia);
  });
});
