import { afterEach, describe, expect, it } from "vitest";
import { configVacia, normalizarConfig } from "@/lib/textube/config";
import { opcionesDe, configurar, datosManual, elegirPlantilla, erroresDe, errorDefectoDe, fijosDe, generarTextos, listaPlantillas, nombreDe, numerosPlantilla, textoOriginal } from "@/lib/textube/plantillas";

afterEach(() => configurar(configVacia()));

describe("TexTUBE · menús editables (CRUD)", () => {
  it("sin cambios la configuración es la original", () => {
    expect(numerosPlantilla()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Object.keys(erroresDe(6)!)).toHaveLength(21);
    expect(errorDefectoDe(2)).toBe("Combinado");
    expect(listaPlantillas()[0]).toMatchObject({ n: 1, nombre: "Epson · Almohadillas" });
    expect(opcionesDe(3).map((o) => o.nombre)).toEqual(["5B00", "1700", "Combinado"]); // el orden de Gestor TUBE
    expect(opcionesDe(4).map((o) => o.nombre)).toEqual(["5B00", "1700", "E08", "P07", "Combinado"]);
    expect(opcionesDe(1)).toEqual([]);
  });

  it("marcas: se agrega una propia y se acepta al escribir los datos", () => {
    const c = configVacia();
    c.marcas.push({ valor: "HP", nombre: "HP Inc.", propia: true });
    configurar(normalizarConfig(c));
    expect(datosManual({ marca: "hp", modelo: "DJ2130", error: "Almohadillas" })).toMatchObject({ marca: "HP", modelo: "DJ2130" });
    expect(datosManual({ marca: "HP Inc.", modelo: "DJ2130", error: "x" })?.marca).toBe("HP");
    // una marca nueva no tiene plantilla automática
    expect(elegirPlantilla({ marca: "HP", modelo: "DJ2130", error: "ALMOHADILLAS" })).toBeNull();
    configurar(configVacia());
    expect(() => datosManual({ marca: "HP", modelo: "DJ2130", error: "" })).toThrow(/marca/);
  });

  it("marcas: renombrar y ocultar las originales no rompe los datos", () => {
    const c = configVacia();
    c.marcas[2] = { ...c.marcas[2], nombre: "Plotters Epson", oculta: true };
    const n = normalizarConfig(c);
    configurar(n);
    expect(n.marcas.find((m) => m.valor === "Epson-SC")).toMatchObject({ nombre: "Plotters Epson", oculta: true });
    expect(datosManual({ marca: "Plotters Epson", modelo: "F570", error: "0014BD" })?.marca).toBe("Epson-SC");
    expect(normalizarConfig({ marcas: [] }).marcas.map((m) => m.valor)).toEqual(["Epson", "Canon", "Epson-SC"]); // las originales siempre vuelven
  });

  it("opciones de error: agregar, cambiar y quitar en una plantilla original", () => {
    const c = configVacia();
    c.opcionesError[3] = [{ nombre: "5B00", enlace: "5B00" }, { nombre: "5B02", enlace: "5B02" }];
    c.opcionDefecto[3] = "5B02";
    configurar(normalizarConfig(c));
    expect(Object.keys(erroresDe(3)!)).toEqual(["5B00", "5B02"]);
    expect(errorDefectoDe(3)).toBe("5B02");
    const t = generarTextos({ marca: "Canon", modelo: "G6010", modelo_texto: "G6010", error: "5B02" }, { plantilla: 3, tituloN: 1, videoId: "abcDEF12345" })!;
    expect(t.plantilla).toBe(3);
    // sin opciones, el error pasa a escribirse libre
    const libre = configVacia();
    libre.opcionesError[3] = [];
    configurar(normalizarConfig(libre));
    expect(erroresDe(3)).toBeUndefined();
  });

  it("plantilla 6: las opciones editadas mandan sobre la elección automática", () => {
    const c = configVacia();
    c.opcionesError[6] = [{ nombre: "00080000", enlace: "00080000" }];
    configurar(normalizarConfig(c));
    expect(elegirPlantilla({ marca: "Epson-SC", modelo: "F570", error: "00080000" })).toBe(6);
    expect(elegirPlantilla({ marca: "Epson-SC", modelo: "F570", error: "00040000" })).toBeNull();
  });

  it("plantilla propia: crear, usar con su marca/error fijos, renombrar y eliminar", () => {
    const c = configVacia();
    c.propias.push({ n: 7, nombre: "HP DeskJet", cuando: "HP a mano", modelo: "DJ2130", marca: "Epson", error: "Almohadillas", opciones: [], opcionDefecto: "" });
    configurar(normalizarConfig(c));
    expect(numerosPlantilla()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(nombreDe(7)).toBe("HP DeskJet");
    expect(fijosDe(7)).toEqual({ marca: "Epson", error: "Almohadillas" });
    expect(textoOriginal(7)).toBeUndefined();
    const texto = "---TITULOS---\nReset {modelo} {error}\n---ETIQUETAS---\nreset {modelo_l}, epson\n---DESCRIPCION---\nHola {modelo} {error_texto} {idvideo}\n";
    const d = datosManual({ plantilla: 7, modelo: "dj2130" })!;
    expect(d).toMatchObject({ marca: "Epson", modelo: "DJ2130", error: "ALMOHADILLAS" });
    const t = generarTextos(d, { plantilla: 7, editadas: { 7: texto }, videoId: "abcDEF12345" })!;
    expect(t.titulo).toBe("Reset DJ2130 Almohadillas".replace("Almohadillas", "Almohadillas"));
    expect(t.etiquetas).toEqual(["reset dj2130", "epson"]);
    expect(t.descripcion).toContain("abcDEF12345");
    expect(() => generarTextos(d, { plantilla: 7 })).toThrow(/Falta el texto/); // sin texto escrito no se inventa nada
    // renombrar
    c.propias[0].nombre = "HP renombrada";
    configurar(normalizarConfig(c));
    expect(nombreDe(7)).toBe("HP renombrada");
    // eliminar
    c.propias = [];
    configurar(normalizarConfig(c));
    expect(() => generarTextos(d, { plantilla: 7, editadas: { 7: texto } })).toThrow(/no existe/);
  });

  it("nombres de las originales: se cambian sin tocar su comportamiento", () => {
    const c = configVacia();
    c.nombres[1] = { nombre: "Mi plantilla 1", cuando: "otra ayuda" };
    configurar(normalizarConfig(c));
    expect(nombreDe(1)).toBe("Mi plantilla 1");
    expect(elegirPlantilla({ marca: "Epson", modelo: "L4150", error: "ALMOHADILLAS" })).toBe(1);
  });

  it("lo que viene dañado o con datos raros se corrige", () => {
    expect(normalizarConfig(null)).toEqual(configVacia());
    expect(normalizarConfig("hola")).toEqual(configVacia());
    const sucio = normalizarConfig({ propias: [{ n: 3, nombre: "x" }, { n: 7, nombre: "<b>ok</b>" }, { n: 7, nombre: "duplicada" }], errores: ["A", "A", " ", "B"], marcas: [{ valor: "../x", propia: true, nombre: "mala" }] });
    expect(sucio.propias.map((p) => p.n)).toEqual([7]); // no puede pisar una original ni repetirse
    expect(sucio.errores).toEqual(["A", "B"]);
    expect(sucio.marcas).toHaveLength(3); // una marca con caracteres no permitidos no entra
  });
});
