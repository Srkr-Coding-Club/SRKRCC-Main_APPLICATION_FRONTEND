'use client';

import { MaintenanceTab } from '@/components/admin/MaintenanceTab';

export const dynamic = 'force-dynamic';

export default function AdminMaintenancePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <MaintenanceTab />
      </div>
    </div>
  );
}
