'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CodeQuestAnalytics } from '@/components/admin/CodeQuestAnalytics';

export const dynamic = 'force-dynamic';

export default function AdminCodeQuestAnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] py-10 transition-colors duration-300 dark:bg-[#0D0E15]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/admin/codequest"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF7A00]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to CodeQuest
        </Link>
        <CodeQuestAnalytics />
      </div>
    </div>
  );
}
