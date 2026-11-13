import { COMBO_MAX } from '../src/constants/config';
import { nextCombo, payout } from '../src/game/scoring';
import { SPECIES } from '../src/game/species';
import { createEngine, drop, hook, selectHole, tick, EngineState } from '../src/game/engine';

function fighting(): EngineState {
  let s = createEngine(0, 'JIG', 0);
  s = selectHole(s, s.holes[0].id);
  s = { ...s, markerDepth: s.holes[0].bandCentre };
  s = drop(s);
  s = { ...s, willBite: true, waitMs: 16 };
  for (let t = 0; t < 48; t += 16) {
    s = tick(s, 16, false);
  }
  return hook(s);
}

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

describe('perfect-tension combo', () => {
  it('climbs to the ceiling and no further', () => {
    let c = 1;
    for (let i = 0; i < 10; i++) {
      c = nextCombo(c, true);
    }
    expect(c).toBe(COMBO_MAX);
  });

  it('multiplies the payout', () => {
    const sp = SPECIES[2];
    const norm = 2.2 + sp.id * 1.6;
    expect(payout(sp, norm, 4)).toBe(payout(sp, norm, 1) * 4);
  });

  it('a clean landing raises the combo in the engine', () => {
    const landed = playWell(fighting(), 20000);
    expect(landed.phase).toBe('landed');
    expect(landed.combo).toBe(2);
    expect(landed.bestCombo).toBe(2);
  });

  it('any trip into the red resets it on the next landing', () => {
    const dirty = { ...fighting(), combo: 3, cleanFight: false };
    const landed = playWell(dirty, 20000);
    expect(landed.combo).toBe(1);
  });
});
