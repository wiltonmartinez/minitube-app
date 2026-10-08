// Lógica pura del azar y los candados 🔒 (sin React), para poder probarla con Vitest.

export type Bloqueos = Record<string, boolean | undefined>;

/**
 * «Generar al Azar»: aplica las variables sorteadas `r` al formulario `f` respetando los candados.
 * - Una variable bloqueada nunca cambia.
 * - Badge y paleta: si el menú está en «Aleatorio» se conserva esa opción (se re-sortea aparte).
 */
export function aplicarAzar<F extends { badge: string; paleta: string }>(
  f: F,
  r: Partial<F>,
  locks: Bloqueos,
  aleatorioBadge: string,
  aleatorioPaleta: string,
): F {
  const libres: Partial<F> = {};
  for (const k of Object.keys(r) as (keyof F)[]) if (!locks[k as string]) libres[k] = r[k];
  return {
    ...f,
    ...libres,
    badge: locks.badge || f.badge === aleatorioBadge ? f.badge : (libres.badge ?? f.badge),
    paleta: locks.paleta || f.paleta === aleatorioPaleta ? f.paleta : (libres.paleta ?? f.paleta),
  };
}

/**
 * Nuevo sorteo de las opciones «🎲 Aleatorio»: cada valor nuevo reemplaza al anterior salvo que su candado esté activo.
 * `claves` indica qué candado protege a cada valor del sorteo.
 */
export function sorteoRespetandoBloqueos<S extends Record<string, unknown>>(
  anterior: S,
  nuevo: S,
  locks: Bloqueos,
  claves: Partial<Record<keyof S, string>>,
): S {
  const out = { ...nuevo };
  for (const k of Object.keys(nuevo) as (keyof S)[]) {
    const candado = claves[k];
    if (candado && locks[candado]) out[k] = anterior[k];
  }
  return out;
}

/**
 * «Todo al azar»: aplica un sorteo COMPLETO `r` al formulario `f`, salvo lo que tenga candado 🔒.
 * Solo se cambian las claves que trae `r`; el bloque 1 (marca, modelo, error) nunca va en `r`, así que no se toca.
 * `pers` (los campos del personaje) se decide campo por campo con los candados «pers.<campo>».
 */
export function aplicarTodoAlAzar<F extends { pers: Record<string, string> }>(f: F, r: Partial<F> & { pers: Record<string, string> }, locks: Bloqueos): F {
  const salida: Record<string, unknown> = { ...f };
  for (const k of Object.keys(r)) {
    if (k === "pers") continue;
    if (!locks[k]) salida[k] = (r as Record<string, unknown>)[k];
  }
  const pers: Record<string, string> = {};
  for (const c of Object.keys(f.pers)) pers[c] = locks[`pers.${c}`] ? f.pers[c] : (r.pers[c] ?? f.pers[c]);
  salida.pers = pers;
  return salida as F;
}
