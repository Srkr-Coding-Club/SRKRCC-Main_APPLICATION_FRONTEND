'use client';

import { Children, useRef, type ReactNode } from 'react';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';
import { riseIn } from '@/lib/entranceMotion';

const COLUMNS = 3;

function CardGridItem({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  // Stagger within a row only: a card in a later row starts the moment it scrolls into view.
  useScrollEntrance(ref, (timeline, element) => riseIn(timeline, element, { y: 24, duration: 0.65 }), {
    index: index % COLUMNS,
    start: 'top 92%',
  });
  return (
    <li ref={ref} className="h-full">
      {children}
    </li>
  );
}

/** Upright listing cards: one column on a phone, two on a tablet, three on a desktop, each rising in as it scrolls into view. */
export default function CardGrid({ cards }: { cards: ReactNode[] }) {
  return (
    <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {Children.toArray(cards).map((card, index) => (
        <CardGridItem key={(card as { key?: string }).key ?? index} index={index}>
          {card}
        </CardGridItem>
      ))}
    </ul>
  );
}
