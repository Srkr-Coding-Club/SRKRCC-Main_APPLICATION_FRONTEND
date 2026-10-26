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
    <div className="journey-type relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden bg-journey-bg px-5 py-12 sm:px-8 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)] dark:opacity-[0.18]" />
      <section className="relative w-full max-w-lg space-y-6 overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface px-6 py-8 text-center shadow-[0_24px_60px_-30px_rgba(30,41,59,0.35)] sm:px-10 sm:py-10 dark:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.16),transparent)]" />
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-journey-live/20 bg-journey-live/10 text-journey-live shadow-inner sm:h-16 sm:w-16">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="relative space-y-2">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-journey-live">Runtime error</span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-journey-muted sm:text-base">
            An unexpected error occurred while rendering this module. Our team has been notified.
          </p>
        </div>

        {error?.message && (
          <div className="relative overflow-x-auto rounded-xl border border-journey-text/10 bg-journey-bg/70 p-3 text-left">
            <p className="break-words font-mono text-xs text-journey-live">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 font-mono text-[10px] text-journey-muted">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="relative flex flex-col justify-center gap-3 pt-2 sm:flex-row">
          <button
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-journey-accent px-5 py-2.5 text-sm font-semibold text-journey-on-accent shadow-lg shadow-orange-900/10 transition hover:bg-journey-accent/90 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-journey-text/15 bg-journey-bg/70 px-5 py-2.5 text-sm font-semibold text-journey-text transition hover:border-journey-accent/40 hover:bg-journey-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </section>
    </div>
  );
}
