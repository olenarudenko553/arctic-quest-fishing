import { safeZone, stepTension } from '../src/game/tension';
import { levelAt } from '../src/game/levels';
import { WEAR_PER_SEC } from '../src/constants/config';

describe('line wear across the level', () => {
  it('only time in the red wears the line', () => {
    const zone = { lo: 30, hi: 78 };
    const red = stepTension({
      tension: 90,
      distance: 40,
      redMs: 0,
      lineWear: 0,
      held: true,
      pull: 1,
      zone,
      dtMs: 1000,
    });
    const safe = stepTension({
      tension: 50,
      distance: 40,
      redMs: 0,
      lineWear: 0,
      held: true,
      pull: 0,
      zone,
      dtMs: 1000,
    });
    expect(red.lineWear).toBeCloseTo(WEAR_PER_SEC, 5);
    expect(safe.lineWear).toBe(0);
  });

  it('wear narrows the safe band from the top', () => {
    const l = levelAt(0);
    const fresh = safeZone(l, 0);
    const worn = safeZone(l, 40);
    expect(worn.hi).toBeLessThan(fresh.hi);
    expect(worn.hi).toBeCloseTo(l.safeHi - 40 * 0.25, 5);
    expect(worn.lo).toBe(fresh.lo);
  });

  it('never collapses the band to nothing', () => {
    const l = levelAt(8);
    const wrecked = safeZone(l, 100);
    expect(wrecked.hi - wrecked.lo).toBeGreaterThanOrEqual(12);
  });

  it('wear is capped at 100', () => {
    const zone = { lo: 30, hi: 78 };
    const capped = stepTension({
      tension: 95,
      distance: 10,
      redMs: 0,
      lineWear: 99,
      held: true,
      pull: 1,
      zone,
      dtMs: 5000,
    });
    expect(capped.lineWear).toBe(100);
  });
});
