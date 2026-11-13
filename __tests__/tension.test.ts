import { fishPull, isRed, isSafe, safeZone, stepTension } from '../src/game/tension';
import { levelAt } from '../src/game/levels';

const zone = { lo: 30, hi: 78 };

function step(tension: number, held: boolean, distance = 50) {
  return stepTension({
    tension,
    distance,
    redMs: 0,
    lineWear: 0,
    held,
    pull: 1,
    zone,
    dtMs: 16,
  });
}

describe('line tension', () => {
  it('rises while held and falls while released', () => {
    expect(step(40, true).tension).toBeGreaterThan(40);
    expect(step(40, false).tension).toBeLessThan(40);
  });

  it('is clamped to 0..100', () => {
    expect(step(0, false).tension).toBe(0);
    expect(step(100, true).tension).toBe(100);
  });

  it('gains line only while held inside the safe band', () => {
    expect(step(50, true).distance).toBeLessThan(50);
    expect(step(50, false).distance).toBe(50);
    expect(step(10, true).distance).toBe(50);
    expect(step(90, true).distance).toBe(50);
  });

  it('accumulates red time and wear above the safe band', () => {
    const red = step(90, true);
    expect(red.redMs).toBe(16);
    expect(red.lineWear).toBeGreaterThan(0);
    expect(step(50, true).redMs).toBe(0);
  });

  it('classifies the needle', () => {
    expect(isSafe(50, zone)).toBe(true);
    expect(isSafe(20, zone)).toBe(false);
    expect(isRed(90, zone)).toBe(true);
    expect(isRed(50, zone)).toBe(false);
  });

  it('the fish surges on a sine so a constant hold is never right', () => {
    const a = fishPull(1, 2, 0);
    const b = fishPull(1, 2, 500);
    expect(a).not.toBeCloseTo(b, 3);
    expect(a).toBeGreaterThan(0);
  });

  it('the safe zone comes from the level', () => {
    const z = safeZone(levelAt(0), 0);
    expect(z.lo).toBe(levelAt(0).safeLo);
    expect(z.hi).toBe(levelAt(0).safeHi);
  });
});
