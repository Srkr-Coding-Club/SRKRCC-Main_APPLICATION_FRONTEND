'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import ListingGrid, { type ListingLayout } from '@/components/ui/ListingGrid';

interface PhasedListingProps<T> {
  icon: LucideIcon;
  /** "event" or "hackathon": used in headings and messages. */
  noun: string;
  live: T[];
  upcoming: T[];
  past: T[];
  getKey: (item: T) => string | number;
  render: (item: T, index: number, layout: ListingLayout) => ReactNode;
  upcomingDescription: string;
  /** Shown when nothing is on or coming up. */
  empty: ReactNode;
}

/**
 * A listing in the order people need it: what is on now, what is coming, and, tucked away until asked for, what is over.
 * Past items never sit under an "Upcoming" heading or inflate its count.
 */
export default function PhasedListing<T>({ icon, noun, live, upcoming, past, getKey, render, upcomingDescription, empty }: PhasedListingProps<T>) {
  const [showPast, setShowPast] = useState(false);
  const nothingAhead = live.length === 0 && upcoming.length === 0;

  return (
    <div className="space-y-10">
      {live.length > 0 && (
        <section aria-labelledby="listing-live" className="space-y-6">
          <SectionHeading icon={icon} title={<span id="listing-live">Happening now ({live.length})</span>} description={`The ${noun}s under way right now.`} />
          <ListingGrid items={live} getKey={getKey} render={render} />
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="listing-upcoming" className="space-y-6">
          <SectionHeading icon={icon} title={<span id="listing-upcoming">Upcoming {noun}s ({upcoming.length})</span>} description={upcomingDescription} />
          <ListingGrid items={upcoming} getKey={getKey} render={render} />
        </section>
      )}

      {nothingAhead && <div>{empty}</div>}

      {past.length > 0 && (
        <section aria-labelledby="listing-past" className="space-y-6">
          <button
            type="button"
            onClick={() => setShowPast((open) => !open)}
            aria-expanded={showPast}
            aria-controls="listing-past-list"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-journey-text/10 bg-journey-surface/60 px-5 py-3 text-left transition hover:border-journey-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/70"
          >
            <span id="listing-past" className="font-display text-base font-bold text-journey-text">
              Past {noun}s <span className="font-normal text-journey-muted">({past.length})</span>
            </span>
            <ChevronDown className={`h-5 w-5 text-journey-muted transition-transform duration-300 ${showPast ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showPast && (
            <div id="listing-past-list">
              <ListingGrid items={past} getKey={getKey} render={render} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
