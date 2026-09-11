'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { Event } from '@/lib/types';

interface EventsRowProps {
  title?: string;
  events: Event[];
  accent?: string;
}

const CARD_WIDTH = 300; // match EventCard's fixed w-[300px] width
const CARD_GAP = 20; // gap-5

export default function EventsRow({ title, events, accent = '#FF7A00' }: EventsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardsPerPage, setCardsPerPage] = useState(1);
  const [page, setPage] = useState(0);

  // Work out how many cards actually fit in the visible track width.
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const fit = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    setCardsPerPage(fit);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Reset to page 0 if the underlying event list changes (filter/refetch).
  useEffect(() => {
    setPage(0);
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(events.length / cardsPerPage));
  const canGoLeft = page > 0;
  const canGoRight = page < totalPages - 1;

  const visibleEvents = events.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  const goLeft = () => canGoLeft && setPage((p) => p - 1);
  const goRight = () => canGoRight && setPage((p) => p + 1);

 return (
  <div className="relative">
    {title && <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>}

    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label="Previous event"
        onClick={goLeft}
        disabled={!canGoLeft}
        className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 ${
          canGoLeft
            ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
            : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
        }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* measured track — width drives cardsPerPage */}
      <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
        <div className="flex justify-center gap-5">
          {visibleEvents.map((event, i) => (
            <EventCard key={`${page}-${event.id}`} event={event} accent={accent} index={i} />
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Next event"
        onClick={goRight}
        disabled={!canGoRight}
        className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 ${
          canGoRight
            ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
            : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
        }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  </div>
);
}