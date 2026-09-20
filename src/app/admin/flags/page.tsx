'use client';

import { FlagsTab } from '@/components/admin/FlagsTab';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminFlagsPage() {
  // This page only renders feature-flag toggles, so scope the shared admin
  // data hook to flags — it would otherwise also fetch the full user list,
  // all forms, all audit logs, and all submissions on mount and every poll.
  const { flags, handleToggleFlag, isLoadingFlags } = useAdminData({ include: ['flags'] });

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <FlagsTab flags={flags} onToggleFlag={handleToggleFlag} isLoading={isLoadingFlags} />
      </div>
    </div>
  );
}
