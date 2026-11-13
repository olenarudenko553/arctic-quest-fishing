/**
 * mulberry32 in two flavours:
 *  - nextRand()  : pure, carries its state explicitly (used inside the engine so a
 *                  round stays deterministic and reproducible from its seed)
 *  - mulberry32(): closure flavour for one-shot layout generation
 * Layout and content NEVER come from the global Math.random (rule 6.1 / 6.2).
 */

export function seedFor(levelIndex: number, attempt: number): number {
  return ((levelIndex * 7919) ^ (attempt * 104729)) >>> 0;
}

/** Pure step: returns [value in [0,1), next state]. */
export function nextRand(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a];
}

export function nextRange(state: number, lo: number, hi: number): [number, number] {
  const [v, s] = nextRand(state);
  return [lo + v * (hi - lo), s];
}

export function nextInt(state: number, loInclusive: number, hiExclusive: number): [number, number] {
  const [v, s] = nextRand(state);
  return [loInclusive + Math.floor(v * (hiExclusive - loInclusive)), s];
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    const [v, s] = nextRand(state);
    state = s;
    return v;
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function pickWeighted(rng: Rng, weights: number[]): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) {
    total += Math.max(0, weights[i]);
  }
  if (total <= 0) {
    return 0;
  }
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i]);
    if (roll <= 0) {
      return i;
    }
  }
  return weights.length - 1;
}
