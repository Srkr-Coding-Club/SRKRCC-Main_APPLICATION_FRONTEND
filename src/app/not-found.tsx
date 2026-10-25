import React from 'react';
import Link from 'next/link';
import { Home, Compass, Calendar, Trophy, Code2 } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="journey-type relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-journey-bg px-5 py-12 sm:px-8 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)] dark:opacity-[0.18]" />
      <section className="relative w-full max-w-xl space-y-7 overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface px-6 py-8 text-center shadow-[0_24px_60px_-30px_rgba(30,41,59,0.35)] sm:px-10 sm:py-10 dark:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)]" />
        <div className="relative inline-flex items-center gap-2 rounded-full border border-journey-accent/25 bg-journey-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-journey-accent">
          <Compass className="w-3.5 h-3.5" />
          HTTP 404 Error
        </div>

        <div className="relative space-y-3">
          <h1 className="font-display text-[clamp(4rem,12vw,6rem)] font-semibold leading-none tracking-[-0.05em] text-journey-accent">
            404
          </h1>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">
            Page Not Found
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-journey-muted sm:text-base">
            The page or module you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-3 pt-2 text-left sm:grid-cols-3">
          <Link
            href="/events"
            className="group rounded-2xl border border-journey-text/10 bg-journey-bg/70 p-4 transition hover:-translate-y-0.5 hover:border-journey-accent/30 hover:bg-journey-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent"
          >
            <Calendar className="mb-2 h-4 w-4 text-journey-accent" />
            <p className="font-display text-sm font-semibold text-journey-text transition-colors group-hover:text-journey-accent">
              Events
            </p>
            <p className="mt-1 text-xs text-journey-muted">Workshops & talks</p>
          </Link>

          <Link
            href="/hackathons"
            className="group rounded-2xl border border-journey-text/10 bg-journey-bg/70 p-4 transition hover:-translate-y-0.5 hover:border-journey-accent/30 hover:bg-journey-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent"
          >
            <Trophy className="mb-2 h-4 w-4 text-journey-accent" />
            <p className="font-display text-sm font-semibold text-journey-text transition-colors group-hover:text-journey-accent">
              Hackathons
            </p>
            <p className="mt-1 text-xs text-journey-muted">IconCoders & more</p>
          </Link>

          <Link
            href="/codequest"
            className="group rounded-2xl border border-journey-text/10 bg-journey-bg/70 p-4 transition hover:-translate-y-0.5 hover:border-journey-accent/30 hover:bg-journey-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent"
          >
            <Code2 className="mb-2 h-4 w-4 text-journey-accent" />
            <p className="font-display text-sm font-semibold text-journey-text transition-colors group-hover:text-journey-accent">
              CodeQuest
            </p>
            <p className="mt-1 text-xs text-journey-muted">Daily CP streaks</p>
          </Link>
        </div>

        <div className="relative pt-1">
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-journey-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-900/10 transition hover:bg-journey-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Back to Home Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
