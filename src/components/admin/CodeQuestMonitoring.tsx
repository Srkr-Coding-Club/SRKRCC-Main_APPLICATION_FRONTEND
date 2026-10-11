'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlarmClock, Flame, RefreshCw, Target, Trophy } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type { CodeQuestStreakMonitoring } from '@/lib/types';
import { useIsDarkMode } from '@/lib/hooks/useIsDarkMode';

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

export function CodeQuestMonitoring() {
  const isDark = useIsDarkMode();
  const [data, setData] = useState<CodeQuestStreakMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchApi<CodeQuestStreakMonitoring>('/codequest/stats/admin-streaks/'));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#1A1A2E' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    fontSize: '12px',
  };

  const codingDistribution = useMemo(
    () => data?.coding.distribution ?? [],
    [data],
  );
  const potdHistory = useMemo(
    () =>
      (data?.potd_history ?? []).map((day) => ({
        date: shortDate(day.date),
        completions: day.completions,
      })),
    [data],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            Streak &amp; POTD monitoring
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Live streak health and daily problem completion.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
          aria-label="Refresh monitoring"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load monitoring data: {error}
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
            <MonitorCard
              icon={Flame}
              label="Live coding streaks"
              value={data.coding.active}
              sub="Members active today"
            />
            <MonitorCard
              icon={Target}
              label="Live POTD streaks"
              value={data.potd.active}
              sub="Members with a POTD streak"
            />
            <MonitorCard
              icon={Trophy}
              label="POTD today"
              value={`${data.potd_today.completions}`}
              sub={
                data.potd_today.problem_title
                  ? `${data.potd_today.problem_title} · ${data.potd_today.participants} attempted`
                  : 'No problem scheduled today'
              }
              tone="amber"
            />
            <MonitorCard
              icon={AlarmClock}
              label="At risk"
              value={data.at_risk.length}
              sub="Streaks yet to be extended today"
              tone={data.at_risk.length > 0 ? 'rose' : 'brand'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Flame className="h-4 w-4 text-[#FF7A00]" /> Coding streak distribution
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={codingDistribution} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Members" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-center text-[11px] text-slate-400">Days of active coding streak</p>
            </div>

            <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                <Target className="h-4 w-4 text-[#FF7A00]" /> POTD completions · last 14 days
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={potdHistory} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="completions" name="Completions" fill="#FFA500" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <LeaderBoard title="Longest live coding streaks" leaders={data.coding.top} accent="#FF7A00" />
            <LeaderBoard title="Longest live POTD streaks" leaders={data.potd.top} accent="#FFA500" />
            <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
                  <AlarmClock className="h-4 w-4 text-rose-500" /> Streaks at risk
                </h3>
              </div>
              {data.at_risk.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No streaks are at risk today.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.at_risk.slice(0, 8).map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Last active {member.last_active_date ?? '—'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {member.current_streak}d
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

function LeaderBoard({
  title,
  leaders,
  accent,
}: {
  title: string;
  leaders: { id: number; name: string; current_streak: number; longest_streak: number }[];
  accent: string;
}) {
  return (
    <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <h3 className="font-bold text-[#1A1A2E] dark:text-white">{title}</h3>
      </div>
      {leaders.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">No live streaks yet.</p>
      ) : (
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {leaders.map((leader) => (
            <li key={leader.id} className="flex items-center justify-between gap-3 p-4">
              <p className="min-w-0 truncate text-sm font-bold text-[#1A1A2E] dark:text-white">
                {leader.name}
              </p>
              <span
                className="shrink-0 text-sm font-extrabold"
                style={{ color: accent }}
              >
                {leader.current_streak}d
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MonitorCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: typeof Flame;
  label: string;
  value: number | string;
  sub: string;
  tone?: 'brand' | 'amber' | 'rose';
}) {
  const toneClass = {
    brand: 'text-[#FF7A00]',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
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
