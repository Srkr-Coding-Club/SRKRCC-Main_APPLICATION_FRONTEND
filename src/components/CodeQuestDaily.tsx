'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, ChevronDown, ExternalLink, History, Star } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { isAuthenticated, subscribeToAuthResync } from '@/lib/auth';
import type { CodeQuestSubmission, Problem } from '@/lib/types';
import Card from '@/components/Card';
import CodeQuestCalendar from '@/components/CodeQuestCalendar';
import SectionHeading from '@/components/SectionHeading';

type Difficulty = Problem['difficulty'];

const MAX_PREVIOUS_PROBLEMS = 5;

function formatMonthDay(dateId: string): string {
  const [year, month, day] = dateId.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface CodeQuestDailyProps {
  problems: Problem[];
  today: string;
}

const DIFFICULTY_CHIP_CLASS: Record<Problem['difficulty'], string> = {
  EASY: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  HARD: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
};

export default function CodeQuestDaily({ problems, today }: CodeQuestDailyProps) {
  const [solvedDates, setSolvedDates] = useState<ReadonlySet<string>>(() => new Set());
  const [solvedLoading, setSolvedLoading] = useState(true);
  const [solvedError, setSolvedError] = useState(false);
  const [showAllPrevious, setShowAllPrevious] = useState(false);

  const loadSolved = useCallback(async () => {
    if (!isAuthenticated()) {
      setSolvedLoading(false);
      return;
    }
    try {
      const submissions = await fetchApi<CodeQuestSubmission[]>('/codequest/submissions/');
      const solved = new Set<string>();
      for (const submission of submissions) {
        if (submission.is_correct && submission.scheduled_date) {
          solved.add(submission.scheduled_date);
        }
      }
      setSolvedDates(solved);
      setSolvedError(false);
    } catch {
      setSolvedError(true);
    } finally {
      setSolvedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSolved();
    return subscribeToAuthResync(() => {
      if (isAuthenticated()) void loadSolved();
    });
  }, [loadSolved]);

  const problemOfTheDay = problems.find((problem) => problem.scheduled_date === today) ?? null;
  const previousProblems = problems
    .filter((problem) => problem.scheduled_date !== today)
    .slice(0, MAX_PREVIOUS_PROBLEMS);

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
      <section id="codequest-recent" className="scroll-mt-24 space-y-6 lg:col-span-2">
        {problemOfTheDay ? (
          <section className="relative overflow-hidden rounded-2xl glass-panel p-5 sm:p-6">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 bg-[#FF7A00]"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Star className="h-3 w-3 fill-white" /> Problem of the Day
              </p>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-[#FF7A00]" />
                {new Date(`${problemOfTheDay.scheduled_date}T00:00:00`).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-[#1A1A2E] dark:text-white sm:text-2xl">
              {problemOfTheDay.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${DIFFICULTY_CHIP_CLASS[problemOfTheDay.difficulty]}`}
              >
                {problemOfTheDay.difficulty}
              </span>
              {solvedDates.has(problemOfTheDay.scheduled_date) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Solved
                </span>
              )}
            </div>
            {problemOfTheDay.tags && problemOfTheDay.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {problemOfTheDay.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-orange-500/15 bg-orange-500/[0.06] px-2 py-0.5 text-[11px] font-mono text-orange-800 dark:border-orange-400/15 dark:bg-orange-400/[0.08] dark:text-orange-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {problemOfTheDay.external_url ? (
                <a
                  href={problemOfTheDay.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-lg bg-[#FF7A00] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#E06B00]"
                >
                  <span className="min-w-0 truncate">
                    Solve on {problemOfTheDay.external_platform || 'External Judge'}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  No solving link yet
                </span>
              )}
            </div>
          </section>
        ) : (
          <Card>
            <div className="py-8 text-center">
              <h2 className="font-bold text-[#1A1A2E] dark:text-white">
                No challenge scheduled for today
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Today's problem will appear here on its scheduled date.
              </p>
            </div>
          </Card>
        )}

        {previousProblems.length > 0 && (
          <section className="space-y-4">
            <SectionHeading
              icon={History}
              title="Previous problems"
              description="Challenges from earlier days stay listed here."
            />
            <Card>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {previousProblems
                  .slice(0, showAllPrevious ? undefined : MAX_PREVIOUS_PROBLEMS)
                  .map((problem) => {
                    const isSolved = solvedDates.has(problem.scheduled_date);
                    return (
                      <li
                        key={problem.id}
                        className="group flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div className="w-16 shrink-0 sm:w-24">
                          <p className="text-xs font-bold uppercase tracking-wide text-[#1A1A2E] dark:text-white">
                            {formatMonthDay(problem.scheduled_date)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {problem.scheduled_date}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            title={problem.title}
                            className="truncate text-sm font-semibold text-[#1A1A2E] dark:text-white"
                          >
                            {problem.title}
                          </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${DIFFICULTY_CHIP_CLASS[problem.difficulty]}`}
                          >
                            {problem.difficulty}
                          </span>
                          {isSolved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                              <Check className="h-3 w-3" aria-hidden="true" />
                              Solved
                            </span>
                          )}
                        </div>
                      </div>
                      {problem.external_url ? (
                        <a
                          href={problem.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF7A00]/40 hover:bg-orange-500/5 hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-300"
                        >
                          Solve
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                          No solving link yet
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
            {previousProblems.length > MAX_PREVIOUS_PROBLEMS && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowAllPrevious((visible) => !visible)}
                  aria-expanded={showAllPrevious}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#FF7A00]/40 hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-300"
                >
                  {showAllPrevious
                    ? 'Show fewer'
                    : `Show all ${previousProblems.length} previous problems`}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showAllPrevious ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            )}
          </section>
        )}
      </section>

      <aside className="mx-auto w-full max-w-sm lg:col-span-1 lg:mx-0 lg:max-w-none lg:sticky lg:top-24">
        <CodeQuestCalendar
          problems={problems}
          today={today}
          solvedDates={solvedDates}
          solvedLoading={solvedLoading}
          solvedError={solvedError}
        />
      </aside>
    </div>
  );
}