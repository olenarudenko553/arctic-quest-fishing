import { useCallback, useEffect, useRef, useState } from 'react';
import { SaveBlob, defaultSave, mergeSave } from '../game/persistence';
import { load, savePatch, wipe } from '../storage/storage';

export interface GameStorage {
  save: SaveBlob;
  ready: boolean;
  patch: (p: Partial<SaveBlob>) => void;
  reset: () => void;
}

/** Loads the blob once at launch and exposes a merging write. */
export function useGameStorage(): GameStorage {
  const [blob, setBlob] = useState<SaveBlob>(defaultSave);
  const [ready, setReady] = useState(false);
  const ref = useRef<SaveBlob>(blob);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    load()
      .then(loaded => {
        if (!mounted.current) {
          return;
        }
        ref.current = loaded;
        setBlob(loaded);
        setReady(true);
      })
      .catch(() => {
        if (mounted.current) {
          setReady(true);
        }
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback((p: Partial<SaveBlob>) => {
    const merged = mergeSave(ref.current, p);
    ref.current = merged;
    setBlob(merged);
    savePatch(merged, {}).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    wipe()
      .then(fresh => {
        ref.current = fresh;
        setBlob(fresh);
      })
      .catch(() => {});
  }, []);

  return { save: blob, ready, patch, reset };
}

export default useGameStorage;
