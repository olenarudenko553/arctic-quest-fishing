/** 9 expeditions across 3 zones. Difficulty scales quota, depth, sweep speed and margin. */

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

interface Row {
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

const ROWS: Row[] = [
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

export const LEVELS: Level[] = ROWS.map((r, i) => ({
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
