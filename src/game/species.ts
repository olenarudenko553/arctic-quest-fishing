import { C } from '../constants/theme';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Species {
  /** 0-based, maps 1:1 onto sprite_1..sprite_5 (rule 13.2 - every sprite used). */
  id: number;
  name: string;
  rarity: Rarity;
  /** Depth band in metres where the species holds. */
  bandLo: number;
  bandHi: number;
  basePoints: number;
  color: string;
  /** How hard it surges during the fight. */
  pull: number;
  /** Period of the pull sine, in seconds. */
  pullPeriod: number;
  unlockHint: string;
}

export const SPECIES: Species[] = [
  {
    id: 0,
    name: 'POLAR COD',
    rarity: 'common',
    bandLo: 4,
    bandHi: 10,
    basePoints: 120,
    color: C.line,
    pull: 0.72,
    pullPeriod: 2.6,
    unlockHint: 'HOLDS ABOVE 10 M',
  },
  {
    id: 1,
    name: 'ARCTIC CHAR',
    rarity: 'uncommon',
    bandLo: 8,
    bandHi: 16,
    basePoints: 260,
    color: C.primary,
    pull: 0.9,
    pullPeriod: 2.2,
    unlockHint: 'HOLDS BELOW 8 M',
  },
  {
    id: 2,
    name: 'ICE TROUT',
    rarity: 'rare',
    bandLo: 14,
    bandHi: 24,
    basePoints: 480,
    color: C.secondary,
    pull: 1.05,
    pullPeriod: 1.9,
    unlockHint: 'HOLDS BELOW 14 M',
  },
  {
    id: 3,
    name: 'KING CRAB',
    rarity: 'epic',
    bandLo: 20,
    bandHi: 30,
    basePoints: 760,
    color: C.warn,
    pull: 1.22,
    pullPeriod: 3.1,
    unlockHint: 'HOLDS BELOW 20 M',
  },
  {
    id: 4,
    name: 'AURORA PIKE',
    rarity: 'legendary',
    bandLo: 26,
    bandHi: 36,
    basePoints: 1400,
    color: C.accentAurora,
    pull: 1.4,
    pullPeriod: 1.6,
    unlockHint: 'HOLDS BELOW 26 M',
  },
];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

export function speciesById(id: number): Species {
  return SPECIES[id] || SPECIES[0];
}

/** Which species hold at this depth; nearest band if none overlaps. */
export function candidatesAtDepth(depth: number): Species[] {
  const inBand = SPECIES.filter(s => depth >= s.bandLo && depth <= s.bandHi);
  if (inBand.length > 0) {
    return inBand;
  }
  let best = SPECIES[0];
  let bestDist = Infinity;
  for (let i = 0; i < SPECIES.length; i++) {
    const s = SPECIES[i];
    const centre = (s.bandLo + s.bandHi) / 2;
    const d = Math.abs(centre - depth);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return [best];
}
