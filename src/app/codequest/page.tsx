import type { Metadata } from 'next';
import { BarChart3, Terminal } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { isModuleEnabled } from '@/lib/moduleFlags';
import type { Problem } from '@/lib/types';
import Card from '@/components/Card';
import ModuleUnavailable from '@/components/ModuleUnavailable';
import PageHero from '@/components/PageHero';
import PillButton from '@/components/PillButton';
import CodeQuestChallengeBoard from '@/components/codequest/CodeQuestChallengeBoard';

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
    <main className="min-h-screen bg-[var(--background)] py-10 transition-colors duration-300">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
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
                <BarChart3 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Track your progress</p>
                <h2 className="text-base font-extrabold text-[#1A1A2E] dark:text-white sm:text-lg">Stats, streaks, XP &amp; badges</h2>
              </div>
            </div>
            <PillButton href="/codequest/stats" variant="solid" size="sm">
              View my stats
            </PillButton>
          </div>
        </Card>

        <CodeQuestChallengeBoard problems={problems} />
      </div>
    </main>
  );
}
