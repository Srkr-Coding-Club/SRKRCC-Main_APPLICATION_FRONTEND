'use client';

import Link from 'next/link';
import { ArrowRight, Lock, Ticket } from 'lucide-react';
import type { Event } from '@/lib/types';
import { eventAvailability } from '@/lib/eventListing';
import QuickRegisterButton from '@/components/events/QuickRegisterButton';

interface EventRegisterButtonProps {
  event: Event;
  /** `card` fits the listing footer; `panel` is the full-width button on the details page. */
  size?: 'card' | 'panel';
}

const BASE = {
  card: 'inline-flex min-h-11 min-w-[8.5rem] flex-[2] items-center justify-center gap-1 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition',
  panel: 'inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-bold transition',
} as const;

const PRIMARY = 'bg-journey-accent text-journey-on-accent shadow-[0_12px_28px_-14px_rgba(255,122,0,0.9)] hover:brightness-110 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-journey-bg';
const REGISTERED = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
const QUIET = 'bg-journey-text/10 text-center leading-tight text-journey-text/80';

const REASON: Record<string, string> = {
  PAST: 'Event ended',
  CLOSED: 'Registration closed',
  FULL: 'Event full',
  ENDED: 'Registration closed',
  NOT_YET_OPEN: 'Registration opens soon',
};

/** The one register control for an event: one-click when the event is, the form otherwise, and the reason when nobody can. */
export function EventRegisterButton({ event, size = 'card' }: EventRegisterButtonProps) {
  const availability = eventAvailability(event);
  const base = BASE[size];

  if (!availability.canRegister) {
    return (
      <span className={`${base} ${QUIET}`}>
        {size === 'panel' && <Lock className="h-4 w-4" aria-hidden="true" />}
        {REASON[availability.kind]}
      </span>
    );
  }

  if (event.is_quick_registration && event.form_slug) {
    return (
      <QuickRegisterButton
        event={event}
        label="Register now"
        className={`${base} ${PRIMARY}`}
        registeredClassName={`${base} ${REGISTERED}`}
      />
    );
  }

  if (event.form_slug) {
    return (
      <Link href={`/forms/${event.form_slug}`} className={`${base} ${PRIMARY}`}>
        <Ticket className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        Register now
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    );
  }

  return <span className={`${base} ${QUIET}`}>Registration opens soon</span>;
}
