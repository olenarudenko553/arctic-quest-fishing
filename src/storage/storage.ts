import { defaultSave, mergeSave, migrate, SaveBlob } from '../game/persistence';

/**
 * The ONLY place that touches a storage backend.
 *
 * The build allowlist for this pipeline does not include a native key/value
 * module, so the shipped backend is an in-process one. Everything above this
 * file talks to `load()` / `save()` only, so swapping in a native backend is a
 * change to `backend` and nothing else. The unit tests inject their own backend,
 * so no native module is ever touched in a test.
 */

export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const SAVE_KEY = 'arctic-quest.save.v1';

export function createMemoryBackend(seed?: Record<string, string>): StorageBackend {
  const map: Record<string, string> = { ...(seed || {}) };
  return {
    getItem: key => Promise.resolve(Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null),
    setItem: (key, value) => {
      map[key] = value;
      return Promise.resolve();
    },
    removeItem: key => {
      delete map[key];
      return Promise.resolve();
    },
  };
}

let backend: StorageBackend = createMemoryBackend();

/** Used by the tests, and by a future native backend swap. */
export function setBackend(next: StorageBackend): void {
  backend = next;
}

export async function load(): Promise<SaveBlob> {
  try {
    const raw = await backend.getItem(SAVE_KEY);
    if (!raw) {
      return defaultSave();
    }
    return migrate(JSON.parse(raw));
  } catch (e) {
    return defaultSave();
  }
}

export async function saveAll(blob: SaveBlob): Promise<SaveBlob> {
  try {
    await backend.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch (e) {
    // a failed write must never take the game down
  }
  return blob;
}

/** Merge-then-write: a patch never clobbers the parts of the blob it omits. */
export async function savePatch(base: SaveBlob, patch: Partial<SaveBlob>): Promise<SaveBlob> {
  const merged = mergeSave(base, patch);
  await saveAll(merged);
  return merged;
}

export async function wipe(): Promise<SaveBlob> {
  try {
    await backend.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
  return defaultSave();
}
