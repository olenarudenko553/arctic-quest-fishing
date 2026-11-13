import { createEngine, drop, selectHole } from '../src/game/engine';
import { levelAt } from '../src/game/levels';
import { biteChance, qualityFor, effectiveTolerance } from '../src/game/sonar';
import { lureById } from '../src/game/lures';

describe('sonar depth reading', () => {
  it('grades the lock by its distance from the band centre', () => {
    expect(qualityFor(0, 2)).toBe('perfect');
    expect(qualityFor(0.7, 2)).toBe('perfect');
    expect(qualityFor(1.5, 2)).toBe('good');
    expect(qualityFor(2.0, 2)).toBe('good');
    expect(qualityFor(2.4, 2)).toBe('miss');
    expect(qualityFor(-2.4, 2)).toBe('miss');
  });

  it('a cleaner read gives a better bite chance', () => {
    const perfect = biteChance(100, 'perfect');
    const good = biteChance(100, 'good');
    const miss = biteChance(100, 'miss');
    expect(perfect).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(miss);
    expect(perfect).toBeLessThanOrEqual(1);
  });

  it('DROP stores the locked depth and counts the drop', () => {
    const level = levelAt(0);
    let s = createEngine(0, 'JIG', 0);
    s = selectHole(s, s.holes[0].id);
    s = { ...s, markerDepth: s.holes[0].bandCentre };
    const after = drop(s);

    expect(after.phase).toBe('waiting');
    expect(after.lockedDepth).toBeCloseTo(s.holes[0].bandCentre, 5);
    expect(after.quality).toBe('perfect');
    expect(after.drops).toBe(1);
    expect(after.perfectDrops).toBe(1);
    expect(after.lockedDepth).toBeGreaterThanOrEqual(level.depthLo);
  });

  it('a far-off lock reads as a miss', () => {
    let s = createEngine(0, 'JIG', 0);
    s = selectHole(s, s.holes[0].id);
    const tol = effectiveTolerance(levelAt(0).tolerance, lureById('JIG'));
    s = { ...s, markerDepth: s.holes[0].bandCentre + tol * 3 };
    expect(drop(s).quality).toBe('miss');
  });

  it('DROP on the ice field works the freshest hole instead of doing nothing', () => {
    const s = createEngine(0, 'JIG', 0);
    const after = drop(s);
    expect(after.phase).toBe('sonar');
    expect(after.activeHoleId).toBeGreaterThanOrEqual(0);
  });
});
