import { createEngine, drop, selectHole, EngineState } from '../src/game/engine';
import { FRESHNESS_DROP, FRESHNESS_RECOVER } from '../src/constants/config';
import { biteChance } from '../src/game/sonar';

function dropOn(s: EngineState, id: number): EngineState {
  let cur = selectHole(s, id);
  cur = { ...cur, markerDepth: cur.holes[id].bandCentre };
  return drop(cur);
}

describe('hole freshness and cool-down', () => {
  it('the worked hole loses freshness and the rest recover', () => {
    const s = createEngine(0, 'JIG', 0);
    const before = s.holes.map(h => h.freshness);
    const after = dropOn(s, 0);

    expect(after.holes[0].freshness).toBeCloseTo(Math.max(0, before[0] - FRESHNESS_DROP), 5);
    for (let i = 1; i < after.holes.length; i++) {
      expect(after.holes[i].freshness).toBeCloseTo(
        Math.min(100, before[i] + FRESHNESS_RECOVER),
        5,
      );
    }
  });

  it('farming one hole drives its bite chance down', () => {
    let s = createEngine(0, 'JIG', 0);
    const first = s.holes[0].freshness;
    for (let i = 0; i < 4; i++) {
      s = { ...dropOn(s, 0), phase: 'idle', activeHoleId: -1 };
    }
    expect(s.holes[0].freshness).toBeLessThan(first);
    expect(biteChance(s.holes[0].freshness, 'perfect')).toBeLessThan(
      biteChance(first, 'perfect'),
    );
  });

  it('freshness never leaves 0..100', () => {
    let s = createEngine(0, 'JIG', 0);
    for (let i = 0; i < 20; i++) {
      s = { ...dropOn(s, 0), phase: 'idle', activeHoleId: -1 };
    }
    s.holes.forEach(h => {
      expect(h.freshness).toBeGreaterThanOrEqual(0);
      expect(h.freshness).toBeLessThanOrEqual(100);
    });
  });
});
