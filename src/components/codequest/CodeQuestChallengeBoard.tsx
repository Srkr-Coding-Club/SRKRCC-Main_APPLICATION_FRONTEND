'use client';

import React, { useMemo } from 'react';
import { Code2, Target } from 'lucide-react';
import type { Problem } from '@/lib/types';
import Card from '@/components/Card';
import ProblemCard from '@/components/ProblemCard';
import SectionHeading from '@/components/SectionHeading';
import PotdCalendar from '@/components/codequest/PotdCalendar';

interface CodeQuestChallengeBoardProps {
  problems: Problem[];
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function CodeQuestChallengeBoard({ problems }: CodeQuestChallengeBoardProps) {
  const today = todayIso();

  const todayProblem = useMemo(
    () => problems.find((problem) => problem.scheduled_date === today) ?? null,
    [problems, today],
  );

  const previousProblems = useMemo(
    () =>
      problems
        .filter((problem) => problem.scheduled_date !== today)
        .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [problems, today],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <SectionHeading icon={Target} title="Today's problem" description="Solve it before midnight to keep your streak alive." />

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3" id={todayProblem ? `problem-${todayProblem.slug}` : undefined}>
            {todayProblem ? (
              <ProblemCard problem={todayProblem} highlight />
            ) : (
              <Card>
                <div className="py-10 text-center">
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white">No challenge scheduled for today</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    The next CodeQuest will appear here on its scheduled date.
                  </p>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <PotdCalendar problems={problems} className="h-full" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading icon={Code2} title="Previous problems" description="Revisit challenges from earlier days." />

        {previousProblems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {previousProblems.map((problem) => (
              <div key={problem.id} id={`problem-${problem.slug}`} className="scroll-mt-24">
                <ProblemCard problem={problem} compact />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <div className="py-8 text-center">
              <h3 className="font-bold text-[#1A1A2E] dark:text-white">No previous challenges yet</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Solved challenges are archived here the day after they unlock.
              </p>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
