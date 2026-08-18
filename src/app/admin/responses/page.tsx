'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResponsesViewerTab } from '@/components/admin/ResponsesViewerTab';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

function ResponsesViewerWithQuery() {
  const { publishedForms } = useAdminData();
  const searchParams = useSearchParams();
  const initialFormSlug = searchParams.get('form') || undefined;

  return <ResponsesViewerTab forms={publishedForms} initialFormSlug={initialFormSlug} />;
}

export default function AdminResponsesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Suspense fallback={null}>
          <ResponsesViewerWithQuery />
        </Suspense>
      </div>
    </div>
  );
}
