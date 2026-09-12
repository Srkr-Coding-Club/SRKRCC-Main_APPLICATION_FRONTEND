'use client';

import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminAuditLogsPage() {
  // This page only renders the audit log table, so scope the shared admin
  // data hook to audit logs — it would otherwise also fetch the full user
  // list, all forms, all flags, and all submissions on mount and every poll.
  const { auditLogs, isLoadingAuditLogs } = useAdminData({ include: ['audit'] });

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AuditLogsTab filteredAuditLogs={auditLogs} isLoading={isLoadingAuditLogs} />
      </div>
    </div>
  );
}
