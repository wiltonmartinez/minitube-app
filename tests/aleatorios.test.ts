import { describe, expect, it } from "vitest";
import { SORTEO_NEUTRO, elegirCon, resolverAleatorios } from "@/lib/aleatorios";
import { EMOCIONES_POR_TONO, tonoDeEdad } from "@/lib/edades";
import { ENFOQUES, ENFOQUE_AUTO, etiquetaEnfoque } from "@/lib/enfoques";
import { ALEATORIO, MODOS_ROSTRO } from "@/lib/rostro";
import { DISPOSITIVOS, DISPOSITIVO_NINGUNO, ETNIAS_PANEL, GENEROS, MIRADA_OPCIONES } from "@/lib/prompt-config";

const base = {
  genero: ALEATORIO, edad: ALEATORIO, emocionPanel: ALEATORIO, etnia: ALEATORIO, modoRostro: ALEATORIO, profesion: ALEATORIO,
  dispositivo: ALEATORIO, dispositivoManual: false, mirada: ALEATORIO, miradaExperto: ALEATORIO, enfoqueSel: ENFOQUE_AUTO,
};
const opciones = (u: number, extra = {}) => ({
  numeros: { ...SORTEO_NEUTRO, rgenero: u, redad: u, remocion: u, retnia: u, rrostro: u, rprofesion: u, rdispositivo: u, rmirada: u },
  profesiones: ["Sublimación", "Litografía", "Técnico de Impresoras", "Diseñador(a) Gráfico"],
  generos: GENEROS, etnias: ETNIAS_PANEL, modosRostro: MODOS_ROSTRO, dispositivos: [DISPOSITIVO_NINGUNO, ...DISPOSITIVOS], miradas: MIRADA_OPCIONES, ...extra,
});

describe("menús en «Aleatorio»", () => {
  it("elegirCon cubre toda la lista y no se sale del rango", () => {
    expect(elegirCon(["a", "b", "c"], 0)).toBe("a");
    expect(elegirCon(["a", "b", "c"], 0.999)).toBe("c");
    expect(elegirCon(["a", "b", "c"], 1)).toBe("c");
  });

  it("no queda ningún «Aleatorio» y todo es coherente con el enfoque, para muchos sorteos", () => {
    for (let i = 0; i < 200; i++) {
      const u = Math.random();
      const r = resolverAleatorios(base, opciones(u));
      for (const v of Object.values(r)) expect(v).not.toBe(ALEATORIO);
      const enfoque = r.profesion === "Técnico de Impresoras" ? 3 : r.profesion === "Litografía" || r.profesion === "Diseñador(a) Gráfico" ? 2 : 1;
      expect(ENFOQUES[enfoque as 1 | 2 | 3].etnias).toContain(r.etnia);
      expect(tonoDeEdad(r.edad)).toBe(enfoque === 3 ? "autoridad" : "cliente");
      expect(EMOCIONES_POR_TONO[tonoDeEdad(r.edad)!]).toContain(r.emocionPanel);
      expect(r.dispositivoManual).toBe(true);
    }
  });

  it("lo elegido a mano no se toca y el enfoque elegido limita la profesión", () => {
    const r = resolverAleatorios({ ...base, genero: "Hombre", etnia: "Asiático / Coreano", enfoqueSel: etiquetaEnfoque(3) }, opciones(0.1));
    expect(r.genero).toBe("Hombre");
    expect(r.etnia).toBe("Asiático / Coreano");
    expect(r.profesion).toBe("Técnico de Impresoras");
    expect(tonoDeEdad(r.edad)).toBe("autoridad");
    expect(r.dispositivoManual).toBe(true);
  });

  it("enfoque 4: la emoción es de éxito", () => {
    const r = resolverAleatorios({ ...base, enfoqueSel: etiquetaEnfoque(4) }, opciones(0.4));
    expect(EMOCIONES_POR_TONO.exito).toContain(r.emocionPanel);
  });

  it("sin «Aleatorio» el formulario queda igual", () => {
    const f = { ...base, genero: "Mujer", edad: "18 a 25 años", emocionPanel: "Frustración", etnia: ETNIAS_PANEL[0], modoRostro: MODOS_ROSTRO[0], profesion: "Sublimación", dispositivo: "PC", mirada: MIRADA_OPCIONES[0], miradaExperto: MIRADA_OPCIONES[1] };
    expect(resolverAleatorios(f, opciones(0.7))).toEqual(f);
  });
});
