'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EventsRowProps {
  title?: string;
  cards: ReactNode[];
}

const CARD_WIDTH = 300;
const CARD_GAP = 20;

export default function EventsRow({ title, cards }: EventsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardsPerPage, setCardsPerPage] = useState(1);
  const [page, setPage] = useState(0);

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

  useEffect(() => {
    setPage(0);
  }, [cards]);

  const totalPages = Math.max(1, Math.ceil(cards.length / cardsPerPage));
  const canGoLeft = page > 0;
  const canGoRight = page < totalPages - 1;

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages - 1));
  }, [totalPages]);

  const visibleCards = cards.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  const goLeft = () => canGoLeft && setPage((p) => p - 1);
  const goRight = () => canGoRight && setPage((p) => p + 1);

  return (
    <div className="relative">
      {title && <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>}

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous page"
          onClick={goLeft}
          disabled={!canGoLeft}
          className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
            canGoLeft
              ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
              : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
          <div className="flex justify-center gap-5">
            {visibleCards.map((card, index) => (
              <div key={`${page}-${index}`} className="w-full max-w-[300px] shrink-0">
                {card}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Next page"
          onClick={goRight}
          disabled={!canGoRight}
          className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
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