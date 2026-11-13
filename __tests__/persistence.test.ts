import { defaultSave, mergeSave, migrate, SAVE_VERSION } from '../src/game/persistence';
import { createMemoryBackend, load, saveAll, savePatch, setBackend, wipe } from '../src/storage/storage';

describe('local persistence', () => {
  beforeEach(() => {
    setBackend(createMemoryBackend());
  });

  it('starts from the default blob when nothing is stored', async () => {
    const blob = await load();
    expect(blob).toEqual(defaultSave());
  });

  it('round-trips a written blob', async () => {
    const written = mergeSave(defaultSave(), { bestScore: 12480, fishLanded: 47 });
    await saveAll(written);
    const read = await load();
    expect(read.bestScore).toBe(12480);
    expect(read.fishLanded).toBe(47);
    expect(read.version).toBe(SAVE_VERSION);
  });

  it('a patch merges instead of clobbering', async () => {
    const base = mergeSave(defaultSave(), { bestScore: 900, linesSnapped: 2 });
    await saveAll(base);
    const merged = await savePatch(base, { bestScore: 1500 });
    const read = await load();
    expect(merged.linesSnapped).toBe(2);
    expect(read.bestScore).toBe(1500);
    expect(read.linesSnapped).toBe(2);
  });

  it('wipe returns a fresh blob and forgets the old one', async () => {
    await saveAll(mergeSave(defaultSave(), { bestScore: 5000 }));
    const fresh = await wipe();
    expect(fresh.bestScore).toBe(0);
    expect((await load()).bestScore).toBe(0);
  });

  it('migrate repairs garbage instead of crashing', () => {
    expect(migrate(null).version).toBe(SAVE_VERSION);
    expect(migrate('nonsense').bestScore).toBe(0);
    const repaired = migrate({ stars: [9, -2, 'x'], lure: 'ROCKET', bestScore: '4120' });
    expect(repaired.stars[0]).toBe(3);
    expect(repaired.stars[1]).toBe(0);
    expect(repaired.stars[2]).toBe(0);
    expect(repaired.lure).toBe('JIG');
    expect(repaired.bestScore).toBe(4120);
  });

  it('survives a corrupted payload in storage', async () => {
    setBackend(createMemoryBackend({ 'arctic-quest.save.v1': '{not json' }));
    const blob = await load();
    expect(blob).toEqual(defaultSave());
  });
});
