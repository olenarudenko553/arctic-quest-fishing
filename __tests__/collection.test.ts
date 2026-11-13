import { candidatesAtDepth, SPECIES, speciesById, RARITY_LABEL } from '../src/game/species';
import { defaultSave, mergeSave, speciesFound } from '../src/game/persistence';

describe('species collection', () => {
  it('has exactly one species per contract sprite', () => {
    expect(SPECIES).toHaveLength(5);
    SPECIES.forEach((s, i) => expect(s.id).toBe(i));
  });

  it('bands cover the whole playable depth range and rise with rarity', () => {
    for (let i = 1; i < SPECIES.length; i++) {
      expect(SPECIES[i].bandLo).toBeGreaterThan(SPECIES[i - 1].bandLo);
      expect(SPECIES[i].basePoints).toBeGreaterThan(SPECIES[i - 1].basePoints);
    }
    expect(SPECIES[0].bandLo).toBeLessThanOrEqual(4);
    expect(SPECIES[4].bandHi).toBeGreaterThanOrEqual(36);
  });

  it('always offers at least one candidate, even off the bands', () => {
    expect(candidatesAtDepth(12).length).toBeGreaterThan(0);
    expect(candidatesAtDepth(0).length).toBe(1);
    expect(candidatesAtDepth(500).length).toBe(1);
  });

  it('counts only species actually caught', () => {
    const fresh = defaultSave();
    expect(speciesFound(fresh)).toBe(0);

    const species = fresh.species.slice();
    species[2] = { caught: 7, recordKg: 4.8 };
    const save = mergeSave(fresh, { species });
    expect(speciesFound(save)).toBe(1);
    expect(save.species[2].recordKg).toBe(4.8);
  });

  it('every rarity has a label and a distinct colour', () => {
    const colors = new Set(SPECIES.map(s => s.color));
    expect(colors.size).toBe(SPECIES.length);
    SPECIES.forEach(s => expect(RARITY_LABEL[s.rarity]).toBeTruthy());
    expect(speciesById(99).id).toBe(0);
  });
});
