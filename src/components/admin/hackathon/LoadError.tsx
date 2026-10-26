import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/** Shown when an admin tab could not load its data, so an outage is not mistaken for "nothing here yet". */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
      <p className="min-w-0 flex-1 text-rose-700 dark:text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}
