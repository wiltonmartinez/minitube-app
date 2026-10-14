import { describe, expect, it } from "vitest";
import golden from "./fixtures/textube-golden.json";
import { extraerDatos, extraerVideoId } from "@/lib/textube/datos-video";
import { ErrorTextos, datosManual, elegirPlantilla, generarTextos, parsearPlantilla, vistaPlantilla } from "@/lib/textube/plantillas";
import { PLANTILLAS_DEFECTO } from "@/lib/textube/plantillas-defecto";

// Los valores esperados salen del programa de Python de Gestor TUBE (textos_video.py y datos_video.py): el port debe dar lo mismo.
describe("TexTUBE · mismo resultado que Gestor TUBE (Python)", () => {
  it.each(golden.casos)("«$titulo»", (c) => {
    const datos = extraerDatos(c.titulo);
    expect(datos).toEqual(c.datos);
    if (!datos) return;
    expect(elegirPlantilla(datos)).toBe(c.plantilla);
    if (c.textos) expect(generarTextos(datos, { semilla: "abcDEF12345", videoId: "abcDEF12345" })).toEqual(c.textos);
  });

  it.each(golden.manual)("plantilla $plantilla con datos a mano", (m) => {
    expect(generarTextos(m.datos, { tituloN: m.tituloN, semilla: "L1", plantilla: m.plantilla, videoId: null })).toEqual(m.textos);
  });

  it.each(golden.vistas)("vista de la plantilla $n", (v) => {
    expect(vistaPlantilla(PLANTILLAS_DEFECTO[v.n], v.modelo, v.n)).toEqual(v.vista);
  });
});

describe("TexTUBE · validaciones", () => {
  it("rechaza una plantilla sin secciones", () => {
    expect(() => parsearPlantilla("---TITULOS---\nA\n", 1)).toThrow(ErrorTextos);
  });
  it("datos escritos a mano: la plantilla 1 trae marca y error", () => {
    expect(datosManual({ plantilla: 1, modelo: "l4150" })).toMatchObject({ marca: "Epson", modelo: "L4150", error: "ALMOHADILLAS" });
    expect(() => datosManual({ plantilla: 3, marca: "Canon", modelo: "G6010", error: "XYZ" })).toThrow(/lista/);
    expect(() => datosManual({ marca: "Sony", modelo: "L4150", error: "" })).toThrow(/marca/);
    expect(() => datosManual({ marca: "Epson", modelo: "L", error: "" })).toThrow(/modelo/);
    expect(datosManual({})).toBeNull();
  });
  it("un título no puede pasar de 100 caracteres ni llevar < >", () => {
    const base = PLANTILLAS_DEFECTO[1];
    const largo = base.replace(/(---TITULOS---\n)/, "$1" + "X".repeat(120) + "\n");
    expect(() => generarTextos({ marca: "Epson", modelo: "L4150", error: "Almohadillas" }, { tituloN: 1, editadas: { 1: largo } })).toThrow(/100/);
  });
  it("extrae el ID de las direcciones de YouTube", () => {
    const id = "rdMXeYj8c7Y";
    for (const u of [id, `https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?t=3`, `https://www.youtube.com/shorts/${id}`, `youtube.com/embed/${id}`]) expect(extraerVideoId(u)).toBe(id);
    expect(() => extraerVideoId("hola")).toThrow(/video/);
  });
});
