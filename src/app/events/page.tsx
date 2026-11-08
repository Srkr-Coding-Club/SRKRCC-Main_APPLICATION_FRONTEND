import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Calendar } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import PageHero from '@/components/PageHero';
import EventsListing from '@/components/events/EventsListing';
import { splitByPhase } from '@/lib/eventListing';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import { CardGridSkeleton } from '@/components/ui/Skeleton';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Events & Workshops',
  description:
    'Join hands-on developer workshops, bootcamps, and technical tech-talks organized by the SRKR Coding Club.',
};

async function getEvents(): Promise<Event[]> {
  try {
    const fetched = await fetchApi<Event[]>('/events/', { next: { revalidate: 300 } } as RequestInit);
    return fetched || [];
  } catch (error) {
    return [];
  }
}

/** The list streams in after the page frame, so the heading is on screen while events load. */
async function EventsList() {
  const events = await getEvents();
  return (
    <>
        {events.length > 0 ? (
          <EventsListing {...splitByPhase(events, (event) => ({ start: event.start_time, end: event.end_time }))} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-journey-text/10 py-16 text-center">
            <Calendar className="h-8 w-8 text-journey-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-journey-muted">No events right now.</p>
            <p className="text-xs text-journey-muted">Check back soon. New workshops and seminars are announced regularly.</p>
          </div>
        )}
    </>
  );
}

export default async function EventsPage() {
  const enabled = await isModuleEnabled('events');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="Events"
        icon={Calendar}
        description="The events hub is paused right now. Check back once the next event window opens."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <PageHero
          icon={<Calendar className="h-4 w-4 text-journey-accent" />}
          eyebrow="SRKR CODING CLUB WORKSHOPS"
          title="Workshops & Tech Seminars"
          description="Explore upcoming technical workshops, expert guest seminars, competitive coding bootcamps, and official club gatherings."
        />

        <Suspense fallback={<div role="status" aria-busy="true" aria-label="Loading events"><CardGridSkeleton /></div>}>
          <EventsList />
        </Suspense>
      </div>
    </div>
  );
}