import { NINGUNO, type EmocionAB, type PromptInput } from "@/lib/prompt-config";

// Variantes A/B para «Probar y comparar» de YouTube Studio: mismo problema técnico, mismo plano, mismo idioma y la misma
// persona; varían la emoción, la paleta de los textos 3D y el badge.

export const ORDEN_AB: EmocionAB[] = ["panico", "sorpresa", "alivio"];
export const LETRAS_AB = ["A", "B", "C"] as const;
export type LetraAB = (typeof LETRAS_AB)[number];

export type VarianteAB = {
  letra: LetraAB;
  emocion: EmocionAB;
  entrada: PromptInput;
};

/** Elige `n` valores distintos de `lista` que no estén en `usados` (si la lista es corta, repite lo mínimo). */
function elegirDistintos(lista: string[], usados: string[], n: number, rnd: () => number): string[] {
  const salida: string[] = [];
  const pool = [...lista];
  while (salida.length < n && pool.length) {
    const libres = pool.filter((x) => !usados.includes(x) && !salida.includes(x));
    const fuente = libres.length ? libres : pool;
    const v = fuente[Math.floor(rnd() * fuente.length)];
    salida.push(v);
    pool.splice(pool.indexOf(v), 1);
  }
  return salida;
}

/**
 * Crea las 3 variantes. La A conserva la paleta y el badge actuales; B y C usan otros distintos entre sí.
 * Si la paleta o el badge están bloqueados con el candado 🔒, se mantienen iguales en las tres.
 * El badge nunca es «Ninguno».
 */
export function crearVariantes(
  base: PromptInput,
  opts: { paletas: string[]; badges: string[]; bloquearPaleta?: boolean; bloquearBadge?: boolean; rnd?: () => number },
): VarianteAB[] {
  const rnd = opts.rnd ?? Math.random;
  const badges = opts.badges.filter((b) => b !== NINGUNO);
  const otrasPaletas = opts.bloquearPaleta ? [] : elegirDistintos(opts.paletas, [base.paleta], 2, rnd);
  const otrosBadges = opts.bloquearBadge ? [] : elegirDistintos(badges, [base.badge], 2, rnd);

  return ORDEN_AB.map((emocion, i) => ({
    letra: LETRAS_AB[i],
    emocion,
    entrada: {
      ...base,
      emocion,
      paleta: i === 0 || opts.bloquearPaleta ? base.paleta : (otrasPaletas[i - 1] ?? base.paleta),
      badge: i === 0 || opts.bloquearBadge ? base.badge : (otrosBadges[i - 1] ?? base.badge),
    },
  }));
}
