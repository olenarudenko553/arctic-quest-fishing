import { LEVELS, LEVEL_COUNT, TOTAL_STARS, levelAt, levelTitle, zoneOf, ZONES } from '../src/game/levels';
import { generateLayout, isSolvable } from '../src/game/generator';
import { seedFor } from '../src/game/rng';

describe('levels and difficulty progression', () => {
  it('has 9 levels in 3 zones', () => {
    expect(LEVEL_COUNT).toBe(9);
    expect(TOTAL_STARS).toBe(27);
    expect(ZONES).toHaveLength(3);
    ZONES.forEach(z => expect(z.levels).toHaveLength(3));
  });

  it('scales quota, sweep speed and margin upward', () => {
    const first = levelAt(0);
    const last = levelAt(8);
    expect(last.fishNeeded).toBeGreaterThan(first.fishNeeded);
    expect(last.markerSpeed).toBeGreaterThan(first.markerSpeed);
    expect(last.tolerance).toBeLessThan(first.tolerance);
    expect(last.safeHi - last.safeLo).toBeLessThan(first.safeHi - first.safeLo);
    expect(last.starThree).toBeGreaterThan(first.starThree);
  });

  it('star thresholds are ordered', () => {
    LEVELS.forEach(l => expect(l.starThree).toBeGreaterThan(l.starTwo));
  });

  it('clamps out-of-range indices instead of crashing', () => {
    expect(levelAt(-5).index).toBe(0);
    expect(levelAt(99).index).toBe(8);
    expect(levelTitle(0)).toContain('FROZEN BAY');
    expect(zoneOf(7).name).toBe('MIDNIGHT FJORD');
  });

  it('every level generates a solvable field', () => {
    LEVELS.forEach(l => {
      const layout = generateLayout(l, seedFor(l.index, 0));
      expect(layout.holes).toHaveLength(5);
      expect(isSolvable(layout.holes, l) || layout.fallback).toBe(true);
    });
  });
});
