'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LiveSection<T> {
  data: T | null;
  /** The last failure, kept even when older data is still shown. */
  error: Error | null;
  loading: boolean;
  /** When `data` was last fetched (milliseconds), or null before the first answer. */
  updatedAt: number | null;
  reload: () => void;
}

interface Options {
  /** How often to look again while the page is visible. */
  interval?: number;
  /** Changing this reloads (a parent "refresh" button). */
  refreshKey?: number;
  /** A section that does not apply (a module that is off) makes no request at all. */
  enabled?: boolean;
}

/**
 * One block of a dashboard that loads, fails and refreshes on its own: a failure in one block never blanks another, the
 * previous numbers stay on screen while a refresh runs or fails, polling stops while the tab is hidden, and only the
 * newest answer is ever used.
 */
export function useLiveSection<T>(load: () => Promise<T>, { interval = 30_000, refreshKey = 0, enabled = true }: Options = {}): LiveSection<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const newest = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const run = useCallback(() => {
    if (!enabled) return;
    const mine = ++newest.current;
    setLoading(true);
    loader.current()
      .then((value) => { if (mine === newest.current) { setData(value); setError(null); setUpdatedAt(Date.now()); } })
      .catch((err) => { if (mine === newest.current) setError(err instanceof Error ? err : new Error(String(err))); })
      .finally(() => { if (mine === newest.current) setLoading(false); });
  }, [enabled]);

  useEffect(() => { run(); }, [run, refreshKey]);

  useEffect(() => {
    if (!enabled || interval <= 0) return undefined;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') run(); }, interval);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, interval, run]);

  return { data, error, loading, updatedAt, reload: run };
}

/** True when the failure is "you may not see this", which a block treats as "not for you", not as a fault. */
export const isForbidden = (error: Error | null) => (error as { status?: number } | null)?.status === 403;
