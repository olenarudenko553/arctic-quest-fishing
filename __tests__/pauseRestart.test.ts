import {
  createEngine,
  drop,
  pause,
  restart,
  resume,
  selectHole,
  tick,
  EngineState,
} from '../src/game/engine';
import { LEVEL_TIME_MS } from '../src/constants/config';

function run(s: EngineState, ms: number, held = false): EngineState {
  let cur = s;
  for (let t = 0; t < ms; t += 16) {
    cur = tick(cur, 16, held);
  }
  return cur;
}

describe('pause and restart', () => {
  it('freezes the clock and the sweep while paused', () => {
    let s = createEngine(0, 'JIG', 0);
    s = selectHole(s, s.holes[0].id);
    s = run(s, 320);
    const beforeClock = s.timeLeftMs;
    const beforeDepth = s.markerDepth;

    const paused = run(pause(s), 2000);
    expect(paused.paused).toBe(true);
    expect(paused.timeLeftMs).toBe(beforeClock);
    expect(paused.markerDepth).toBe(beforeDepth);

    const resumed = run(resume(paused), 320);
    expect(resumed.timeLeftMs).toBeLessThan(beforeClock);
  });

  it('restart re-seeds with the next attempt and clears the round', () => {
    let s = createEngine(0, 'JIG', 0);
    s = drop(s);
    s = run(s, 1000);
    s = { ...s, score: 500, lineBreaks: 1 };

    const again = restart(s);
    expect(again.attempt).toBe(1);
    expect(again.seed).not.toBe(s.seed);
    expect(again.score).toBe(0);
    expect(again.lineBreaks).toBe(0);
    expect(again.phase).toBe('idle');
    expect(again.timeLeftMs).toBe(LEVEL_TIME_MS);
  });

  it('pause is refused once the round is over', () => {
    const over = { ...createEngine(0, 'JIG', 0), phase: 'over' as const };
    expect(pause(over).paused).toBe(false);
  });
});
