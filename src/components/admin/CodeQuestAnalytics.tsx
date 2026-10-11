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
  RefreshCw,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { CodeQuestAdminAnalytics } from '@/lib/types';
import { useIsDarkMode } from '@/lib/hooks/useIsDarkMode';

const RANGE_OPTIONS = [7, 30, 90, 180] as const;

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: '#10b981',
  MEDIUM: '#FF7A00',
  HARD: '#8B2E3B',
};

const toLocalIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

export function CodeQuestAnalytics() {
  const isDark = useIsDarkMode();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<CodeQuestAdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (range - 1));
      const payload = await fetchApi<CodeQuestAdminAnalytics>(
        `/codequest/stats/admin-analytics/?start=${toLocalIso(start)}&end=${toLocalIso(end)}`,
      );
      setData(payload);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
        solved: point.solved,
      })),
    [data],
  );

  const weeklyData = useMemo(
    () =>
      (data?.weekly ?? []).map((point) => ({
        week: point.week_start ? shortDate(point.week_start) : '',
        submissions: point.submissions,
        accepted: point.accepted,
      })),
    [data],
  );

  const difficultyData = useMemo(
    () =>
      (['EASY', 'MEDIUM', 'HARD'] as const).map((key) => ({
        difficulty: key,
        attempted: data?.by_difficulty[key].attempted ?? 0,
        accepted: data?.by_difficulty[key].accepted ?? 0,
        solved: data?.by_difficulty[key].solved ?? 0,
      })),
    [data],
  );

  const activeDelta =
    data && data.summary.previous_active_users > 0
      ? Math.round(
          ((data.summary.active_users - data.summary.previous_active_users) /
            data.summary.previous_active_users) *
            100,
        )
      : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            Club analytics
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Engagement, acceptance and difficulty trends across the club.
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
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load analytics: {error}
        </div>
      ) : loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl glass-panel" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnalyticsCard
              icon={Activity}
              label="Submissions"
              value={data.summary.submissions}
              sub={`${data.summary.unique_solved} distinct problems solved`}
            />
            <AnalyticsCard
              icon={CheckCircle2}
              label="Acceptance rate"
              value={`${data.summary.acceptance_rate}%`}
              sub={`${data.summary.accepted} accepted`}
              tone="emerald"
            />
            <AnalyticsCard
              icon={Users}
              label="Active members"
              value={data.summary.active_users}
              sub={
                activeDelta === null
                  ? `${data.summary.previous_active_users} in prior period`
                  : `${activeDelta >= 0 ? '+' : ''}${activeDelta}% vs prior period`
              }
            />
            <AnalyticsCard
              icon={Target}
              label="POTD completions"
              value={data.summary.potd_completed}
              sub={`${data.summary.potd_scheduled} scheduled problems`}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Activity className="h-4 w-4 text-[#FF7A00]" /> Daily activity
              </h3>
              {dailyData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsAccepted" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="accepted" name="Accepted" stroke="#FF7A00" fill="url(#analyticsAccepted)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Weekly submissions
              </h3>
              {weeklyData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weeklyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="submissions" name="Submissions" fill="#8B2E3B" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="accepted" name="Accepted" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Difficulty breakdown
              </h3>
              {difficultyData.every(
                (entry) => entry.attempted === 0 && entry.solved === 0,
              ) ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={difficultyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="difficulty" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="attempted" name="Attempts" fill={isDark ? '#334155' : '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="solved" name="Distinct solves" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {difficultyData.map((entry) => (
                        <Cell key={entry.difficulty} fill={DIFFICULTY_COLORS[entry.difficulty]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                  <Trophy className="h-4 w-4 text-[#FFA500]" /> Top solvers in range
                </h3>
              </div>
              {data.top_members.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No accepted solutions in this range.
                </p>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.top_members.map((member, index) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4EA] text-xs font-bold text-[#FF7A00] dark:bg-[#FF7A00]/10">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-[#1A1A2E] dark:text-white">
                          {member.name || 'Member'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">
                        {member.solved} solved
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function AnalyticsCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: typeof Activity;
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
      <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{value}</p>
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
