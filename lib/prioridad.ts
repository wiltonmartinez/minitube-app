import { MODELOS, MODELO_POR_DEFECTO, buscarModelo, type ModeloIA } from "@/lib/image-models";

// Enrutador de prioridad. En esta fase todo es prioridad «normal» con el modelo por defecto; la fase 2 añade la
// prioridad «alta» para los plotters (F570, F571, T3170 y T3170X).
export type Prioridad = "alta" | "normal";

export type Ruta = { prioridad: Prioridad; modelo: ModeloIA };

export function elegirRuta(modelo: string): Ruta {
  void modelo;
  return { prioridad: "normal", modelo: buscarModelo(MODELO_POR_DEFECTO) ?? MODELOS[0] };
}
