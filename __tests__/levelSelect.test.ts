import { defaultSave, highestUnlocked, isLevelUnlocked, mergeSave } from '../src/game/persistence';
import { LEVEL_COUNT } from '../src/game/levels';

describe('level select', () => {
  it('opens level 1 and locks the rest on a fresh save', () => {
    const save = defaultSave();
    expect(isLevelUnlocked(save, 0)).toBe(true);
    for (let i = 1; i < LEVEL_COUNT; i++) {
      expect(isLevelUnlocked(save, i)).toBe(false);
    }
    expect(highestUnlocked(save)).toBe(0);
  });

  it('clearing a level unlocks the next one', () => {
    const stars = defaultSave().stars.slice();
    stars[0] = 1;
    stars[1] = 3;
    const save = mergeSave(defaultSave(), { stars });

    expect(isLevelUnlocked(save, 1)).toBe(true);
    expect(isLevelUnlocked(save, 2)).toBe(true);
    expect(isLevelUnlocked(save, 3)).toBe(false);
    expect(highestUnlocked(save)).toBe(2);
  });

  it('a locked level stays locked when the one before has no star', () => {
    const stars = defaultSave().stars.slice();
    stars[4] = 3;
    const save = mergeSave(defaultSave(), { stars });
    expect(isLevelUnlocked(save, 4)).toBe(false);
  });
});
