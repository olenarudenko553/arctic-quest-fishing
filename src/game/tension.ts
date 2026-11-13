import {
  REEL_RATE,
  SNAP_HOLD_MS,
  TENSION_GAIN,
  TENSION_RELEASE,
  WEAR_PER_SEC,
} from '../constants/config';
import { Level } from './levels';
import { clamp } from './rng';

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
