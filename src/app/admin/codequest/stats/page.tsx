'use client';

import { CodeQuestStats } from '@/components/admin/CodeQuestStats';

export const dynamic = 'force-dynamic';

export default function AdminCodeQuestStatsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] py-10 transition-colors duration-300 dark:bg-[#0D0E15]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <CodeQuestStats />
      </div>
    </div>
  );
}
