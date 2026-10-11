'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Info, RefreshCw, Star } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type {
  CodeQuestAdminBadge,
  CodeQuestAdminGamification,
} from '@/lib/types';

const CATEGORY_LABELS: Record<CodeQuestAdminBadge['category'], string> = {
  SOLVING: 'Problem Solving',
  CONSISTENCY: 'Consistency',
  POTD: 'Problem of the Day',
  DIFFICULTY: 'Difficulty Milestones',
  XP_LEVEL: 'XP & Levels',
};

const CONFIG_LABELS: Record<string, string> = {
  XP_EASY: 'XP · Easy solve',
  XP_MEDIUM: 'XP · Medium solve',
  XP_HARD: 'XP · Hard solve',
  XP_POTD_BONUS: 'XP · POTD bonus',
  GOAL_DAILY_PROBLEMS: 'Daily goal (problems)',
  GOAL_WEEKLY_PROBLEMS: 'Weekly goal (problems)',
  LEADERBOARD_SIZE: 'Leaderboard size',
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

export function CodeQuestGamification() {
  const [data, setData] = useState<CodeQuestAdminGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchApi<CodeQuestAdminGamification>(
          '/codequest/stats/admin-gamification/',
        ),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = (data?.badges ?? []).reduce<
    Record<string, CodeQuestAdminBadge[]>
  >((groups, badge) => {
    (groups[badge.category] ??= []).push(badge);
    return groups;
  }, {});

  const configEntries = Object.entries(data?.config ?? {}).filter(
    ([key, value]) => key in CONFIG_LABELS && Array.isArray(value) === false,
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            XP &amp; badge catalogue
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Scoring rules and every badge members can unlock.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
          aria-label="Refresh gamification"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load the catalogue: {error}
        </div>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl glass-panel" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
            <p>
              XP and badges are awarded only by the server review flow — accepting
              a solution writes the immutable XP ledger. These values are
              configuration and cannot be edited from this screen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {configEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl glass-panel p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {CONFIG_LABELS[key]}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {Object.entries(grouped).map(([category, badges]) => (
              <div
                key={category}
                className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                  <Star className="h-4 w-4 text-[#FFA500]" />
                  <h3 className="font-bold text-[#1A1A2E] dark:text-white">
                    {CATEGORY_LABELS[category as CodeQuestAdminBadge['category']] ?? category}
                  </h3>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {badges.map((badge) => (
                    <li
                      key={badge.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF4EA] dark:bg-[#FF7A00]/10">
                          <Award className="h-4 w-4 text-[#FF7A00]" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                            {badge.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-extrabold text-[#FF7A00]">
                          {badge.earned_count}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          earned
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
