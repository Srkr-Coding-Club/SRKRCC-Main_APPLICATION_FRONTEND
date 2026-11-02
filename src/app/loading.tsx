import React from 'react';
import { ListingPageSkeleton } from '@/components/ui/Skeleton';
import { SlowNotice } from '@/components/ui/SlowNotice';

// Shown while any page without its own loading.tsx is on its way: the shape of a listing page,
// with a message at the bottom if the wait gets long.
export default function RootLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <ListingPageSkeleton />
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md justify-center">
        <SlowNotice className="pointer-events-auto" />
      </div>
    </div>
  );
}
