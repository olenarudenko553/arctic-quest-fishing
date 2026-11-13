import { createEngine, drop, hook, selectHole, tick, EngineState } from '../src/game/engine';
import { MAX_LINE_BREAKS, SNAP_HOLD_MS } from '../src/constants/config';

function run(s: EngineState, ms: number, held = false): EngineState {
  let cur = s;
  for (let t = 0; t < ms; t += 16) {
    cur = tick(cur, 16, held);
  }
  return cur;
}

function fighting(levelIndex = 0): EngineState {
  let s = createEngine(levelIndex, 'JIG', 0);
  s = selectHole(s, s.holes[0].id);
  s = { ...s, markerDepth: s.holes[0].bandCentre };
  s = drop(s);
  s = { ...s, willBite: true, waitMs: 16 };
  s = run(s, 48);
  return hook(s);
}

describe('line break', () => {
  it('a greedy hold parts the line', () => {
    const snapped = run(fighting(), 4000, true);
    expect(['snap', 'idle', 'over']).toContain(snapped.phase);
    expect(snapped.lineBreaks).toBeGreaterThanOrEqual(1);
  });

  it('needs at least SNAP_HOLD_MS in the red', () => {
    const early = run(fighting(), SNAP_HOLD_MS - 64, true);
    expect(early.lineBreaks).toBe(0);
  });

  it('a snap resets the combo and never ends the round on the first break', () => {
    const start = { ...fighting(), combo: 3 };
    const after = run(start, 4000, true);
    expect(after.combo).toBe(1);
    expect(after.outcome).toBeNull();
  });

  it('the third break ends the round', () => {
    const base = fighting();
    const s = { ...base, lineBreaks: MAX_LINE_BREAKS - 1 };
    const over = run(s, 6000, true);
    expect(over.phase).toBe('over');
    expect(over.outcome).toBe('snapped');
  });

  it('releasing keeps the player alive indefinitely', () => {
    const calm = run(fighting(), 20000, false);
    expect(calm.lineBreaks).toBe(0);
    expect(calm.outcome).toBeNull();
  });
});
