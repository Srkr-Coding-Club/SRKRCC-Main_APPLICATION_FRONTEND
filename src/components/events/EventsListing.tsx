'use client';

import { Calendar } from 'lucide-react';
import type { Event } from '@/lib/types';
import EventCard from '@/components/EventCard';
import PhasedListing from '@/components/ui/PhasedListing';

interface EventsListingProps {
  live: Event[];
  upcoming: Event[];
  past: Event[];
}

/** The events listing: on now, upcoming, and past ones kept out of the way. Every card opens that event's own page. */
export default function EventsListing({ live, upcoming, past }: EventsListingProps) {
  return (
    <PhasedListing
      icon={Calendar}
      noun="event"
      live={live}
      upcoming={upcoming}
      past={past}
      getKey={(event) => event.id}
      render={(event, index, layout) => <EventCard event={event} accent="#FF7A00" index={index} layout={layout} />}
      upcomingDescription="Workshops, seminars, and gatherings happening across campus."
      empty={
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-journey-text/10 py-14 text-center">
          <Calendar className="h-8 w-8 text-journey-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-journey-muted">No upcoming events right now.</p>
          <p className="text-xs text-journey-muted">New workshops and seminars are announced regularly. Past events are listed below.</p>
        </div>
      }
    />
  );
}
