// «🎲 Aleatorio» en los menús del panel (género, edad, emoción, etnia, rostro, profesión, dispositivo y mirada).
// Lógica pura (sin React): cada menú puede quedar en Aleatorio y aquí se convierte en un valor concreto,
// respetando lo que permite el enfoque (etnias, edades, emociones, profesiones).
import { EMOCIONES_POR_TONO, EDADES_PANEL, tonoDeEdad } from "./edades";
import { ENFOQUE_AUTO, ENFOQUE_LIBRE, ENFOQUES, edadesDeEnfoque, enfoqueEfectivo, profesionEnEnfoque } from "./enfoques";
import { ALEATORIO } from "./rostro";

/** Un número entre 0 y 1 por cada menú que puede sortearse. */
export type NumerosSorteo = {
  rgenero: number;
  redad: number;
  remocion: number;
  retnia: number;
  rrostro: number;
  rprofesion: number;
  rdispositivo: number;
  rmirada: number;
};

export const SORTEO_NEUTRO: NumerosSorteo = { rgenero: 0.5, redad: 0.5, remocion: 0.5, retnia: 0.5, rrostro: 0.5, rprofesion: 0.5, rdispositivo: 0.5, rmirada: 0.5 };
export const nuevosNumerosSorteo = (): NumerosSorteo => ({
  rgenero: Math.random(),
  redad: Math.random(),
  remocion: Math.random(),
  retnia: Math.random(),
  rrostro: Math.random(),
  rprofesion: Math.random(),
  rdispositivo: Math.random(),
  rmirada: Math.random(),
});

/** Elige un elemento de la lista con un número entre 0 y 1. */
export const elegirCon = <T,>(lista: readonly T[], u: number): T => lista[Math.min(lista.length - 1, Math.max(0, Math.floor(u * lista.length)))];

type Resoluble = {
  genero: string;
  edad: string;
  emocionPanel: string;
  etnia: string;
  modoRostro: string;
  profesion: string;
  dispositivo: string;
  dispositivoManual: boolean;
  mirada: string;
  miradaExperto: string;
  enfoqueSel: string;
};

export type OpcionesSorteo = {
  numeros: NumerosSorteo;
  /** Profesiones disponibles (ya filtradas por el modo plotters, si aplica) */
  profesiones: readonly string[];
  generos: readonly string[];
  etnias: readonly string[];
  modosRostro: readonly string[];
  dispositivos: readonly string[];
  miradas: readonly string[];
  /** Con el modo plotters no hay enfoque */
  sinEnfoque?: boolean;
};

/**
 * Sustituye cada «🎲 Aleatorio» por un valor concreto. El orden importa: primero la profesión (define el enfoque),
 * después edad y etnia (dentro de lo que permite el enfoque) y por último la emoción (según el tono de la edad).
 */
export function resolverAleatorios<F extends Resoluble>(f: F, o: OpcionesSorteo): F {
  const n = o.numeros;
  const r: Resoluble = { ...f };
  if (r.profesion === ALEATORIO) {
    let pool: readonly string[] = o.profesiones;
    if (!o.sinEnfoque && r.enfoqueSel !== ENFOQUE_AUTO && r.enfoqueSel !== ENFOQUE_LIBRE) {
      const e = enfoqueEfectivo(r.enfoqueSel, "");
      const delEnfoque = e ? o.profesiones.filter((p) => profesionEnEnfoque(p, e)) : [];
      if (delEnfoque.length) pool = delEnfoque;
    }
    r.profesion = elegirCon(pool.length ? pool : o.profesiones, n.rprofesion);
  }
  const enf = o.sinEnfoque ? undefined : enfoqueEfectivo(r.enfoqueSel, r.profesion);
  if (r.genero === ALEATORIO) r.genero = elegirCon(o.generos, n.rgenero);
  if (r.edad === ALEATORIO) r.edad = elegirCon(edadesDeEnfoque(enf) ?? EDADES_PANEL, n.redad);
  if (r.etnia === ALEATORIO) r.etnia = elegirCon(enf ? ENFOQUES[enf].etnias : o.etnias, n.retnia);
  if (r.modoRostro === ALEATORIO) r.modoRostro = elegirCon(o.modosRostro, n.rrostro);
  if (r.emocionPanel === ALEATORIO) {
    const lista = enf === 4 ? EMOCIONES_POR_TONO.exito : EMOCIONES_POR_TONO[tonoDeEdad(r.edad) ?? "cliente"];
    r.emocionPanel = elegirCon(lista, n.remocion);
  }
  if (r.dispositivo === ALEATORIO) {
    r.dispositivo = elegirCon(o.dispositivos, n.rdispositivo);
    r.dispositivoManual = true; // elegido al azar: el enfoque ya no lo cambia
  }
  if (r.mirada === ALEATORIO) r.mirada = elegirCon(o.miradas, n.rmirada);
  if (r.miradaExperto === ALEATORIO) r.miradaExperto = elegirCon(o.miradas, n.rmirada);
  return { ...f, ...r } as F;
}
