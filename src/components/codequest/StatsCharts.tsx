'use client';

import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Star } from 'lucide-react';
import type { CodeQuestAnalytics } from '@/lib/types';
import { useIsDarkMode } from '@/lib/hooks/useIsDarkMode';

interface StatsChartsProps {
  analytics: CodeQuestAnalytics;
}

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

export default function StatsCharts({ analytics }: StatsChartsProps) {
  const isDark = useIsDarkMode();
  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#1A1A2E' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    fontSize: '12px',
  };
  const labelStyle = { color: isDark ? '#94a3b8' : '#475569', fontWeight: 600 };

  const difficultyData = useMemo(
    () =>
      (['EASY', 'MEDIUM', 'HARD'] as const).map((key) => ({
        difficulty: key,
        solved: analytics.solved_by_difficulty[key],
      })),
    [analytics.solved_by_difficulty],
  );

  const dailyData = useMemo(
    () =>
      analytics.daily_series.map((point) => ({
        date: shortDate(point.date),
        submissions: point.submissions,
        accepted: point.accepted,
        solved: point.solved,
      })),
    [analytics.daily_series],
  );

  const weeklyData = useMemo(
    () =>
      analytics.weekly_series.map((point) => ({
        week: shortDate(point.week_start),
        submissions: point.submissions,
        accepted: point.accepted,
      })),
    [analytics.weekly_series],
  );

  const xpData = useMemo(
    () => analytics.xp_growth.map((point) => ({ date: shortDate(point.date), xp: point.lifetime_xp })),
    [analytics.xp_growth],
  );

  const potdWeekly = useMemo(() => {
    const bucket = new Map<string, { total: number; completed: number }>();
    for (const entry of analytics.potd_series) {
      const date = new Date(`${entry.date}T00:00:00`);
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      const current = bucket.get(key) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (entry.completed) current.completed += 1;
      bucket.set(key, current);
    }
    return Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, value]) => ({ week: shortDate(week), ...value }));
  }, [analytics.potd_series]);

  const acceptancePie = useMemo(
    () => [
      { name: 'Accepted', value: analytics.summary.accepted_submissions, color: '#10b981' },
      {
        name: 'Rejected',
        value: Math.max(0, analytics.summary.total_submissions - analytics.summary.accepted_submissions),
        color: isDark ? '#3f3f46' : '#e2e8f0',
      },
    ],
    [analytics.summary, isDark],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <LineChartIcon className="h-4 w-4 text-[#FF7A00]" /> Daily solving trend
          </h3>
          {dailyData.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cqAccepted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={{ color: '#FF7A00' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#8B2E3B" fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="accepted" name="Accepted" stroke="#FF7A00" fill="url(#cqAccepted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Weekly solving
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
                <Bar dataKey="submissions" name="Submissions" fill="#8B2E3B" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="accepted" name="Accepted" fill="#FF7A00" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> Problems solved by difficulty
          </h3>
          {analytics.summary.unique_solved === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={difficultyData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="difficulty" width={72} tick={{ fontSize: 11, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <Bar dataKey="solved" name="Solved" radius={[0, 4, 4, 0]} maxBarSize={28}>
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
            <Star className="h-4 w-4 text-[#FFA500]" /> XP growth
          </h3>
          {xpData.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={xpData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="cqXp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFA500" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#FFA500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={{ color: '#FFA500' }} />
                <Area type="monotone" dataKey="xp" name="Lifetime XP" stroke="#FFA500" fill="url(#cqXp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <BarChart3 className="h-4 w-4 text-[#FF7A00]" /> POTD completion trend
          </h3>
          {potdWeekly.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={potdWeekly} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisTextColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Scheduled" fill={isDark ? '#334155' : '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1A1A2E] dark:text-white">
            <PieChartIcon className="h-4 w-4 text-emerald-500" /> Acceptance rate
          </h3>
          {analytics.summary.total_submissions === 0 ? (
            <ChartEmpty />
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={acceptancePie} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95} startAngle={90} endAngle={-270}>
                    {acceptancePie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#1A1A2E] dark:text-white">{analytics.summary.acceptance_rate}%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {analytics.summary.accepted_submissions}/{analytics.summary.total_submissions}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

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
