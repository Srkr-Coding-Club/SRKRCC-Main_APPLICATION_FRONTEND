'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full p-8 rounded-3xl bg-white/50 dark:bg-[#151722]/80 backdrop-blur-xl border border-rose-500/20 dark:border-rose-500/20 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            An unexpected error occurred while rendering this module. Our team has been notified.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-left overflow-x-auto">
            <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
