import React from 'react';

/* Loading placeholders. Every one uses the shared .skeleton shimmer (globals.css), so the app   */
/* shows one kind of "something is coming". Shapes mirror the real content so the layout does   */
/* not move when the content arrives. Server-safe: no hooks, usable from loading.tsx.           */

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

/** A card shaped like EventCard / HackathonCard: cover, title lines, a button. */
export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 rounded-[22px] border border-journey-text/10 bg-journey-surface/60 p-2">
      <Skeleton className="aspect-[16/10] rounded-2xl" />
      <div className="space-y-2.5 px-3 pb-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-3 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

/** The page hero block (icon pill, title, description) every listing page opens with. */
export function HeroSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <Skeleton className="h-7 w-56 rounded-full" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-4 w-2/3 max-w-xl" />
    </div>
  );
}

/** Hero plus a card grid: the shape of the events, hackathons and most listing pages. */
export function ListingPageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="min-h-screen bg-[var(--background)] py-12">
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <HeroSkeleton />
        <Skeleton className="h-6 w-44" />
        <CardGridSkeleton count={cards} />
      </div>
    </div>
  );
}

/** Rows for a table body, so it keeps its height while the first load is under way. */
export function TableRowsSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-journey-text/10 overflow-hidden rounded-xl border border-journey-text/10">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton key={col} className={`h-3.5 ${col === 0 ? 'w-1/4' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A stack of list rows (avatar and two lines), for notifications, teams and similar. */
export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The event and hackathon detail pages: a wide cover, a title block, then body copy beside a side panel. */
export function DetailPageSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="aspect-[21/9] w-full rounded-3xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-10 w-full max-w-2xl" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {[100, 95, 90, 98, 70].map((w, i) => <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />)}
        </div>
        <div className="space-y-3 rounded-2xl border border-journey-text/10 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="mt-2 h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
