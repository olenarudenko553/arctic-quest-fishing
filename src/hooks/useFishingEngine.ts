import { useCallback, useEffect, useRef, useState } from 'react';
import { TICK_MS } from '../constants/config';
import {
  createEngine,
  drop as dropAction,
  EngineState,
  hook as hookAction,
  backToField,
  pause as pauseAction,
  restart as restartAction,
  resume as resumeAction,
  RoundSummary,
  selectHole as selectHoleAction,
  summarise,
  tick,
} from '../game/engine';

export interface FishingEngine {
  state: EngineState;
  selectHole: (id: number) => void;
  drop: () => void;
  hook: () => void;
  setHeld: (held: boolean) => void;
  toField: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

/**
 * Owns the 16 ms loop. The loop is started by mounting the game screen, frozen
 * by the pause overlay and cleared on unmount / round end (rule 5.6). Callbacks
 * read the live state from a ref, never from a stale closure (rule 12.4).
 */
export function useFishingEngine(
  levelIndex: number,
  lureId: string,
  onOver: (summary: RoundSummary) => void,
): FishingEngine {
  const [state, setState] = useState<EngineState>(() => createEngine(levelIndex, lureId, 0));
  const ref = useRef<EngineState>(state);
  const heldRef = useRef(false);
  const overRef = useRef(false);
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  const commit = useCallback((next: EngineState) => {
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const fresh = createEngine(levelIndex, lureId, 0);
    overRef.current = false;
    heldRef.current = false;
    ref.current = fresh;
    setState(fresh);
  }, [levelIndex, lureId]);

  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(64, now - last);
      last = now;
      const cur = ref.current;
      if (cur.phase === 'over' || cur.paused) {
        return;
      }
      const next = tick(cur, dt, heldRef.current);
      ref.current = next;
      setState(next);
      if (next.phase === 'over' && !overRef.current) {
        overRef.current = true;
        heldRef.current = false;
        onOverRef.current(summarise(next));
      }
    }, TICK_MS);
    return () => {
      clearInterval(id);
      heldRef.current = false;
    };
  }, [levelIndex, lureId]);

  const selectHole = useCallback(
    (id: number) => commit(selectHoleAction(ref.current, id)),
    [commit],
  );
  const drop = useCallback(() => commit(dropAction(ref.current)), [commit]);
  const hook = useCallback(() => commit(hookAction(ref.current)), [commit]);
  const toField = useCallback(() => commit(backToField(ref.current)), [commit]);
  const pause = useCallback(() => commit(pauseAction(ref.current)), [commit]);
  const resume = useCallback(() => commit(resumeAction(ref.current)), [commit]);
  const restart = useCallback(() => {
    overRef.current = false;
    heldRef.current = false;
    commit(restartAction(ref.current));
  }, [commit]);

  const setHeld = useCallback((held: boolean) => {
    heldRef.current = held;
  }, []);

  return { state, selectHole, drop, hook, setHeld, toField, pause, resume, restart };
}

export default useFishingEngine;
