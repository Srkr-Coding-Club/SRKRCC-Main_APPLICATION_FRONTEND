'use client';

import type { ReactNode } from 'react';
import { CardGridItem } from '@/components/ui/CardGrid';

export type ListingLayout = 'card' | 'wide';

interface ListingGridProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  /** `wide` is asked for when one item stands alone: the card spreads out instead of sitting in a third of the row. */
  render: (item: T, index: number, layout: ListingLayout) => ReactNode;
}

/**
 * Listing cards that fit how many there are. Three or more fill a three-column grid; two share the middle of the row; a single
 * one is shown wide, poster beside the details, instead of a lone narrow card with empty space around it.
 */
export default function ListingGrid<T>({ items, getKey, render }: ListingGridProps<T>) {
  if (items.length === 0) return null;
  const layout: ListingLayout = items.length === 1 ? 'wide' : 'card';
  const width = items.length === 1 ? 'mx-auto max-w-5xl' : items.length === 2 ? 'mx-auto max-w-4xl' : '';
  const columns = items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <ul className={`grid items-stretch gap-5 sm:gap-6 ${columns} ${width}`} data-layout={layout} data-count={items.length}>
      {items.map((item, index) => (
        <CardGridItem key={getKey(item)} index={index % 3}>
          {render(item, index, layout)}
        </CardGridItem>
      ))}
    </ul>
  );
}
