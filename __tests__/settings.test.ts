import { DEFAULT_SETTINGS, defaultSave, mergeSave } from '../src/game/persistence';
import { safeZone } from '../src/game/tension';
import { levelAt } from '../src/game/levels';

describe('settings', () => {
  it('ships four toggles, none of them audio', () => {
    const keys = Object.keys(DEFAULT_SETTINGS).sort();
    expect(keys).toEqual(['highContrast', 'leftHanded', 'reducedMotion', 'sonarAssist']);
    keys.forEach(k => {
      expect(k.toLowerCase()).not.toContain('sound');
      expect(k.toLowerCase()).not.toContain('music');
      expect(k.toLowerCase()).not.toContain('volume');
    });
  });

  it('a toggle survives a merge without touching the rest of the blob', () => {
    const base = mergeSave(defaultSave(), { bestScore: 4120 });
    const next = mergeSave(base, { settings: { ...base.settings, sonarAssist: false } });
    expect(next.settings.sonarAssist).toBe(false);
    expect(next.settings.reducedMotion).toBe(DEFAULT_SETTINGS.reducedMotion);
    expect(next.bestScore).toBe(4120);
  });

  it('HIGH-CONTRAST TENSION changes only the drawing, never the safe band', () => {
    const l = levelAt(3);
    const a = safeZone(l, 0);
    const b = safeZone(l, 0);
    expect(a).toEqual(b);
    expect(a.lo).toBe(l.safeLo);
  });

  it('RESET PROGRESS returns a completely fresh blob', () => {
    const dirty = mergeSave(defaultSave(), { bestScore: 9000, fishLanded: 40 });
    const fresh = defaultSave();
    expect(dirty.bestScore).toBe(9000);
    expect(fresh.bestScore).toBe(0);
    expect(fresh.settings).toEqual(DEFAULT_SETTINGS);
  });
});
