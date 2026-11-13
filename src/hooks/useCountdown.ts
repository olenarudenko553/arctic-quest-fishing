import { useEffect, useRef, useState } from 'react';

/**
 * A plain ms countdown that stops itself when it reaches zero or when the owner
 * unmounts. Used for the inline toasts; the level clock lives in the engine so
 * it can be frozen by the pause overlay in one place.
 */
export function useCountdown(totalMs: number, running: boolean, onDone?: () => void): number {
  const [left, setLeft] = useState(totalMs);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setLeft(totalMs);
  }, [totalMs]);

  useEffect(() => {
    if (!running || totalMs <= 0) {
      return undefined;
    }
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, totalMs - (Date.now() - started));
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        if (doneRef.current) {
          doneRef.current();
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [totalMs, running]);

  return left;
}

export default useCountdown;
