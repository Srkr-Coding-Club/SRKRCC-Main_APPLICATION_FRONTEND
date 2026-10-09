import type { Metadata } from 'next';
import { Code2, Flame, Terminal } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { getCodeQuestToday } from '@/lib/codequest';
import { isModuleEnabled } from '@/lib/moduleFlags';
import type { Problem } from '@/lib/types';
import Card from '@/components/Card';
import CodeQuestDaily from '@/components/CodeQuestDaily';
import MidnightCountdown from '@/components/MidnightCountdown';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import PageHero from '@/components/PageHero';
import SectionHeading from '@/components/SectionHeading';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CodeQuest Daily Problem',
  description: 'Solve today\'s SRKR Coding Club CodeQuest challenge and build your daily coding streak.',
};

async function getTodayProblems(): Promise<{ problems: Problem[]; error: string | null }> {
  try {
    return { problems: await fetchApi<Problem[]>('/codequest/'), error: null };
  } catch (cause) {
    return {
      problems: [],
      error: cause instanceof Error ? cause.message : 'The CodeQuest API is unreachable.',
    };
  }
}

export default async function CodeQuestPage() {
  const enabled = await isModuleEnabled('codequest');
  if (!enabled) {
    return (
      <ModuleUnavailable
        moduleName="CodeQuest"
        icon={Terminal}
        description="Daily problems are paused right now. Check back once the next CodeQuest season opens."
      />
    );
  }

  const { problems, error } = await getTodayProblems();
  const today = getCodeQuestToday();

  return (
    <main className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <PageHero
          icon={<Terminal className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB CODEQUEST DAILY"
          title="Today's Coding Challenge"
          description="A new challenge unlocks at midnight. Solve today's problem, keep your streak alive, and return tomorrow for the next quest."
        />

        {!error && (
          <Card className="hover:-translate-y-0.5 motion-reduce:transform-none">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.06] p-3.5 text-[#FF7A00] transition-transform duration-500 ease-out group-hover:rotate-3 group-hover:scale-105 motion-reduce:transition-none">
                  <Flame className="h-7 w-7" strokeWidth={1.8} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Next CodeQuest unlocks in
                  </p>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">One challenge per day</h2>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/70 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors duration-300 group-hover:border-orange-500/20 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-300">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#FF7A00] motion-safe:animate-pulse"
                />
                <span className="font-mono tabular-nums">
                  <MidnightCountdown />
                </span>
              </div>
            </div>
          </Card>
        )}

        {error ? (
          <section className="space-y-6">
            <SectionHeading icon={Code2} title="Today's challenge and archive" />
            <Card>
              <div className="py-8 text-center">
                <h2 className="font-bold text-[#1A1A2E] dark:text-white">Couldn't load today's challenge</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {error} Refresh the page to try again.
                </p>
              </div>
            </Card>
          </section>
        ) : (
          <CodeQuestDaily problems={problems} today={today} />
        )}
      </div>
    </main>
  );
}