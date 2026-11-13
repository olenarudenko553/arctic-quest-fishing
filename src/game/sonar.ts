import { Lure } from './lures';
import { clamp, nextRand, pickWeighted, Rng } from './rng';
import { candidatesAtDepth, Species, SPECIES } from './species';

export type LockQuality = 'perfect' | 'good' | 'miss';

/** How close the locked depth came to the hidden band centre. */
export function qualityFor(delta: number, tolerance: number): LockQuality {
  const d = Math.abs(delta);
  if (d <= tolerance * 0.4) {
    return 'perfect';
  }
  if (d <= tolerance) {
    return 'good';
  }
  return 'miss';
}

export const QUALITY_MUL: Record<LockQuality, number> = {
  perfect: 1.0,
  good: 0.75,
  miss: 0.25,
};

export const QUALITY_TIER: Record<LockQuality, number> = {
  perfect: 2,
  good: 1,
  miss: 0,
};

export const QUALITY_LABEL: Record<LockQuality, string> = {
  perfect: 'PERFECT READ',
  good: 'GOOD READ',
  miss: 'OFF THE BAND',
};

/** Base chance that a drop produces a bite at all. */
export const BASE_BITE_CHANCE = 0.82;

/**
 * Freshness scales the bite chance: a worked-out hole stops producing.
 * biteChance = base * (0.45 + 0.55 * freshness) * qualityMul
 */
export function biteChance(freshness: number, quality: LockQuality, base = BASE_BITE_CHANCE): number {
  const f = clamp(freshness, 0, 100) / 100;
  return clamp(base * (0.45 + 0.55 * f) * QUALITY_MUL[quality], 0, 1);
}

/** Effective tolerance after the lure modifier. */
export function effectiveTolerance(tolerance: number, lure: Lure): number {
  return tolerance * lure.toleranceMul;
}

/** Effective marker sweep speed after the lure modifier. */
export function effectiveSpeed(markerSpeed: number, lure: Lure): number {
  return markerSpeed * lure.speedMul;
}

/**
 * Species roll: the candidates that hold at the locked depth, weighted by how
 * clean the read was and by the lure's tier bias. A sloppy read gets the common
 * fish; a perfect read with a GLOW lure reaches the trophies.
 */
export function rollSpecies(depth: number, quality: LockQuality, lure: Lure, rng: Rng): Species {
  const pool = candidatesAtDepth(depth);
  const tier = QUALITY_TIER[quality] + lure.tierBias;
  const weights = pool.map(s => {
    const rank = SPECIES.indexOf(s);
    return Math.max(0.05, 1 + rank * tier * 0.55);
  });
  return pool[pickWeighted(rng, weights)];
}

/** Pure variant for the engine, which carries its PRNG state explicitly. */
export function rollSpeciesPure(
  depth: number,
  quality: LockQuality,
  lure: Lure,
  state: number,
): [Species, number] {
  let s = state;
  const species = rollSpecies(depth, quality, lure, () => {
    const [v, ns] = nextRand(s);
    s = ns;
    return v;
  });
  return [species, s];
}

/** Weight of an individual fish: 0.8 .. 1.7 of the species norm. */
export function rollWeight(species: Species, state: number): [number, number] {
  const [v, s] = nextRand(state);
  const factor = 0.8 + v * 0.9;
  const kg = (2.2 + species.id * 1.6) * factor;
  return [Math.round(kg * 10) / 10, s];
}

export function weightFactorOf(species: Species, kg: number): number {
  const norm = 2.2 + species.id * 1.6;
  return norm > 0 ? kg / norm : 1;
}
