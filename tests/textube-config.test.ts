import { afterEach, describe, expect, it } from "vitest";
import { claveDeNombre, claveValida, configVacia, normalizarConfig } from "@/lib/textube/config";
import { opcionesDe, configurar, datosManual, elegirPlantilla, erroresDe, errorDefectoDe, fijosDe, generarTextos, listaPlantillas, nombreDe, numerosPlantilla, textoOriginal, valoresDeVariables, vistaPlantilla } from "@/lib/textube/plantillas";

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

describe("TexTUBE · variables propias (CRUD)", () => {
  const texto = "---TITULOS---\n{accion} {modelo} {error}\n{accion_l} de {modelo}\n---ETIQUETAS---\n{accion_l} {modelo_l}, #{accion_h}\n---DESCRIPCION---\nServicio: {accion} · {accion_h} · {accion_l} · {tipo}\n";
  const datos = { marca: "Epson", modelo: "L4150", modelo_texto: "L4150", error: "Almohadillas" };

  it("viene con la variable «Acción» (Reset, Diagnóstico, Activación) y no cambia nada si ninguna plantilla la usa", async () => {
    const { VARIABLES_BASE } = await import("@/lib/textube/config");
    expect(configVacia().variables).toEqual(VARIABLES_BASE);
    expect(configVacia().variables[0]).toMatchObject({ clave: "accion", nombre: "Acción", valores: ["Reset", "Diagnóstico", "Activación"], defecto: "Reset" });
    const t = generarTextos(datos, { plantilla: 1, tituloN: 1, videoId: "abcDEF12345" })!;
    expect(t.titulo).toContain("Reset Epson L4150"); // la plantilla original no usa {accion}
  });

  it("el marcador se reemplaza por el valor elegido (tal cual, en minúsculas y para hashtag)", () => {
    const g = (variables?: Record<string, string>) => generarTextos(datos, { plantilla: 1, tituloN: 1, editadas: { 1: texto }, variables })!;
    expect(g().titulo).toBe("Reset L4150 Almohadillas"); // sin elegir: el valor marcado de entrada
    const d = g({ accion: "Diagnóstico" });
    expect(d.titulo).toBe("Diagnóstico L4150 Almohadillas");
    expect(d.titulos[1]).toBe("diagnóstico de L4150");
    expect(d.etiquetas).toEqual(["diagnóstico l4150", "#Diagnostico"]); // {accion_h}: sin tilde
    expect(d.descripcion).toContain("Servicio: Diagnóstico · Diagnostico · diagnóstico · {tipo}");
    expect(g({ accion: "Activación" }).etiquetas[1]).toBe("#Activacion");
    expect(g({ accion: "No existe" }).titulo).toBe("Reset L4150 Almohadillas"); // un valor que no está en la lista se ignora
  });

  it("crear, cambiar y eliminar variables y valores", () => {
    const c = configVacia();
    c.variables.push({ clave: "tipo", nombre: "Tipo de servicio", valores: ["Remoto", "En sitio", "Express rápido"], defecto: "En sitio" });
    configurar(normalizarConfig(c));
    const t = generarTextos(datos, { plantilla: 1, tituloN: 1, editadas: { 1: texto.replace("{tipo}", "{tipo}|{tipo_l}|{tipo_h}") }, variables: { tipo: "Express rápido" } })!;
    expect(t.descripcion).toContain("Express rápido|express rápido|ExpressRapido");
    // quitar un valor: si era el elegido, vuelve al marcado de entrada
    c.variables[1].valores = ["Remoto", "En sitio"];
    configurar(normalizarConfig(c));
    expect(valoresDeVariables({ tipo: "Express rápido" }).tipo).toBe("En sitio");
    // eliminar la variable: el marcador queda sin reemplazar (y la vista previa lo avisa)
    c.variables = c.variables.filter((v) => v.clave !== "tipo");
    configurar(normalizarConfig(c));
    expect(vistaPlantilla(texto, "L4150", 1).avisos.join(" ")).toContain("{tipo}");
  });

  it("la vista previa conoce los marcadores de las variables y avisa solo de los desconocidos", () => {
    const av = vistaPlantilla(texto, "L4150", 1).avisos.join(" ");
    expect(av).toContain("{tipo}");
    expect(av).not.toContain("{accion");
  });

  it("nombres de variables válidos: sin tildes ni espacios, sin repetir ni pisar los de TexTUBE", () => {
    expect(claveDeNombre("Tipo de servicio")).toBe("tipodeservicio");
    expect(claveDeNombre("Acción")).toBe("accion");
    expect(claveDeNombre("123 Año")).toBe("ano");
    expect(claveValida("accion")).toBe(true);
    for (const mala of ["modelo", "error", "idvideo", "error_texto", "", "9x", "con espacio", "Mayus"]) expect(claveValida(mala), mala).toBe(false);
    const sucio = normalizarConfig({ variables: [{ clave: "modelo", valores: ["a"] }, { clave: "ok", nombre: "Ok", valores: ["a", "a", " b ", ""], defecto: "zzz" }, { clave: "ok", valores: ["x"] }, { clave: "MAYUS", valores: ["q"] }] });
    expect(sucio.variables.map((v) => v.clave)).toEqual(["ok", "mayus"]);
    expect(sucio.variables[0]).toMatchObject({ valores: ["a", "b"], defecto: "a" }); // sin repetidos ni vacíos; el valor marcado siempre es uno de la lista
    expect(normalizarConfig({}).variables).toEqual(configVacia().variables); // sin dato: la original
    expect(normalizarConfig({ variables: [] }).variables).toEqual([]); // vaciarlas a propósito se respeta
  });
});
