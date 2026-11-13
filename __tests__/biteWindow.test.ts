import { createEngine, drop, hook, selectHole, tick, EngineState } from '../src/game/engine';
import { BITE_WINDOW_MS } from '../src/constants/config';

function run(s: EngineState, ms: number, held = false): EngineState {
  let cur = s;
  for (let t = 0; t < ms; t += 16) {
    cur = tick(cur, 16, held);
  }
  return cur;
}

function armedBite(): EngineState {
  let s = createEngine(0, 'JIG', 0);
  s = selectHole(s, s.holes[0].id);
  s = { ...s, markerDepth: s.holes[0].bandCentre };
  s = drop(s);
  return { ...s, willBite: true, waitMs: 32 };
}

describe('bite and hook set', () => {
  it('opens a 900 ms window after the wait', () => {
    const s = run(armedBite(), 64);
    expect(s.phase).toBe('bite');
    expect(s.biteMs).toBeLessThanOrEqual(BITE_WINDOW_MS);
    expect(s.biteMs).toBeGreaterThan(0);
  });

  it('hooking inside the window starts the fight', () => {
    const bit = run(armedBite(), 64);
    const fighting = hook(bit);
    expect(fighting.phase).toBe('fight');
    expect(fighting.distance).toBeGreaterThan(0);
    expect(fighting.distanceMax).toBe(fighting.distance);
  });

  it('missing the window costs freshness but no life', () => {
    const armed = armedBite();
    const before = armed.holes[0].freshness;
    const missed = run(armed, 64 + BITE_WINDOW_MS + 64);
    expect(missed.phase).toBe('idle');
    expect(missed.lineBreaks).toBe(0);
    expect(missed.holes[0].freshness).toBeLessThan(before);
  });

  it('hook does nothing outside the bite phase', () => {
    const s = createEngine(0, 'JIG', 0);
    expect(hook(s).phase).toBe('idle');
  });

  it('a failed roll sends the player back to the ice field', () => {
    let s = createEngine(0, 'JIG', 0);
    s = selectHole(s, s.holes[1].id);
    s = drop(s);
    s = { ...s, willBite: false, waitMs: 32 };
    const after = run(s, 64);
    expect(after.phase).toBe('idle');
    expect(after.activeHoleId).toBe(-1);
  });
});
