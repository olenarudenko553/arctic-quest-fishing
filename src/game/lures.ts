/** The three lure loadouts (added mechanic). Each one really changes the sonar step. */

export type LureId = 'JIG' | 'SPOON' | 'GLOW';

export interface Lure {
  id: LureId;
  label: string;
  /** Multiplies the sweep speed of the lure marker - slower is easier to read. */
  speedMul: number;
  /** Multiplies the depth tolerance - wider is more forgiving. */
  toleranceMul: number;
  /** Pushes the species tier roll up (richer fish) when the lock was clean. */
  tierBias: number;
  /** Total stars needed to unlock it. */
  starsRequired: number;
  blurb: string;
}

export const LURES: Lure[] = [
  {
    id: 'JIG',
    label: 'JIG',
    speedMul: 0.85,
    toleranceMul: 1.15,
    tierBias: 0,
    starsRequired: 0,
    blurb: 'SLOW SWEEP, FORGIVING',
  },
  {
    id: 'SPOON',
    label: 'SPOON',
    speedMul: 1.0,
    toleranceMul: 0.95,
    tierBias: 1,
    starsRequired: 4,
    blurb: 'BALANCED, RICHER FISH',
  },
  {
    id: 'GLOW',
    label: 'GLOW',
    speedMul: 1.25,
    toleranceMul: 0.78,
    tierBias: 2,
    starsRequired: 9,
    blurb: 'FAST SWEEP, DEEP TROPHIES',
  },
];

export function lureById(id: string): Lure {
  return LURES.find(l => l.id === id) || LURES[0];
}

export function isLureUnlocked(id: string, stars: number): boolean {
  return stars >= lureById(id).starsRequired;
}
