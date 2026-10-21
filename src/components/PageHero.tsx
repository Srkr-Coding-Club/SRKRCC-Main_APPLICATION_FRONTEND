'use client';

import React from 'react';

interface PageHeroProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  className?: string;
}

export default function PageHero({
  icon,
  eyebrow,
  title,
  description,
  className = '',
}: PageHeroProps) {
  return (
    <section
      className={[
        'relative isolate overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface',
        'px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12',
        className,
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className="bg-dot-grid pointer-events-none absolute inset-0 opacity-[0.18] [mask-image:linear-gradient(90deg,#000,transparent_85%)] dark:opacity-[0.22]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-36 h-[28rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)] sm:-right-24 sm:-top-48"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-px w-2/3 bg-gradient-to-r from-journey-accent/60 to-transparent"
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.7fr)]">
        <div className="min-w-0 max-w-3xl">
          <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-journey-accent/30 bg-journey-accent/10 px-3.5 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-journey-accent sm:text-[11px]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-journey-accent/15 text-journey-accent">
              {icon}
            </span>
            <span className="min-w-0 truncate">{eyebrow}</span>
          </div>

          <h1 className="mt-6 pb-2 max-w-4xl text-balance font-display text-[clamp(2.25rem,5.3vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-journey-text">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-pretty font-display text-base font-medium leading-snug tracking-[-0.01em] text-journey-muted sm:text-[1.1rem]">
            {description}
          </p>
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden h-40 w-full max-w-[280px] items-center justify-center sm:flex sm:h-48 lg:h-64">
          <div className="absolute aspect-square h-[min(100%,15rem)] rounded-full border border-journey-accent/20" />
          <div className="absolute aspect-square h-[min(78%,12rem)] rounded-full border border-dashed border-journey-text/15" />
          <div className="absolute aspect-square h-[min(58%,9rem)] rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)]" />

          <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border border-journey-accent/50 bg-[var(--background)] text-journey-accent shadow-[0_0_38px_var(--glow-strong)] sm:h-[88px] sm:w-[88px]">
            <span className="flex h-10 w-10 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
              {icon}
            </span>
          </div>

          <span className="absolute right-[14%] top-[18%] h-2.5 w-2.5 rounded-full bg-journey-accent shadow-[0_0_18px_rgb(var(--journey-accent)/0.6)]" />
          <span className="absolute bottom-[16%] left-[17%] h-2 w-2 rounded-full bg-journey-accent/70" />
          <span className="absolute bottom-[20%] right-[18%] h-1.5 w-1.5 rounded-full bg-journey-accent/80" />
        </div>
      </div>
    </section>
  );
}
