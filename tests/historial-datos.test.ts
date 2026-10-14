import { describe, expect, it } from "vitest";
import { MAX_VERSIONES, borrarVersion, guardarAutomatica, guardarVersion, leerVersiones, restaurarVersion } from "@/lib/historial-datos";
import { TODOS_LOS_MODULOS } from "@/lib/modulos";
import { VERSIONES_MODULOS, versionActual } from "@/lib/versiones-modulos";

const almacen = (inicial: Record<string, string> = {}) => {
  const d = new Map(Object.entries(inicial));
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v), removeItem: (k: string) => void d.delete(k) };
};
const CLAVES = ["a", "b"];

describe("historial de versiones de los datos", () => {
  it("guarda versiones, no repite la idéntica y vuelve a una anterior (guardando antes cómo estaba)", () => {
    const a = almacen({ a: "uno" });
    expect(guardarVersion(a, "m", CLAVES, "Primera")).not.toBeNull();
    expect(guardarVersion(a, "m", CLAVES, "Igual")).toBeNull(); // nada cambió
    a.setItem("a", "dos");
    a.setItem("b", "nuevo");
    const v2 = guardarVersion(a, "m", CLAVES, "Segunda")!;
    expect(leerVersiones(a, "m").map((v) => v.motivo)).toEqual(["Segunda", "Primera"]);
    const primera = leerVersiones(a, "m")[1];
    a.setItem("a", "tres");
    expect(restaurarVersion(a, "m", CLAVES, primera.id)).toBe(true);
    expect(a.getItem("a")).toBe("uno");
    expect(a.getItem("b")).toBeNull(); // lo que no existía entonces se quita
    expect(leerVersiones(a, "m")[0].motivo).toBe("Antes de volver a una versión anterior");
    expect(leerVersiones(a, "m")[0].datos.a).toBe("tres"); // se puede deshacer la vuelta
    expect(v2.datos.b).toBe("nuevo");
    expect(restaurarVersion(a, "m", CLAVES, "no-existe")).toBe(false);
  });

  it("las automáticas se espacian 10 minutos y las versiones se limitan a 20", () => {
    const a = almacen({ a: "1" });
    const t0 = new Date("2026-10-14T10:00:00Z");
    expect(guardarAutomatica(a, "m", CLAVES, "Antes de editar", t0)).not.toBeNull();
    a.setItem("a", "2");
    expect(guardarAutomatica(a, "m", CLAVES, "Antes de editar", new Date(t0.getTime() + 5 * 60_000))).toBeNull();
    expect(guardarAutomatica(a, "m", CLAVES, "Antes de editar", new Date(t0.getTime() + 11 * 60_000))).not.toBeNull();
    for (let i = 0; i < 30; i++) {
      a.setItem("a", "x" + i);
      guardarVersion(a, "m", CLAVES, "n" + i);
    }
    expect(leerVersiones(a, "m")).toHaveLength(MAX_VERSIONES);
    expect(leerVersiones(a, "m")[0].motivo).toBe("n29");
  });

  it("borrar, datos dañados y sin almacén no rompen nada", () => {
    const a = almacen({ a: "1" });
    const v = guardarVersion(a, "m", CLAVES, "x")!;
    borrarVersion(a, "m", v.id);
    expect(leerVersiones(a, "m")).toEqual([]);
    a.setItem("gt_versiones:m", "{no es json");
    expect(leerVersiones(a, "m")).toEqual([]);
    expect(leerVersiones(null, "m")).toEqual([]);
    expect(guardarVersion(null, "m", CLAVES, "x")).toBeNull();
    expect(restaurarVersion(null, "m", CLAVES, "x")).toBe(false);
  });
});

describe("versión de cada módulo", () => {
  it("cada módulo tiene su versión actual y su historial, de la más nueva a la más vieja", () => {
    const peso = (v: string) => v.split(".").map(Number).reduce((a, n) => a * 1000 + n, 0);
    for (const m of TODOS_LOS_MODULOS) {
      const lista = VERSIONES_MODULOS[m];
      expect(lista.length, m).toBeGreaterThan(1);
      expect(versionActual(m)).toBe(lista[0].version);
      for (let i = 1; i < lista.length; i++) expect(peso(lista[i - 1].version), `${m} ${lista[i - 1].version} > ${lista[i].version}`).toBeGreaterThan(peso(lista[i].version));
    }
  });
});
