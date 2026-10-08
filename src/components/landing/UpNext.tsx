import React from 'react';
import Link from 'next/link';
import type { AgendaItem, RegistrationState } from '@/lib/landing';
import PathNode from './PathNode';

const STATUS: Record<RegistrationState, { label: string; tone: string } | null> = {
  open: { label: 'Registration open', tone: 'text-journey-live' },
  upcoming: { label: 'Opens soon', tone: 'text-journey-muted' },
  closed: { label: 'Closed', tone: 'text-journey-muted' },
  none: null,
};

/* ------------------------------------------------------------------ */
/* Up next: the live agenda, scannable as a schedule rather than      */
/* browsed as a carousel. Date first, then what and where, status,    */
/* and one action per row.                                            */
/* ------------------------------------------------------------------ */
export default function UpNext({ items }: { items: AgendaItem[] }) {
  return (
    <section id="up-next" aria-labelledby="up-next-title" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="relative">
        <PathNode className="top-[0.55rem]" />
        <h2 id="up-next-title" className="font-display text-[clamp(2rem,4.2vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-journey-text [font-stretch:112%]">
          Up next
        </h2>
        <p className="mt-4 max-w-[46ch] text-base text-journey-muted sm:text-lg">What’s on the schedule, soonest first.</p>
      </div>

      {items.length > 0 ? (
        <ul className="mt-12 border-t border-journey-text/10">
          {items.map((item) => {
            const status = STATUS[item.registration];
            return (
              <li key={item.key} className="border-b border-journey-text/10">
                <Link
                  href={item.href}
                  className="group grid grid-cols-[4.5rem_1fr] items-center gap-x-5 gap-y-2 py-6 transition-colors focus:outline-none focus-visible:bg-journey-text/[0.04] sm:grid-cols-[6rem_1fr_auto] sm:gap-x-8 [@media(hover:hover)]:hover:bg-journey-text/[0.03]"
                >
                  <span className="row-span-2 font-display leading-none text-journey-text [font-stretch:112%] sm:row-span-1">
                    {item.dayLabel ? (
                      <>
                        <span className="block text-[2rem] font-semibold tabular-nums tracking-[-0.03em]">{item.dayLabel}</span>
                        <span className="mt-1 block text-sm text-journey-muted">{item.monthLabel}</span>
                      </>
                    ) : (
                      <span className="text-sm text-journey-muted">Date TBA</span>
                    )}
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-journey-text group-hover:text-journey-accent sm:text-xl">{item.title}</span>
                    <span className="mt-1 block text-sm text-journey-muted">
                      {[item.kind, item.timeLabel, item.venue].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <span className="col-start-2 flex items-center gap-5 text-sm sm:col-start-auto sm:justify-end">
                    {status && <span className={status.tone}>{status.label}</span>}
                    <span className="font-semibold text-journey-text underline decoration-journey-accent decoration-2 underline-offset-[6px]">{item.actionLabel}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-12 max-w-[52ch] border-t border-journey-text/10 pt-8 text-base text-journey-muted">
          Nothing is scheduled right now. New sessions are announced on the{' '}
          <Link href="/events" className="font-semibold text-journey-text underline decoration-journey-accent underline-offset-4">
            events page
          </Link>
          .
        </p>
      )}
    </section>
  );
}
