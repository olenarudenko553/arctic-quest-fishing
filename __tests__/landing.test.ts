import { createEngine, drop, hook, selectHole, tick, EngineState } from '../src/game/engine';
import { speciesById } from '../src/game/species';

function run(s: EngineState, ms: number, held = false): EngineState {
  let cur = s;
  for (let t = 0; t < ms; t += 16) {
    cur = tick(cur, 16, held);
  }
  return cur;
}

function fighting(): EngineState {
  let s = createEngine(0, 'JIG', 0);
  s = selectHole(s, s.holes[0].id);
  s = { ...s, markerDepth: s.holes[0].bandCentre };
  s = drop(s);
  s = { ...s, willBite: true, waitMs: 16 };
  return hook(run(s, 48));
}

/** Bang-bang control: hold inside the green, ease off before the red. */
function playWell(s: EngineState, ms: number): EngineState {
  let cur = s;
  for (let t = 0; t < ms; t += 16) {
    cur = tick(cur, 16, cur.tension < 60);
    if (cur.phase !== 'fight') {
      break;
    }
  }
  return cur;
}

describe('landing a fish', () => {
  it('clean play brings the distance to zero and records the catch', () => {
    const start = fighting();
    const landed = playWell(start, 20000);

    expect(landed.phase).toBe('landed');
    expect(landed.caught).toHaveLength(1);
    expect(landed.caught[0].kg).toBeGreaterThan(0);
    expect(landed.caught[0].points).toBeGreaterThan(0);
    expect(landed.score).toBe(landed.caught[0].points);
    expect(landed.lineBreaks).toBe(0);
  });

  it('the landed species is one that actually holds at the locked depth', () => {
    const landed = playWell(fighting(), 20000);
    const sp = speciesById(landed.caught[0].speciesId);
    expect(landed.caught[0].name).toBe(sp.name);
    expect(sp.basePoints).toBeGreaterThan(0);
  });

  it('a clean fight raises the combo', () => {
    const landed = playWell(fighting(), 20000);
    expect(landed.caught[0].combo).toBeGreaterThanOrEqual(2);
    expect(landed.bestCombo).toBeGreaterThanOrEqual(2);
  });

  it('the landed flash returns the player to the ice field', () => {
    const landed = playWell(fighting(), 20000);
    const back = run(landed, 1400);
    expect(['idle', 'over']).toContain(back.phase);
  });
});
