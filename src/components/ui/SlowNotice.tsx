'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* What a waiting person is told as the wait gets long. The free hosting plan can take up to a   */
/* minute to wake the server, so silence for that long looks like a broken page.                  */
const STAGES: Array<{ at: number; text: string }> = [
  { at: 3000, text: 'Still loading…' },
  { at: 8000, text: 'The server is waking up. This can take up to a minute.' },
  { at: 20000, text: 'Taking longer than usual…' },
];
const GIVE_UP_AT = 45000;

/** Staged messages for a long wait, with Retry once it has gone on too long. `onRetry` defaults to a route refresh. */
export function SlowNotice({ onRetry, className = '' }: { onRetry?: () => void; className?: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timers = [...STAGES.map((stage) => stage.at), GIVE_UP_AT].map((at) => window.setTimeout(() => setElapsed(at), at));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const gaveUp = elapsed >= GIVE_UP_AT;
  const stage = [...STAGES].reverse().find((item) => elapsed >= item.at);
  if (!stage && !gaveUp) return <div role="status" aria-live="polite" className="sr-only">Loading</div>;

  return (
    <div role="status" aria-live="polite" className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border border-journey-text/10 bg-journey-surface/90 px-4 py-2.5 text-sm text-journey-muted shadow-lg backdrop-blur ${className}`}>
      <span>{gaveUp ? 'We could not reach the server.' : stage?.text}</span>
      {gaveUp && (
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : router.refresh())}
          className="min-h-9 rounded-lg border border-journey-accent px-3 text-xs font-bold text-journey-accent hover:bg-journey-accent/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
