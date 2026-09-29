import type { Metadata } from 'next';
import { Code2, Flame, Terminal } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { isModuleEnabled } from '@/lib/moduleFlags';
import type { Problem } from '@/lib/types';
import Card from '@/components/Card';
import MidnightCountdown from '@/components/MidnightCountdown';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import PageHero from '@/components/PageHero';
import ProblemCard from '@/components/ProblemCard';
import SectionHeading from '@/components/SectionHeading';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CodeQuest Daily Problem',
  description: 'Solve today\'s SRKR Coding Club CodeQuest challenge and build your daily coding streak.',
};

async function getTodayProblems(): Promise<Problem[]> {
  try {
    return await fetchApi<Problem[]>('/codequest/');
  } catch {
    return [];
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

  // The backend returns today's problem plus the completed archive for public
  // callers. Admin and Club Lead users see the future scheduling calendar only
  // through /admin/codequest.
  const problems = await getTodayProblems();

  return (
    <main className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <PageHero
          icon={<Terminal className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB CODEQUEST DAILY"
          title="Today's Coding Challenge"
          description="A new challenge unlocks at midnight. Solve today's problem, keep your streak alive, and return tomorrow for the next quest."
        />

        <Card>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-50 p-3 text-[#FF7A00] dark:bg-orange-950/40">
                <Flame className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Next CodeQuest unlocks in</p>
                <h2 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white">One challenge per day</h2>
              </div>
            </div>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              <MidnightCountdown />
            </span>
          </div>
        </Card>

        <section className="space-y-6">
          <SectionHeading icon={Code2} title="Today's challenge and archive" />
          {problems.length > 0 ? (
            problems.map((problem) => <ProblemCard key={problem.id} problem={problem} />)
          ) : (
            <Card>
              <div className="py-8 text-center">
                <h2 className="font-bold text-[#1A1A2E] dark:text-white">No challenge scheduled for today</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  The next CodeQuest will appear here on its scheduled date.
                </p>
              </div>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
