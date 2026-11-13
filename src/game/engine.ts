import {
  BITE_DELAY_MAX_MS,
  BITE_DELAY_MIN_MS,
  BITE_WINDOW_MS,
  FRESHNESS_DROP,
  FRESHNESS_MISS_PENALTY,
  FRESHNESS_RECOVER,
  LANDED_FLASH_MS,
  LEVEL_TIME_MS,
  MAX_LINE_BREAKS,
  SNAP_FLASH_MS,
  TOAST_MS,
} from '../constants/config';
import { generateLayout, Hole } from './generator';
import { Level, levelAt } from './levels';
import { Lure, lureById } from './lures';
import { clamp, nextRand, nextRange, seedFor } from './rng';
import { Catch, nextCombo, payout, starsFor } from './scoring';
import {
  biteChance,
  effectiveSpeed,
  effectiveTolerance,
  LockQuality,
  qualityFor,
  QUALITY_LABEL,
  rollSpeciesPure,
  rollWeight,
} from './sonar';
import { fishPull, safeZone, SafeZone, stepTension } from './tension';
import { speciesById } from './species';

export type Phase =
  | 'idle'
  | 'sonar'
  | 'waiting'
  | 'bite'
  | 'fight'
  | 'landed'
  | 'snap'
  | 'over';

export type Outcome = 'win' | 'snapped' | 'timeout';

export interface ToastMsg {
  text: string;
  tone: 'good' | 'bad' | 'info';
  ms: number;
}

export interface EngineState {
  levelIndex: number;
  lureId: string;
  attempt: number;
  seed: number;
  rngState: number;
  usedFallback: boolean;

  phase: Phase;
  paused: boolean;

  holes: Hole[];
  activeHoleId: number;

  markerDepth: number;
  markerDir: 1 | -1;
  lockedDepth: number;
  quality: LockQuality | null;
  willBite: boolean;
  waitMs: number;
  biteMs: number;

  tension: number;
  redMs: number;
  lineWear: number;
  distance: number;
  distanceMax: number;
  fightMs: number;
  hookedSpecies: number;
  hookedKg: number;
  cleanFight: boolean;

  combo: number;
  bestCombo: number;
  score: number;
  caught: Catch[];
  lineBreaks: number;
  drops: number;
  perfectDrops: number;

  timeLeftMs: number;
  flashMs: number;
  toast: ToastMsg | null;
  outcome: Outcome | null;
}

export interface RoundSummary {
  levelIndex: number;
  outcome: Outcome;
  score: number;
  caught: Catch[];
  stars: number;
  lineBreaks: number;
  bestCombo: number;
  drops: number;
  perfectDrops: number;
  timeLeftMs: number;
}

export function createEngine(levelIndex: number, lureId: string, attempt: number): EngineState {
  const level = levelAt(levelIndex);
  const seed = seedFor(levelIndex, attempt);
  const layout = generateLayout(level, seed);
  return {
    levelIndex,
    lureId,
    attempt,
    seed,
    rngState: seed,
    usedFallback: layout.fallback,

    phase: 'idle',
    paused: false,

    holes: layout.holes,
    activeHoleId: -1,

    markerDepth: level.depthLo,
    markerDir: 1,
    lockedDepth: 0,
    quality: null,
    willBite: false,
    waitMs: 0,
    biteMs: 0,

    tension: 0,
    redMs: 0,
    lineWear: 0,
    distance: 0,
    distanceMax: 1,
    fightMs: 0,
    hookedSpecies: 0,
    hookedKg: 0,
    cleanFight: true,

    combo: 1,
    bestCombo: 1,
    score: 0,
    caught: [],
    lineBreaks: 0,
    drops: 0,
    perfectDrops: 0,

    timeLeftMs: LEVEL_TIME_MS,
    flashMs: 0,
    toast: null,
    outcome: null,
  };
}

export function levelOf(s: EngineState): Level {
  return levelAt(s.levelIndex);
}

export function lureOf(s: EngineState): Lure {
  return lureById(s.lureId);
}

export function zoneOfState(s: EngineState): SafeZone {
  return safeZone(levelOf(s), s.lineWear);
}

export function activeHole(s: EngineState): Hole | null {
  return s.holes.find(h => h.id === s.activeHoleId) || null;
}

function toast(text: string, tone: ToastMsg['tone']): ToastMsg {
  return { text, tone, ms: TOAST_MS };
}

/** Working the same hole costs freshness; the others recover while you are away. */
function spendFreshness(holes: Hole[], id: number, cost: number): Hole[] {
  return holes.map(h =>
    h.id === id
      ? { ...h, freshness: clamp(h.freshness - cost, 0, 100) }
      : { ...h, freshness: clamp(h.freshness + FRESHNESS_RECOVER, 0, 100) },
  );
}

/* ----------------------------------------------------------------- actions */

export function selectHole(s: EngineState, id: number): EngineState {
  if (s.phase !== 'idle' || s.paused) {
    return s;
  }
  const level = levelOf(s);
  return {
    ...s,
    activeHoleId: id,
    phase: 'sonar',
    markerDepth: level.depthLo,
    markerDir: 1,
    quality: null,
    lockedDepth: 0,
  };
}

/** Back to the ice field, forfeiting the current drop. */
export function backToField(s: EngineState): EngineState {
  if (s.phase === 'over' || s.phase === 'fight') {
    return s;
  }
  return {
    ...s,
    phase: 'idle',
    activeHoleId: -1,
    quality: null,
    waitMs: 0,
    biteMs: 0,
  };
}

/** The freshest hole on the plate - used by the forgiving DROP affordance. */
export function freshestHole(s: EngineState): Hole | null {
  let best: Hole | null = null;
  for (let i = 0; i < s.holes.length; i++) {
    if (!best || s.holes[i].freshness > best.freshness) {
      best = s.holes[i];
    }
  }
  return best;
}

export function drop(s: EngineState): EngineState {
  if (s.paused) {
    return s;
  }
  // On the ice field DROP means "work the best hole" - the button is never dead.
  if (s.phase === 'idle') {
    const best = freshestHole(s);
    return best ? selectHole(s, best.id) : s;
  }
  if (s.phase !== 'sonar') {
    return s;
  }
  const hole = activeHole(s);
  if (!hole) {
    return s;
  }
  const level = levelOf(s);
  const lure = lureOf(s);
  const tol = effectiveTolerance(level.tolerance, lure);
  const quality = qualityFor(s.markerDepth - hole.bandCentre, tol);

  let state = s.rngState;
  const [roll, s1] = nextRand(state);
  state = s1;
  const willBite = roll < biteChance(hole.freshness, quality);

  const [delay, s2] = nextRange(state, BITE_DELAY_MIN_MS, BITE_DELAY_MAX_MS);
  state = s2;

  return {
    ...s,
    rngState: state,
    phase: 'waiting',
    lockedDepth: s.markerDepth,
    quality,
    willBite,
    waitMs: delay,
    drops: s.drops + 1,
    perfectDrops: s.perfectDrops + (quality === 'perfect' ? 1 : 0),
    holes: spendFreshness(s.holes, hole.id, FRESHNESS_DROP),
    toast: toast(QUALITY_LABEL[quality], quality === 'miss' ? 'bad' : 'good'),
  };
}

export function hook(s: EngineState): EngineState {
  if (s.phase !== 'bite' || s.paused) {
    return s;
  }
  const level = levelOf(s);
  const lure = lureOf(s);
  let state = s.rngState;

  const [species, s1] = rollSpeciesPure(s.lockedDepth, s.quality || 'good', lure, state);
  state = s1;
  const [kg, s2] = rollWeight(species, state);
  state = s2;

  const distance = 58 + species.id * 12 + (level.index > 5 ? 10 : 0);

  return {
    ...s,
    rngState: state,
    phase: 'fight',
    hookedSpecies: species.id,
    hookedKg: kg,
    distance,
    distanceMax: distance,
    tension: 18,
    redMs: 0,
    fightMs: 0,
    cleanFight: true,
    toast: toast('HOOK SET - ' + species.name, 'good'),
  };
}

export function pause(s: EngineState): EngineState {
  return s.phase === 'over' ? s : { ...s, paused: true };
}

export function resume(s: EngineState): EngineState {
  return { ...s, paused: false };
}

export function restart(s: EngineState): EngineState {
  return createEngine(s.levelIndex, s.lureId, s.attempt + 1);
}

export function summarise(s: EngineState): RoundSummary {
  const level = levelOf(s);
  const outcome: Outcome = s.outcome || 'timeout';
  return {
    levelIndex: s.levelIndex,
    outcome,
    score: s.score,
    caught: s.caught,
    stars: starsFor(s.score, level, outcome === 'win'),
    lineBreaks: s.lineBreaks,
    bestCombo: s.bestCombo,
    drops: s.drops,
    perfectDrops: s.perfectDrops,
    timeLeftMs: s.timeLeftMs,
  };
}

/* -------------------------------------------------------------------- tick */

function endRound(s: EngineState, outcome: Outcome): EngineState {
  return { ...s, phase: 'over', outcome, toast: null, flashMs: 0 };
}

function quotaMet(s: EngineState): boolean {
  return s.caught.length >= levelOf(s).fishNeeded;
}

/** One engine slice. Pure: same input, same output. */
export function tick(s: EngineState, dtMs: number, held: boolean): EngineState {
  if (s.phase === 'over' || s.paused) {
    return s;
  }

  let next: EngineState = { ...s };

  // countdown + toast lifetime
  next.timeLeftMs = Math.max(0, next.timeLeftMs - dtMs);
  if (next.toast) {
    const ms = next.toast.ms - dtMs;
    next.toast = ms > 0 ? { ...next.toast, ms } : null;
  }

  const level = levelOf(next);
  const lure = lureOf(next);

  switch (next.phase) {
    case 'sonar': {
      const speed = effectiveSpeed(level.markerSpeed, lure);
      let d = next.markerDepth + next.markerDir * speed * (dtMs / 1000);
      let dir = next.markerDir;
      if (d >= level.depthHi) {
        d = level.depthHi;
        dir = -1;
      } else if (d <= level.depthLo) {
        d = level.depthLo;
        dir = 1;
      }
      next.markerDepth = d;
      next.markerDir = dir;
      break;
    }

    case 'waiting': {
      next.waitMs = next.waitMs - dtMs;
      if (next.waitMs <= 0) {
        if (next.willBite) {
          next.phase = 'bite';
          next.biteMs = BITE_WINDOW_MS;
          next.toast = toast('BITE - SET THE HOOK', 'good');
        } else {
          next.phase = 'idle';
          next.activeHoleId = -1;
          next.toast = toast('NO BITE - WORK ANOTHER HOLE', 'bad');
        }
      }
      break;
    }

    case 'bite': {
      next.biteMs = next.biteMs - dtMs;
      if (next.biteMs <= 0) {
        next.phase = 'idle';
        next.holes = spendFreshness(next.holes, next.activeHoleId, FRESHNESS_MISS_PENALTY);
        next.activeHoleId = -1;
        next.toast = toast('THE FISH SPAT THE LURE', 'bad');
      }
      break;
    }

    case 'fight': {
      next.fightMs = next.fightMs + dtMs;
      const sp = speciesById(next.hookedSpecies);
      const zone = safeZone(level, next.lineWear);
      const step = stepTension({
        tension: next.tension,
        distance: next.distance,
        redMs: next.redMs,
        lineWear: next.lineWear,
        held,
        pull: fishPull(sp.pull, sp.pullPeriod, next.fightMs),
        zone,
        dtMs,
      });
      next.tension = step.tension;
      next.distance = step.distance;
      next.redMs = step.redMs;
      next.lineWear = step.lineWear;
      if (step.redMs > 0) {
        next.cleanFight = false;
      }

      if (step.snapped) {
        next.phase = 'snap';
        next.flashMs = SNAP_FLASH_MS;
        next.lineBreaks = next.lineBreaks + 1;
        next.combo = 1;
        next.tension = 0;
        next.redMs = 0;
        next.toast = toast('LINE SNAPPED', 'bad');
      } else if (step.landed) {
        const combo = nextCombo(next.combo, next.cleanFight);
        const points = payout(sp, next.hookedKg, combo);
        next.phase = 'landed';
        next.flashMs = LANDED_FLASH_MS;
        next.combo = combo;
        next.bestCombo = Math.max(next.bestCombo, combo);
        next.score = next.score + points;
        next.caught = next.caught.concat([
          { speciesId: sp.id, name: sp.name, kg: next.hookedKg, points, combo },
        ]);
        next.toast = toast('LANDED - ' + sp.name, 'good');
      }
      break;
    }

    case 'landed':
    case 'snap': {
      next.flashMs = next.flashMs - dtMs;
      if (next.flashMs <= 0) {
        if (quotaMet(next)) {
          return endRound(next, 'win');
        }
        if (next.lineBreaks >= MAX_LINE_BREAKS) {
          return endRound(next, 'snapped');
        }
        next.phase = 'idle';
        next.activeHoleId = -1;
        next.flashMs = 0;
      }
      break;
    }

    default:
      break;
  }

  if (next.timeLeftMs <= 0 && next.phase !== 'over') {
    return endRound(next, quotaMet(next) ? 'win' : 'timeout');
  }

  return next;
}

/** Label of the big action button for the current phase. */
export function ctaLabel(s: EngineState): string {
  switch (s.phase) {
    case 'idle':
      return 'DROP';
    case 'sonar':
      return 'DROP';
    case 'waiting':
      return 'WAITING';
    case 'bite':
      return 'HOOK';
    case 'fight':
      return 'REEL';
    case 'landed':
    case 'snap':
      return 'CAST';
    default:
      return 'DROP';
  }
}

export function ctaEnabled(s: EngineState): boolean {
  if (s.paused || s.phase === 'over') {
    return false;
  }
  return (
    s.phase === 'idle' || s.phase === 'sonar' || s.phase === 'bite' || s.phase === 'fight'
  );
}
