'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** One block could not be loaded: say which, and retry just that block. The rest of the page keeps working. */
export function SectionNotice({ failed, onRetry }: { failed: { label: string; retry: () => void }[]; onRetry?: () => void }) {
  if (failed.length === 0) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-journey-text">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
      <span>Could not load: <strong>{failed.map((item) => item.label).join(', ')}</strong>. The numbers on screen from those blocks may be old or missing.</span>
      <button type="button" onClick={() => { failed.forEach((item) => item.retry()); onRetry?.(); }} className="min-h-9 font-bold text-journey-accent hover:underline">Try again</button>
    </div>
  );
}
