import React from 'react';
import { DetailPageSkeleton } from '@/components/ui/Skeleton';
import { SlowNotice } from '@/components/ui/SlowNotice';

export default function DetailLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <DetailPageSkeleton />
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md justify-center">
        <SlowNotice className="pointer-events-auto" />
      </div>
    </div>
  );
}
