import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Terminal } from 'lucide-react';
import { isModuleEnabled } from '@/lib/moduleFlags';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import StatsDashboard from '@/components/codequest/StatsDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CodeQuest Stats & Achievements',
  description: 'Track your daily coding stats, streaks, XP, levels, badges, and activity heatmap for the SRKR Coding Club CodeQuest.',
};

export default async function CodeQuestStatsPage() {
  const enabled = await isModuleEnabled('codequest');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="CodeQuest"
        icon={Terminal}
        description="CodeQuest statistics are paused right now. Check back once the next CodeQuest season opens."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7A00]">
              <BarChart3 className="h-3.5 w-3.5" /> SRKR Coding Club · CodeQuest
            </span>
            <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white sm:text-3xl">
              CodeQuest Statistics
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Streaks, XP, badges and activity computed from your real submissions. Pick a day on the
              calendar to drill into the details.
            </p>
          </div>
          <Link
            href="/codequest"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF7A00] hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to today&apos;s challenge
          </Link>
        </div>

        <StatsDashboard />
      </div>
    </main>
  );
}
