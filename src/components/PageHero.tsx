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
        'relative isolate overflow-hidden rounded-[28px] border border-black/[0.06] bg-journey-surface dark:border-white/[0.08]',
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
        className="pointer-events-none absolute bottom-0 left-0 h-px w-2/3 bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-transparent opacity-70"
      />

      <div className="relative z-10 grid items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.7fr)]">
        <div className="max-w-3xl">
          <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-[#FF7A00]/20 bg-white/65 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B2E3B] shadow-sm dark:border-white/10 dark:bg-white/[0.045] dark:text-[#FFC08A] sm:text-[11px]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFB347]/25 to-[#8B2E3B]/10 text-[#C2410C] dark:from-[#FF7A00]/20 dark:to-[#8B2E3B]/30 dark:text-[#FFB36B]">
              {icon}
            </span>
            <span className="truncate">{eyebrow}</span>
          </div>

          <h1 className="ember-text mt-6 pb-2 max-w-4xl text-balance font-poppins text-[clamp(2.25rem,5.3vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em]">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-pretty font-display text-base font-semibold leading-tight tracking-[-0.02em] text-journey-text [font-stretch:112%] sm:text-[1.1rem]">
            {description}
          </p>
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden h-40 w-full max-w-[280px] items-center justify-center sm:flex sm:h-48 lg:h-64">
          <div className="absolute aspect-square h-[min(100%,15rem)] rounded-full border border-[#FF7A00]/15 dark:border-[#FF9A44]/15" />
          <div className="absolute aspect-square h-[min(78%,12rem)] rounded-full border border-dashed border-[#8B2E3B]/20 dark:border-white/10" />
          <div className="absolute aspect-square h-[min(58%,9rem)] rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)]" />

          <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full p-[2px] shadow-[0_0_38px_var(--glow-strong)] sm:h-[88px] sm:w-[88px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFA500] via-[#FF7A00] to-[#8B2E3B]" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[var(--background)] text-[#C2410C] dark:text-[#FF9A44]">
              <span className="flex h-10 w-10 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
                {icon}
              </span>
            </div>
          </div>

          <span className="absolute right-[14%] top-[18%] h-2.5 w-2.5 rounded-full bg-[#FFA500] shadow-[0_0_18px_rgba(255,165,0,0.7)]" />
          <span className="absolute bottom-[16%] left-[17%] h-2 w-2 rounded-full bg-[#8B2E3B] shadow-[0_0_16px_rgba(139,46,59,0.55)] dark:bg-[#FF7A00]" />
          <span className="absolute bottom-[20%] right-[18%] h-1.5 w-1.5 rounded-full bg-[#FF7A00]" />
        </div>
      </div>
    </section>
  );
}
