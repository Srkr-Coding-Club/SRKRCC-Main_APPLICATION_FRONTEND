'use client';

import { AuditLogsTab } from '@/components/admin/AuditLogsTab';

export const dynamic = 'force-dynamic';

export default function AdminAuditLogsPage() {
  // The tab fetches its own page of logs, so this page doesn't pull in the shared
  // admin data (users, forms, flags, submissions) that the other admin pages need.
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AuditLogsTab />
      </div>
    </div>
  );
}
