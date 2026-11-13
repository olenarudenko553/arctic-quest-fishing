import { isLureUnlocked, lureById, LURES } from '../src/game/lures';
import { effectiveSpeed, effectiveTolerance, rollSpecies } from '../src/game/sonar';
import { levelAt } from '../src/game/levels';
import { mulberry32 } from '../src/game/rng';

describe('lure loadout', () => {
  it('offers three lures gated by stars', () => {
    expect(LURES.map(l => l.id)).toEqual(['JIG', 'SPOON', 'GLOW']);
    expect(isLureUnlocked('JIG', 0)).toBe(true);
    expect(isLureUnlocked('SPOON', 3)).toBe(false);
    expect(isLureUnlocked('SPOON', 4)).toBe(true);
    expect(isLureUnlocked('GLOW', 8)).toBe(false);
    expect(isLureUnlocked('GLOW', 9)).toBe(true);
  });

  it('really changes the sonar step', () => {
    const l = levelAt(3);
    const jig = lureById('JIG');
    const glow = lureById('GLOW');

    expect(effectiveSpeed(l.markerSpeed, glow)).toBeGreaterThan(effectiveSpeed(l.markerSpeed, jig));
    expect(effectiveTolerance(l.tolerance, glow)).toBeLessThan(effectiveTolerance(l.tolerance, jig));
  });

  it('a biased lure pushes the tier roll up', () => {
    expect(lureById('GLOW').tierBias).toBeGreaterThan(lureById('JIG').tierBias);
    expect(lureById('SPOON').tierBias).toBeGreaterThan(lureById('JIG').tierBias);
  });

  it('the roll never leaves the depth band, whatever the lure', () => {
    const rng = mulberry32(1234);
    for (let i = 0; i < 200; i++) {
      const sp = rollSpecies(15, 'perfect', lureById('GLOW'), rng);
      expect(sp.bandLo).toBeLessThanOrEqual(15);
      expect(sp.bandHi).toBeGreaterThanOrEqual(15);
    }
  });

  it('falls back to JIG for an unknown id', () => {
    expect(lureById('ROCKET').id).toBe('JIG');
  });
});
