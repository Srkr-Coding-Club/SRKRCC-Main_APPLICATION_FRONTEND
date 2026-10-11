'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flame, RefreshCw, Search, Star, Trophy, X } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import type {
  CodeQuestMemberDetail,
  CodeQuestMemberDirectory,
  CodeQuestMemberSummary,
} from '@/lib/types';
import { useIsDarkMode } from '@/lib/hooks/useIsDarkMode';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'xp', label: 'Lifetime XP' },
  { value: 'solved', label: 'Problems solved' },
  { value: 'streak', label: 'Current streak' },
  { value: 'recent', label: 'Recently active' },
  { value: 'name', label: 'Name (A–Z)' },
];

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString() : 'No activity yet';

export function CodeQuestMembers() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('xp');
  const [data, setData] = useState<CodeQuestMemberDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CodeQuestMemberSummary | null>(null);

  const load = useCallback(
    async (query: string, order: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sort });
        if (query.trim()) params.set('q', search.trim());
        setData(
          await fetchApi<CodeQuestMemberDirectory>(
            `/codequest/stats/admin-members/?${params.toString()}`,
          ),
        );
        void search;
      } catch (e) {
        setError(message(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(search, sort), 300);
    return () => clearTimeout(timer);
  }, [search, sort, load]);

  return (
    <section className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
            Member directory
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Every CodeQuest participant with their live gamification snapshot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, club ID"
              className="w-56 rounded-lg border border-slate-200 bg-transparent py-2 pl-9 pr-3 text-sm dark:border-slate-700"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort members"
            className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700 dark:[color-scheme:dark]"
          >
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100"
              >
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void load(search, sort)}
            disabled={loading}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
            aria-label="Refresh members"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load members: {error}
        </div>
      ) : loading && !data ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.members.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">
          No CodeQuest participants match this view.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="px-5 py-3 font-bold">Member</th>
                <th className="px-3 py-3 font-bold">Level</th>
                <th className="px-3 py-3 font-bold">XP</th>
                <th className="px-3 py-3 font-bold">Solved</th>
                <th className="px-3 py-3 font-bold">Streak</th>
                <th className="px-3 py-3 font-bold">POTD</th>
                <th className="px-3 py-3 font-bold">Badges</th>
                <th className="px-5 py-3 font-bold">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.members.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => setSelected(member)}
                  className="cursor-pointer transition hover:bg-[#FFF4EA]/60 dark:hover:bg-[#FF7A00]/5"
                >
                  <td className="px-5 py-3">
                    <p className="font-bold text-[#1A1A2E] dark:text-white">
                      {member.name || member.email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.club_id || member.email}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-bold text-[#FF7A00]">L{member.level}</td>
                  <td className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">
                    {member.lifetime_xp}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{member.solved}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Flame className="h-3.5 w-3.5 text-[#FF7A00]" />
                      {member.current_streak}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {member.potd_completed}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                    {member.badges_earned}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {member.last_active
                      ? new Date(member.last_active).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <MemberDetail member={selected} close={() => setSelected(null)} />
      )}
    </section>
  );
}

function MemberDetail({
  member,
  close,
}: {
  member: CodeQuestMemberSummary;
  close: () => void;
}) {
  const isDark = useIsDarkMode();
  const [detail, setDetail] = useState<CodeQuestMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchApi<CodeQuestMemberDetail>(
      `/codequest/stats/${member.id}/member/?days=90`,
    )
      .then((payload) => {
        if (active) setDetail(payload);
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [member.id]);

  const series = useMemo(
    () =>
      (detail?.analytics.daily_series ?? []).map((point) => ({
        date: shortDate(point.date),
        accepted: point.accepted,
        submissions: point.submissions,
      })),
    [detail],
  );

  const gridColor = isDark ? '#1e293b' : '#E2E8F0';
  const axisTextColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    background: isDark ? '#1A1A2E' : '#FFFFFF',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: '8px',
    fontSize: '12px',
  };

  const overview = detail?.overview;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl glass-panel shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white">
              {member.name || member.email}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {member.club_id ? `${member.club_id} · ` : ''}
              {member.email} · {member.role}
            </p>
          </div>
          <button onClick={close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            Could not load member analytics: {error}
          </div>
        ) : loading || !overview ? (
          <div className="space-y-3 p-5">
            <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat icon={Star} label="Level" value={`L${overview.xp.level.level}`} />
              <MiniStat icon={Trophy} label="Lifetime XP" value={overview.xp.lifetime} />
              <MiniStat
                icon={Flame}
                label="Current streak"
                value={overview.streak.current}
              />
              <MiniStat icon={Star} label="Badges" value={overview.badges.total} />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-3 text-sm font-bold text-[#1A1A2E] dark:text-white">
                Last 90 days
              </h3>
              {series.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No submissions in the last 90 days.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={series} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberAccepted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF7A00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: axisTextColor }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: axisTextColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      name="Submissions"
                      stroke="#8B2E3B"
                      fillOpacity={0}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="accepted"
                      name="Accepted"
                      stroke="#FF7A00"
                      fill="url(#memberAccepted)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                <div
                  key={level}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {level}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[#1A1A2E] dark:text-white">
                    {detail.analytics.solved_by_difficulty[level]}
                  </p>
                  <p className="text-xs text-slate-500">solved</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <Icon className="mb-2 h-4 w-4 text-[#FF7A00]" />
      <p className="text-lg font-extrabold text-[#1A1A2E] dark:text-white">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}
