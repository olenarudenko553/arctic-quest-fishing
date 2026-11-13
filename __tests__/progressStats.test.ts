import { ZONES } from '../src/game/levels';
import { clearedInZone, defaultSave, mergeSave, totalStars } from '../src/game/persistence';

describe('lifetime progress', () => {
  it('starts completely empty so the screen can show its empty state', () => {
    const s = defaultSave();
    expect(totalStars(s)).toBe(0);
    expect(s.fishLanded).toBe(0);
    expect(s.bestScore).toBe(0);
    expect(s.linesSnapped).toBe(0);
    expect(s.bestCombo).toBe(0);
  });

  it('sums stars across every level', () => {
    const stars = defaultSave().stars.slice();
    stars[0] = 3;
    stars[1] = 2;
    stars[5] = 1;
    expect(totalStars(mergeSave(defaultSave(), { stars }))).toBe(6);
  });

  it('counts cleared levels per zone', () => {
    const stars = defaultSave().stars.slice();
    stars[0] = 1;
    stars[1] = 2;
    const save = mergeSave(defaultSave(), { stars });
    expect(clearedInZone(save, ZONES[0].levels)).toBe(2);
    expect(clearedInZone(save, ZONES[1].levels)).toBe(0);
  });

  it('accumulates lifetime totals through merges', () => {
    let save = defaultSave();
    save = mergeSave(save, { fishLanded: 4, linesSnapped: 1, bestScore: 1200 });
    save = mergeSave(save, { fishLanded: save.fishLanded + 3, bestScore: 900 });
    expect(save.fishLanded).toBe(7);
    expect(save.linesSnapped).toBe(1);
    expect(save.bestScore).toBe(900);
  });
});
