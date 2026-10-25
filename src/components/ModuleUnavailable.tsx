import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowLeft } from 'lucide-react';

interface ModuleUnavailableProps {
  moduleName: string;
  icon: LucideIcon;
  description?: string;
}

export default function ModuleUnavailable({ moduleName, icon: Icon, description }: ModuleUnavailableProps) {
  return (
    <main className="journey-type relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-journey-bg px-5 py-12 transition-colors duration-300 sm:px-8 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)] dark:opacity-[0.18]" />
      <section className="relative w-full max-w-3xl space-y-6 overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface px-6 py-8 text-center shadow-[0_24px_60px_-30px_rgba(30,41,59,0.35)] sm:space-y-7 sm:px-10 sm:py-12 dark:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)]" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-journey-accent/20 bg-journey-accent/10 text-journey-accent mx-auto sm:h-16 sm:w-16">
            <Icon className="w-8 h-8" />
          </div>

          <div className="relative space-y-3">
            <span className="block font-mono text-xs font-medium uppercase tracking-[0.16em] text-journey-accent">Temporarily offline</span>
            <h1 className="mx-auto max-w-[22ch] font-display text-[clamp(1.8rem,4vw,2.7rem)] font-semibold leading-tight tracking-[-0.025em] text-journey-text">
              {moduleName} is temporarily unavailable
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-journey-muted sm:text-base">
              {description || 'This module has been paused by the admin team and will return once the current season/window opens.'}
            </p>
          </div>

          <Link
            href="/"
            className="relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-journey-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/10 transition hover:bg-journey-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
      </section>
    </main>
  );
}
