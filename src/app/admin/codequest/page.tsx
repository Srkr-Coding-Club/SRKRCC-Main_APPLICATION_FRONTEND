'use client';

import { CodeQuestTab } from '@/components/admin/CodeQuestTab';

export const dynamic = 'force-dynamic';

export default function AdminCodeQuestPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] py-10 transition-colors duration-300 dark:bg-[#0D0E15]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <CodeQuestTab />
      </div>
    </div>
  );
}
