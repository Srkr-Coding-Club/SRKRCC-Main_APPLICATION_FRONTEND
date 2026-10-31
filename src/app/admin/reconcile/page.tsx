'use client';

import { Suspense } from 'react';
import { ReconcileWorkspace } from '@/components/admin/reconcile/ReconcileWorkspace';

export const dynamic = 'force-dynamic';

export default function AdminReconcilePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Suspense fallback={null}>
          <ReconcileWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
