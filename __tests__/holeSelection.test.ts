import { createEngine, selectHole, activeHole } from '../src/game/engine';
import { HOLE_COUNT } from '../src/constants/config';

describe('ice-hole selection', () => {
  it('generates exactly HOLE_COUNT holes inside the plate', () => {
    const s = createEngine(0, 'JIG', 0);
    expect(s.holes).toHaveLength(HOLE_COUNT);
    s.holes.forEach(h => {
      expect(h.x).toBeGreaterThanOrEqual(0);
      expect(h.x).toBeLessThanOrEqual(1);
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(h.y).toBeLessThanOrEqual(1);
    });
  });

  it('binds the tapped hole and moves the phase idle -> sonar', () => {
    const s = createEngine(0, 'JIG', 0);
    expect(s.phase).toBe('idle');
    expect(s.activeHoleId).toBe(-1);

    const next = selectHole(s, s.holes[2].id);
    expect(next.phase).toBe('sonar');
    expect(next.activeHoleId).toBe(s.holes[2].id);
    const hole = activeHole(next);
    expect(hole).not.toBeNull();
    expect(hole && hole.bandCentre).toBe(s.holes[2].bandCentre);
  });

  it('ignores a selection while a fish is already being worked', () => {
    const s = createEngine(0, 'JIG', 0);
    const sonar = selectHole(s, 1);
    const again = selectHole(sonar, 3);
    expect(again.activeHoleId).toBe(1);
  });

  it('two attempts of the same level produce different fields', () => {
    const a = createEngine(2, 'JIG', 0);
    const b = createEngine(2, 'JIG', 1);
    const sameX = a.holes.every((h, i) => h.x === b.holes[i].x);
    const sameBand = a.holes.every((h, i) => h.bandCentre === b.holes[i].bandCentre);
    expect(sameX && sameBand).toBe(false);
  });
});
