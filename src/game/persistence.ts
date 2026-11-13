import { LEVEL_COUNT } from './levels';
import { LureId } from './lures';
import { SPECIES } from './species';

export const SAVE_VERSION = 1;

export interface SpeciesRecord {
  caught: number;
  recordKg: number;
}

export interface Settings {
  sonarAssist: boolean;
  leftHanded: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface SaveBlob {
  version: number;
  stars: number[];
  lure: LureId;
  bestScore: number;
  fishLanded: number;
  linesSnapped: number;
  bestCombo: number;
  species: SpeciesRecord[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  sonarAssist: true,
  leftHanded: false,
  reducedMotion: false,
  highContrast: false,
};

export function defaultSave(): SaveBlob {
  return {
    version: SAVE_VERSION,
    stars: new Array(LEVEL_COUNT).fill(0),
    lure: 'JIG',
    bestScore: 0,
    fishLanded: 0,
    linesSnapped: 0,
    bestCombo: 0,
    species: SPECIES.map(() => ({ caught: 0, recordKg: 0 })),
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Shallow merge with a nested merge for settings - never replaces the whole blob. */
export function mergeSave(base: SaveBlob, patch: Partial<SaveBlob>): SaveBlob {
  return {
    ...base,
    ...patch,
    stars: patch.stars ? patch.stars.slice() : base.stars.slice(),
    species: patch.species ? patch.species.slice() : base.species.slice(),
    settings: { ...base.settings, ...(patch.settings || {}) },
    version: SAVE_VERSION,
  };
}

/** Repairs anything written by an older or corrupted build. */
export function migrate(raw: unknown): SaveBlob {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const r = raw as Partial<SaveBlob>;
  const stars = base.stars.slice();
  if (Array.isArray(r.stars)) {
    for (let i = 0; i < stars.length; i++) {
      const v = Number(r.stars[i]);
      stars[i] = isFinite(v) ? Math.max(0, Math.min(3, Math.floor(v))) : 0;
    }
  }
  const species = base.species.slice();
  if (Array.isArray(r.species)) {
    for (let i = 0; i < species.length; i++) {
      const s = r.species[i] as SpeciesRecord | undefined;
      if (s && typeof s === 'object') {
        species[i] = {
          caught: Math.max(0, Math.floor(Number(s.caught) || 0)),
          recordKg: Math.max(0, Number(s.recordKg) || 0),
        };
      }
    }
  }
  return {
    version: SAVE_VERSION,
    stars,
    lure: r.lure === 'SPOON' || r.lure === 'GLOW' ? r.lure : 'JIG',
    bestScore: Math.max(0, Math.floor(Number(r.bestScore) || 0)),
    fishLanded: Math.max(0, Math.floor(Number(r.fishLanded) || 0)),
    linesSnapped: Math.max(0, Math.floor(Number(r.linesSnapped) || 0)),
    bestCombo: Math.max(0, Math.floor(Number(r.bestCombo) || 0)),
    species,
    settings: { ...base.settings, ...(r.settings || {}) },
  };
}

export function totalStars(save: SaveBlob): number {
  return save.stars.reduce((a, b) => a + b, 0);
}

export function speciesFound(save: SaveBlob): number {
  return save.species.filter(s => s.caught > 0).length;
}

/** Level n+1 unlocks once level n has at least one star. Level 1 is always open. */
export function isLevelUnlocked(save: SaveBlob, index: number): boolean {
  if (index <= 0) {
    return true;
  }
  return (save.stars[index - 1] || 0) > 0;
}

export function highestUnlocked(save: SaveBlob): number {
  let best = 0;
  for (let i = 0; i < LEVEL_COUNT; i++) {
    if (isLevelUnlocked(save, i)) {
      best = i;
    }
  }
  return best;
}

/** Zone progress used by the ProgressScreen bars. */
export function clearedInZone(save: SaveBlob, levels: number[]): number {
  return levels.filter(i => (save.stars[i] || 0) > 0).length;
}
