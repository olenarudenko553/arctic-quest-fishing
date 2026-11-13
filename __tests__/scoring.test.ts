import {
  accuracyPct,
  formatClock,
  formatKg,
  formatScore,
  nextCombo,
  payout,
  starsFor,
} from '../src/game/scoring';
import { levelAt } from '../src/game/levels';
import { SPECIES } from '../src/game/species';

describe('scoring and the result', () => {
  it('pays base x weight x combo', () => {
    const sp = SPECIES[1];
    const norm = 2.2 + sp.id * 1.6;
    const one = payout(sp, norm, 1);
    const three = payout(sp, norm, 3);
    expect(one).toBe(sp.basePoints);
    expect(three).toBe(sp.basePoints * 3);
    expect(payout(sp, norm * 1.5, 1)).toBeGreaterThan(one);
  });

  it('a rarer fish is worth more at the same weight', () => {
    const common = payout(SPECIES[0], 2.2, 1);
    const legendary = payout(SPECIES[4], 2.2 + 4 * 1.6, 1);
    expect(legendary).toBeGreaterThan(common);
  });

  it('awards 1 star for finishing and 3 at the top threshold', () => {
    const l = levelAt(0);
    expect(starsFor(0, l, false)).toBe(0);
    expect(starsFor(0, l, true)).toBe(1);
    expect(starsFor(l.starTwo, l, true)).toBe(2);
    expect(starsFor(l.starThree, l, true)).toBe(3);
  });

  it('combo climbs on clean work and resets on a dirty fight', () => {
    expect(nextCombo(1, true)).toBe(2);
    expect(nextCombo(4, true)).toBe(4);
    expect(nextCombo(3, false)).toBe(1);
  });

  it('formats numbers without any tofu-prone glyph', () => {
    expect(formatScore(12480)).toBe('12 480');
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1234567)).toBe('1 234 567');
    expect(formatKg(4.82)).toBe('4.8 kg');
    expect(formatClock(72000)).toBe('01:12');
    expect(formatClock(0)).toBe('00:00');
    expect(accuracyPct(3, 4)).toBe(75);
    expect(accuracyPct(0, 0)).toBe(0);
  });
});
