'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CardShowcase from '@/components/ui/BounceCards';
import EventCard from '@/components/EventCard';
import EventDetailsStack from '@/components/events/EventDetailsStack';
import StackDetailsDialog from '@/components/ui/StackDetailsDialog';
import type { Event } from '@/lib/types';

export default function EventsBrowser({ events }: { events: Event[] }) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const closeDetails = useCallback(() => setSelectedEvent(null), []);
  const eventCards = useMemo(
    () =>
      events.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          accent="#FF7A00"
          index={index}
          onDetailsClick={() => setSelectedEvent(event)}
        />
      )),
    [events],
  );

  return (
    <>
      <CardShowcase layout="bounce-stack" cards={eventCards} />
      <AnimatePresence>
        {selectedEvent && (
          <StackDetailsDialog
            key={selectedEvent.id}
            label="Event details"
            onClose={closeDetails}
          >
            <EventDetailsStack events={events} initialEventId={selectedEvent.id} />
          </StackDetailsDialog>
        )}
      </AnimatePresence>
    </>
  );
}
