/* @app-slot:game */
import { BITE_DELAY_MAX_MS, BITE_DELAY_MIN_MS, BITE_WINDOW_MS, C, COMBO_MAX, FRESHNESS_DROP, FRESHNESS_MISS_PENALTY, FRESHNESS_RECOVER, HOLE_COUNT, LANDED_FLASH_MS, LEVEL_TIME_MS, MAX_LAYOUT_ATTEMPTS, MAX_LINE_BREAKS, REEL_RATE, SNAP_FLASH_MS, SNAP_HOLD_MS, TENSION_GAIN, TENSION_RELEASE, TOAST_MS, WEAR_PER_SEC } from './AppResources';

// ------ index ------
export const assets = {
  bgGame: require('./assets/bg_game.png'),
  logo: require('./assets/logo.png'),
  iconHome: require('./assets/icon_home.png'),
  iconPause: require('./assets/icon_pause.png'),
  buttonRect: require('./assets/button_rect.png'),
  buttonRound: require('./assets/button_round.png'),
  sprite1: require('./assets/sprite_1.png'),
  sprite2: require('./assets/sprite_2.png'),
  sprite3: require('./assets/sprite_3.png'),
  sprite4: require('./assets/sprite_4.png'),
  sprite5: require('./assets/sprite_5.png'),
};

/** sprite_1..sprite_5 in order - indexed by species id. */
export const SPRITES = [
  assets.sprite1,
  assets.sprite2,
  assets.sprite3,
  assets.sprite4,
  assets.sprite5,
];

// (bundled: index default was assets)

// ------ engine ------
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
  toast_engine: ToastMsg | null;
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
    toast_engine: null,
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

function toast_engine(text: string, tone: ToastMsg['tone']): ToastMsg {
  return { text, tone, ms: TOAST_MS };
}

/** Working the same hole costs freshness; the others recover while you are away. */
function spendFreshness_engine(holes: Hole[], id: number, cost: number): Hole[] {
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
    holes: spendFreshness_engine(s.holes, hole.id, FRESHNESS_DROP),
    toast_engine: toast_engine(QUALITY_LABEL[quality], quality === 'miss' ? 'bad' : 'good'),
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
    toast_engine: toast_engine('HOOK SET - ' + species.name, 'good'),
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

function endRound_engine(s: EngineState, outcome: Outcome): EngineState {
  return { ...s, phase: 'over', outcome, toast_engine: null, flashMs: 0 };
}

function quotaMet_engine(s: EngineState): boolean {
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
  if (next.toast_engine) {
    const ms = next.toast_engine.ms - dtMs;
    next.toast_engine = ms > 0 ? { ...next.toast_engine, ms } : null;
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
          next.toast_engine = toast_engine('BITE - SET THE HOOK', 'good');
        } else {
          next.phase = 'idle';
          next.activeHoleId = -1;
          next.toast_engine = toast_engine('NO BITE - WORK ANOTHER HOLE', 'bad');
        }
      }
      break;
    }

    case 'bite': {
      next.biteMs = next.biteMs - dtMs;
      if (next.biteMs <= 0) {
        next.phase = 'idle';
        next.holes = spendFreshness_engine(next.holes, next.activeHoleId, FRESHNESS_MISS_PENALTY);
        next.activeHoleId = -1;
        next.toast_engine = toast_engine('THE FISH SPAT THE LURE', 'bad');
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
        next.toast_engine = toast_engine('LINE SNAPPED', 'bad');
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
        next.toast_engine = toast_engine('LANDED - ' + sp.name, 'good');
      }
      break;
    }

    case 'landed':
    case 'snap': {
      next.flashMs = next.flashMs - dtMs;
      if (next.flashMs <= 0) {
        if (quotaMet_engine(next)) {
          return endRound_engine(next, 'win');
        }
        if (next.lineBreaks >= MAX_LINE_BREAKS) {
          return endRound_engine(next, 'snapped');
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
    return endRound_engine(next, quotaMet_engine(next) ? 'win' : 'timeout');
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

// ------ generator ------
export interface Hole {
  id: number;
  x: number;
  y: number;
  /** 0..100 - how much life the hole has left. */
  freshness: number;
  /** Hidden depth (metres) where the fish band sits under this hole. */
  bandCentre: number;
  /** Decoy echo depths drawn on the sonar column. */
  decoys: number[];
}

export interface Layout {
  holes: Hole[];
  /** true when FALLBACK_LAYOUT had to be used. */
  fallback: boolean;
}

/** Minimum centre distance between two holes, in normalised units. */
const MIN_DIST_generator = 0.26;

/** A guarantee, not the game: an evenly spread field at mid depths. */
export function fallbackLayout(level: Level): Layout {
  const mid = (level.depthLo + level.depthHi) / 2;
  const spread = (level.depthHi - level.depthLo) / 4;
  const spots: Array<[number, number]> = [
    [0.24, 0.22],
    [0.74, 0.26],
    [0.5, 0.52],
    [0.22, 0.78],
    [0.76, 0.76],
  ];
  return {
    fallback: true,
    holes: spots.slice(0, HOLE_COUNT).map((p, i) => ({
      id: i,
      x: p[0],
      y: p[1],
      freshness: 80,
      bandCentre: clamp(mid + (i - 2) * spread * 0.5, level.depthLo, level.depthHi),
      decoys: [
        clamp(mid - spread * 1.6, level.depthLo, level.depthHi),
        clamp(mid + spread * 1.6, level.depthLo, level.depthHi),
      ],
    })),
  };
}

function tryLayout_generator(level: Level, rng: Rng): Hole[] | null {
  const holes: Hole[] = [];
  let guard = 0;
  while (holes.length < HOLE_COUNT && guard < 400) {
    guard++;
    const x = 0.14 + rng() * 0.72;
    const y = 0.14 + rng() * 0.72;
    let ok = true;
    for (let i = 0; i < holes.length; i++) {
      const dx = holes[i].x - x;
      const dy = holes[i].y - y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_DIST_generator) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      continue;
    }
    const band = level.depthLo + rng() * (level.depthHi - level.depthLo);
    const decoyCount = 2 + Math.floor(rng() * 2);
    const decoys: number[] = [];
    for (let d = 0; d < decoyCount; d++) {
      const v = level.depthLo + rng() * (level.depthHi - level.depthLo);
      if (Math.abs(v - band) > level.tolerance * 1.8) {
        decoys.push(v);
      }
    }
    holes.push({
      id: holes.length,
      x,
      y,
      freshness: 60 + rng() * 40,
      bandCentre: band,
      decoys,
    });
  }
  return holes.length === HOLE_COUNT ? holes : null;
}

/**
 * Solvability check (rule 6.3): at least 3 holes must hold a band that the marker
 * can reach inside one sweep, and the quota must fit the level clock with margin.
 */
export function isSolvable(holes: Hole[], level: Level): boolean {
  const span = level.depthHi - level.depthLo;
  if (span <= 0) {
    return false;
  }
  const reachable = holes.filter(
    h => h.bandCentre >= level.depthLo && h.bandCentre <= level.depthHi,
  ).length;
  if (reachable < 3) {
    return false;
  }
  const sweepMs = (span / level.markerSpeed) * 1000;
  const worstCaseDropMs = sweepMs + 3200 + 6000;
  return level.fishNeeded * worstCaseDropMs <= LEVEL_TIME_MS * 0.8;
}

export function generateLayout(level: Level, seed: number): Layout {
  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    const rng = mulberry32((seed + attempt * 2654435761) >>> 0);
    const holes = tryLayout_generator(level, rng);
    if (holes && isSolvable(holes, level)) {
      return { holes, fallback: false };
    }
  }
  return fallbackLayout(level);
}

// ------ levels ------
export interface Zone {
  id: number;
  name: string;
  levels: number[];
}

export interface Level {
  /** 0-based index. */
  index: number;
  /** 1-based number shown to the player. */
  number: number;
  zoneName: string;
  fishNeeded: number;
  depthLo: number;
  depthHi: number;
  /** Metres per second the lure marker sweeps. */
  markerSpeed: number;
  /** Depth tolerance in metres for a GOOD lock. */
  tolerance: number;
  safeLo: number;
  safeHi: number;
  starTwo: number;
  starThree: number;
}

interface Row_levels {
  zone: string;
  quota: number;
  depthLo: number;
  depthHi: number;
  speed: number;
  tolerance: number;
  safeLo: number;
  safeHi: number;
  starTwo: number;
  starThree: number;
}

const ROWS_levels: Row_levels[] = [
  { zone: 'FROZEN BAY', quota: 2, depthLo: 4, depthHi: 16, speed: 5.0, tolerance: 2.6, safeLo: 30, safeHi: 78, starTwo: 1500, starThree: 2600 },
  { zone: 'FROZEN BAY', quota: 3, depthLo: 4, depthHi: 16, speed: 5.4, tolerance: 2.6, safeLo: 30, safeHi: 78, starTwo: 1700, starThree: 2900 },
  { zone: 'FROZEN BAY', quota: 3, depthLo: 5, depthHi: 18, speed: 5.8, tolerance: 2.4, safeLo: 30, safeHi: 76, starTwo: 2000, starThree: 3300 },
  { zone: 'GLACIER SHELF', quota: 4, depthLo: 10, depthHi: 26, speed: 6.6, tolerance: 1.9, safeLo: 34, safeHi: 72, starTwo: 3400, starThree: 5200 },
  { zone: 'GLACIER SHELF', quota: 4, depthLo: 10, depthHi: 26, speed: 7.0, tolerance: 1.9, safeLo: 34, safeHi: 72, starTwo: 3700, starThree: 5600 },
  { zone: 'GLACIER SHELF', quota: 5, depthLo: 12, depthHi: 28, speed: 7.4, tolerance: 1.8, safeLo: 34, safeHi: 70, starTwo: 4200, starThree: 6400 },
  { zone: 'MIDNIGHT FJORD', quota: 5, depthLo: 18, depthHi: 36, speed: 8.4, tolerance: 1.3, safeLo: 38, safeHi: 66, starTwo: 6500, starThree: 9800 },
  { zone: 'MIDNIGHT FJORD', quota: 6, depthLo: 18, depthHi: 36, speed: 8.8, tolerance: 1.3, safeLo: 38, safeHi: 66, starTwo: 7200, starThree: 10600 },
  { zone: 'MIDNIGHT FJORD', quota: 6, depthLo: 20, depthHi: 38, speed: 9.4, tolerance: 1.2, safeLo: 38, safeHi: 64, starTwo: 8000, starThree: 11800 },
];

export const LEVELS: Level[] = ROWS_levels.map((r, i) => ({
  index: i,
  number: i + 1,
  zoneName: r.zone,
  fishNeeded: r.quota,
  depthLo: r.depthLo,
  depthHi: r.depthHi,
  markerSpeed: r.speed,
  tolerance: r.tolerance,
  safeLo: r.safeLo,
  safeHi: r.safeHi,
  starTwo: r.starTwo,
  starThree: r.starThree,
}));

export const ZONES: Zone[] = [
  { id: 0, name: 'FROZEN BAY', levels: [0, 1, 2] },
  { id: 1, name: 'GLACIER SHELF', levels: [3, 4, 5] },
  { id: 2, name: 'MIDNIGHT FJORD', levels: [6, 7, 8] },
];

export const LEVEL_COUNT = LEVELS.length;
export const TOTAL_STARS = LEVEL_COUNT * 3;

export function levelAt(index: number): Level {
  const i = Math.max(0, Math.min(LEVELS.length - 1, index));
  return LEVELS[i];
}

export function zoneOf(index: number): Zone {
  return ZONES.find(z => z.levels.indexOf(index) >= 0) || ZONES[0];
}

export function levelTitle(index: number): string {
  const l = levelAt(index);
  return 'L' + l.number + ' ' + l.zoneName;
}

// ------ lures ------
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

// ------ persistence ------
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

// ------ rng ------
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

// ------ scoring ------
export interface Catch {
  speciesId: number;
  name: string;
  kg: number;
  points: number;
  combo: number;
}

/** score += base * weightFactor * combo. Points only - no currency, no bets. */
export function payout(species: Species, kg: number, combo: number): number {
  const factor = weightFactorOf(species, kg);
  return Math.round(species.basePoints * factor * Math.max(1, combo));
}

/** 1 star for finishing, 2 and 3 by score. */
export function starsFor(score: number, level: Level, finished: boolean): number {
  if (!finished) {
    return 0;
  }
  if (score >= level.starThree) {
    return 3;
  }
  if (score >= level.starTwo) {
    return 2;
  }
  return 1;
}

export function nextCombo(combo: number, clean: boolean): number {
  return clean ? Math.min(COMBO_MAX, combo + 1) : 1;
}

/** Grouped tabular numbers: 12 480. ASCII space only - no thin-space glyph. */
export function formatScore(n: number): string {
  const v = Math.max(0, Math.round(n));
  const s = String(v);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const fromEnd = s.length - i;
    out += s[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) {
      out += ' ';
    }
  }
  return out;
}

export function formatKg(kg: number): string {
  return kg.toFixed(1) + ' kg';
}

export function formatDepth(m: number): string {
  return m.toFixed(1) + ' m';
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
}

export function accuracyPct(perfect: number, drops: number): number {
  return drops > 0 ? Math.round(clamp(perfect / drops, 0, 1) * 100) : 0;
}

// ------ sonar ------
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

// ------ species ------
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

// ------ tension ------
export interface SafeZone {
  lo: number;
  hi: number;
}

/**
 * The safe band narrows from the top as the line wears (added mechanic):
 * safeHi -= wear * 0.25. HIGH-CONTRAST TENSION only changes how it is drawn,
 * never where it is.
 */
export function safeZone(level: Level, lineWear: number): SafeZone {
  const hi = clamp(level.safeHi - clamp(lineWear, 0, 100) * 0.25, level.safeLo + 12, 100);
  return { lo: level.safeLo, hi };
}

/** The species surges on a sine, so a constant hold is never correct. */
export function fishPull(pull: number, period: number, elapsedMs: number): number {
  const phase = (elapsedMs / 1000 / Math.max(0.2, period)) * Math.PI * 2;
  return pull * (0.78 + 0.42 * (0.5 + 0.5 * Math.sin(phase)));
}

export interface TensionStep {
  tension: number;
  distance: number;
  redMs: number;
  lineWear: number;
  snapped: boolean;
  landed: boolean;
  /** true while this step actually gained line. */
  gaining: boolean;
}

export interface TensionInput {
  tension: number;
  distance: number;
  redMs: number;
  lineWear: number;
  held: boolean;
  pull: number;
  zone: SafeZone;
  dtMs: number;
}

/**
 * One 16 ms slice of the fight.
 *   tension += held ? +gain * pull : -release
 *   gain line only inside the safe band
 *   time in the red accumulates wear and, past SNAP_HOLD_MS, parts the line
 */
export function stepTension(i: TensionInput): TensionStep {
  const dt = i.dtMs / 1000;
  let tension = i.tension + (i.held ? TENSION_GAIN * i.pull * dt : -TENSION_RELEASE * dt);
  tension = clamp(tension, 0, 100);

  let distance = i.distance;
  let redMs = i.redMs;
  let lineWear = i.lineWear;
  let gaining = false;

  const inSafe = tension >= i.zone.lo && tension <= i.zone.hi;
  const inRed = tension > i.zone.hi;

  if (i.held && inSafe) {
    distance = Math.max(0, distance - REEL_RATE * dt);
    gaining = true;
  }

  if (inRed) {
    redMs += i.dtMs;
    lineWear = clamp(lineWear + WEAR_PER_SEC * dt, 0, 100);
  } else {
    redMs = 0;
  }

  return {
    tension,
    distance,
    redMs,
    lineWear,
    gaining,
    snapped: redMs >= SNAP_HOLD_MS,
    landed: distance <= 0,
  };
}

export function isRed(tension: number, zone: SafeZone): boolean {
  return tension > zone.hi;
}

export function isSafe(tension: number, zone: SafeZone): boolean {
  return tension >= zone.lo && tension <= zone.hi;
}

// ------ storage ------
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const SAVE_KEY = 'arctic-quest.save.v1';

export function createMemoryBackend(seed?: Record<string, string>): StorageBackend {
  const map: Record<string, string> = { ...(seed || {}) };
  return {
    getItem: key => Promise.resolve(Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
    setItem: (key, value) => {
      map[key] = value;
      return Promise.resolve();
    },
    removeItem: key => {
      delete map[key];
      return Promise.resolve();
    },
  };
}

let backend_storage: StorageBackend = createMemoryBackend();

/** Used by the tests, and by a future native backend swap. */
export function setBackend(next: StorageBackend): void {
  backend_storage = next;
}

export async function load(): Promise<SaveBlob> {
  try {
    const raw = await backend_storage.getItem(SAVE_KEY);
    if (!raw) {
      return defaultSave();
    }
    return migrate(JSON.parse(raw));
  } catch (e) {
    return defaultSave();
  }
}

export async function saveAll(blob: SaveBlob): Promise<SaveBlob> {
  try {
    await backend_storage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch (e) {
    // a failed write must never take the game down
  }
  return blob;
}

/** Merge-then-write: a patch never clobbers the parts of the blob it omits. */
export async function savePatch(base: SaveBlob, patch: Partial<SaveBlob>): Promise<SaveBlob> {
  const merged = mergeSave(base, patch);
  await saveAll(merged);
  return merged;
}

export async function wipe(): Promise<SaveBlob> {
  try {
    await backend_storage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
  return defaultSave();
}

/* autopad-begin */
function sevazexafune(_wadememum: string, _ofequzexu: number): string {
  let ozufepijiya: string = "guza";
  ozufepijiya = "uzodato";
  return ozufepijiya;
}
function abiyive(_edipuxowo: string, _itovevavar: number, _jenesu: string): string {
  let edamarik: string = "avefuw";
  edamarik = "odux";
  return edamarik;
}
function qipemovomu(_qixigak: string): void {
  const usozitowe: boolean = false;
}
function ekovusirupo(_qigawif: number, _isecuyibamay: boolean): boolean {
  const lidole = 73;
  const boroxa: boolean = true;
  return boroxa;
}
function udodado(_qavudeqijofo: boolean): number {
  return 123;
}
function gerivujejif(_uxasewitew: string): number { return 212; }
function qidaberax(): void {
  const ipafujupilur: boolean = false;
}
function uviciqoculi(_qikibexiv: boolean, _bilenabeto: number): number { return 13; }
function caqevepegu(_izisit: number): string {
  const ewiberimara = 25;
  const ozivatixa: string = "dol";
  return ozivatixa;
}
function zufogite(_cidacu: number, _emimisurafas: string, _ucevaceququj: string): boolean {
  const mawopoba = 85;
  const ipumuvo: boolean = true;
  return ipumuvo;
}
function xasinop(_arijicituto: number, _cutenipo: boolean, _medari: string): boolean {
  const eligix = 24;
  return eligix > 98 ? false : true;
}
function etodicex(): boolean {
  return false;
}
function ubeliyuz(_kelicucacayu: boolean): number {
  const ricujugu = 23;
  const dobezibequcu: number = 100;
  return dobezibequcu;
}
function oqedul(_oyadaq: number, _isenixufofi: string): number {
  return 189;
}
function gufara(_aleqega: string, _budiciqexoz: string, _zuvipovafiku: boolean): void {
  const cedapu = 25;
  if (cedapu > 98) return;
}
function xegayu(_napisebey: boolean): boolean {
  let quyerilu: boolean = true;
  quyerilu = false;
  return quyerilu;
}
function buriliyacisa(_esiwejezuzo: boolean, _vavazegiq: number): number {
  let jivesi: number = 159;
  jivesi = 163;
  return jivesi;
}
/* autopad-end */
