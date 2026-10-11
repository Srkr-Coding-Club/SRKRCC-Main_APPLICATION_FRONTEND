'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { CodeQuestAdminOverview } from '@/lib/types';
import { useIsDarkMode } from '@/lib/hooks/useIsDarkMode';

const RANGE_OPTIONS = [7, 30, 90] as const;

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: '#10b981',
  MEDIUM: '#FF7A00',
  HARD: '#8B2E3B',
};

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

export function CodeQuestOverview() {
  const isDark = useIsDarkMode();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<CodeQuestAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (range: number) => {
      setLoading(true);
      setError(null);
      try {
        const overview = await fetchApi<CodeQuestAdminOverview>(
          `/codequest/stats/admin-overview/?days=${range}`,
        );
        setData(overview);
      } catch (e) {
        setError(message(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#1A1A2E' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    fontSize: '12px',
  };
  const labelStyle = { color: isDark ? '#94a3b8' : '#475569', fontWeight: 600 };

  const dailyData = useMemo(
    () =>
      (data?.daily ?? []).map((point) => ({
        date: shortDate(point.date),
        submissions: point.submissions,
        accepted: point.accepted,
        active_users: point.active_users,
      })),
    [data],
  );

  const difficultyData = useMemo(
    () =>
      (['EASY', 'MEDIUM', 'HARD'] as const).map((key) => ({
        difficulty: key,
        problems: data?.by_difficulty[key].problems ?? 0,
        solved: data?.by_difficulty[key].solved ?? 0,
      })),
    [data],
  );

  const xpData = useMemo(
    () =>
      (data?.xp_distribution ?? []).map((point) => ({
        level: `L${point.level}`,
        users: point.users,
      })),
    [data],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            Club overview
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Club-wide CodeQuest engagement across every member.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  days === option
                    ? 'bg-[#FF7A00] text-white'
                    : 'text-slate-500 hover:text-[#FF7A00]'
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(days)}
            disabled={loading}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
            aria-label="Refresh overview"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load the overview: {error}
        </div>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl glass-panel"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewCard
              icon={Users}
              label="Participants"
              value={data.totals.participants_total}
              sub={`${data.range_totals.active_users} active in ${days}d`}
            />
            <OverviewCard
              icon={Activity}
              label="Submissions"
              value={data.totals.submissions_total}
              sub={`${data.range_totals.submissions} in ${days}d`}
            />
            <OverviewCard
              icon={Clock3}
              label="Pending review"
              value={data.totals.submissions_pending}
              sub="Awaiting a verdict"
              tone="amber"
            />
            <OverviewCard
              icon={CheckCircle2}
              label="Acceptance rate"
              value={`${data.totals.acceptance_rate}%`}
              sub={`${data.totals.submissions_accepted} accepted`}
              tone="emerald"
            />
            <OverviewCard
              icon={Trophy}
              label="XP awarded"
              value={data.totals.xp_awarded_total}
              sub="Lifetime, all members"
            />
            <OverviewCard
              icon={Flame}
              label="Active streaks"
              value={data.totals.active_streaks}
              sub="Members with a live streak"
            />
            <OverviewCard
              icon={Star}
              label="POTD completions"
              value={data.totals.potd_completed_total}
              sub={`${data.range_totals.potd_completed} in ${days}d`}
            />
            <OverviewCard
              icon={BarChart3}
              label="Problems scheduled"
              value={data.totals.problems_total}
              sub={`${data.totals.problems_upcoming} upcoming`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Activity className="h-4 w-4 text-[#FF7A00]" /> Submissions over time
              </h3>
              {dailyData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cqAdminAccepted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#8B2E3B" fillOpacity={0} strokeWidth={2} />
                    <Area type="monotone" dataKey="accepted" name="Accepted" stroke="#FF7A00" fill="url(#cqAdminAccepted)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Users className="h-4 w-4 text-[#FF7A00]" /> Active members per day
              </h3>
              {dailyData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Bar dataKey="active_users" name="Active members" fill="#FFA500" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Problems by difficulty
              </h3>
              {difficultyData.every((entry) => entry.problems === 0 && entry.solved === 0) ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={difficultyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="difficulty" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="problems" name="Problems" fill={isDark ? '#334155' : '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="solved" name="Distinct solves" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {difficultyData.map((entry) => (
                        <Cell key={entry.difficulty} fill={DIFFICULTY_COLORS[entry.difficulty]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Star className="h-4 w-4 text-[#FFA500]" /> Members per level
              </h3>
              {xpData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No XP has been awarded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={xpData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="level" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Bar dataKey="users" name="Members" fill="#FFA500" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                  <Clock3 className="h-4 w-4 text-amber-500" /> Awaiting review
                </h3>
              </div>
              {data.pending_queue.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  Nothing is waiting for review.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.pending_queue.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                          {item.problem_title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.user_name} · {item.language} · {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        PENDING
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                  <Activity className="h-4 w-4 text-[#FF7A00]" /> Recent submissions
                </h3>
              </div>
              {data.recent_submissions.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No submissions have been received yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recent_submissions.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                          {item.problem_title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.user_name} · {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                          item.is_correct
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : item.is_reviewed
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        {item.is_correct ? 'ACCEPTED' : item.is_reviewed ? 'INCORRECT' : 'PENDING'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  sub: string;
  tone?: 'brand' | 'amber' | 'emerald';
}) {
  const toneClass = {
    brand: 'text-[#FF7A00]',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  }[tone];
  return (
    <div className="rounded-xl glass-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${toneClass}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{sub}</p>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      No activity in the selected range.
    </div>
  );
}
