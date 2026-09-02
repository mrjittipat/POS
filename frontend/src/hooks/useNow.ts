import { useEffect, useState } from 'react';

/**
 * Returns the current time as a Date, updating every `intervalMs`.
 * Used for the live clock in the POS header.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
