import { HOLE_COUNT, MAX_LAYOUT_ATTEMPTS, LEVEL_TIME_MS } from '../constants/config';
import { Level } from './levels';
import { clamp, mulberry32, Rng } from './rng';

/**
 * One drilled hole. x / y are NORMALISED (0..1) inside the ice plate, so the
 * component can scale them to whatever width it measured.
 */
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
const MIN_DIST = 0.26;

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

function tryLayout(level: Level, rng: Rng): Hole[] | null {
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
      if (Math.sqrt(dx * dx + dy * dy) < MIN_DIST) {
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
    const holes = tryLayout(level, rng);
    if (holes && isSolvable(holes, level)) {
      return { holes, fallback: false };
    }
  }
  return fallbackLayout(level);
}
