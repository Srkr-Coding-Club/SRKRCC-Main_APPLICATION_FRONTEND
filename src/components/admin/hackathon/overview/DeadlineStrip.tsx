'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import { countdown, istText, lastPassed, milestones, upcoming, type Urgency } from '@/lib/hackathonOverview';
import type { Hackathon } from '@/lib/types';
import { PANEL } from '../shared';

const TONE: Record<Urgency, string> = {
  calm: 'text-journey-text',
  soon: 'text-amber-600 dark:text-amber-400',
  urgent: 'text-rose-600 dark:text-rose-400',
};
const RING: Record<Urgency, string> = {
  calm: 'border-journey-text/10',
  soon: 'border-amber-500/40',
  urgent: 'border-rose-500/50',
};

interface DeadlineStripProps {
  hackathon: Hackathon;
  now: Date;
  /** Said after the next date when it is the registration close ("31 of 60 team places taken"). */
  registrationNote?: string;
}

/** What is due next and how long is left, in Indian Standard Time; the rest of the schedule follows in smaller type. */
export function DeadlineStrip({ hackathon, now, registrationNote }: DeadlineStripProps) {
  const all = milestones(hackathon);
  if (all.length === 0) return null;
  const [next, ...later] = upcoming(all, now, 3);

  if (!next) {
    const last = lastPassed(all, now);
    return (
      <section className={`${PANEL} flex items-center gap-3 !py-3.5`} aria-label="Schedule">
        <CalendarClock className="h-5 w-5 shrink-0 text-journey-muted" aria-hidden="true" />
        <p className="text-sm text-journey-muted">Every date has passed.{last ? ` ${last.label} ${countdown(last.at, now).text}.` : ''}</p>
      </section>
    );
  }

  const left = countdown(next.at, now);
  const note = next.key === 'registration_closes' ? registrationNote : '';
  return (
    <section className={`${PANEL} flex flex-wrap items-center gap-x-6 gap-y-3 !p-4 sm:!p-5 ${RING[left.urgency]}`} aria-label="Next date">
      <div className="flex min-w-0 flex-1 basis-72 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-journey-accent/15 ${TONE[left.urgency]}`} aria-hidden="true"><CalendarClock className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-journey-muted">Next</p>
          <p className="text-sm font-bold text-journey-text sm:text-base">{next.label} <span className={TONE[left.urgency]}>{left.text}</span></p>
          <p className="text-xs text-journey-muted">{istText(next.at)}{note ? ` · ${note}` : ''}</p>
        </div>
      </div>
      {later.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="After that">
          {later.map((item) => (
            <li key={item.key} className="rounded-lg border border-journey-text/10 px-3 py-1.5 text-xs">
              <span className="font-bold text-journey-text">{item.label}</span> <span className="text-journey-muted">{countdown(item.at, now).text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
