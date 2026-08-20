'use client';

import nextDynamic from 'next/dynamic';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { useAdminSubtabNav } from '@/lib/hooks/useAdminSubtabNav';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export const dynamic = 'force-dynamic';

const CSVIngestionTab = nextDynamic(
  () => import('@/components/admin/CSVIngestionTab').then((m) => m.CSVIngestionTab),
  {
    loading: () => <LoadingSkeleton rows={6} />,
    ssr: false,
  }
);

export default function AdminCsvIngestionPage() {
  const { publishedForms } = useAdminData();
  const switchSubtab = useAdminSubtabNav();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <CSVIngestionTab forms={publishedForms} onSwitchSubtab={switchSubtab} />
      </div>
    </div>
  );
}
