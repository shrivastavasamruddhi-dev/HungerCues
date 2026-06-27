import { useEffect, useState } from 'react';

/**
 * Custom hook to track elapsed time (in seconds) for an active sleep session timer.
 * @param activeSleepStart The ISO date string when the sleep session started, or null if inactive.
 */
export function useActiveSleepTimer(activeSleepStart: string | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeSleepStart) {
      const start = new Date(activeSleepStart).getTime();
      const update = () => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSleepStart]);

  return elapsedSeconds;
}
