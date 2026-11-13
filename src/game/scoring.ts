import { COMBO_MAX } from '../constants/config';
import { Level } from './levels';
import { clamp } from './rng';
import { Species } from './species';
import { weightFactorOf } from './sonar';

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
