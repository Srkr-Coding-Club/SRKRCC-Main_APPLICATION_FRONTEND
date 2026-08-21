'use client';

import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminAuditLogsPage() {
  const { auditLogs, isLoadingAuditLogs } = useAdminData();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AuditLogsTab filteredAuditLogs={auditLogs} isLoading={isLoadingAuditLogs} />
      </div>
    </div>
  );
}
