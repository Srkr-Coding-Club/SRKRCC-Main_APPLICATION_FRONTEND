import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  PieChart,
  Users,
  UserCheck,
  Trophy,
  FileText,
  RefreshCw,
  Inbox,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Form } from '@/lib/types';
import { UserRecord } from '@/lib/hooks/useAdminData';

interface DashboardTabProps {
  userCount: number;
  users: UserRecord[];
  publishedForms: Form[];
  formSubmissions: Array<{ id: number; submitterName: string; formTitle: string; submittedAt: string }>;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const BRANCH_GROUPS: Record<string, string> = {
  CSE: 'CSE',
  IT: 'IT',
  AIML: 'AI/ML & Allied',
  AIDS: 'AI/ML & Allied',
  CIC: 'AI/ML & Allied',
  CSBS: 'AI/ML & Allied',
  CSIT: 'AI/ML & Allied',
  CSD: 'AI/ML & Allied',
  ECE: 'ECE & EEE',
  EEE: 'ECE & EEE',
  MECH: 'Mech & Civil',
  CIVIL: 'Mech & Civil',
};

const BRANCH_GROUP_COLORS: Record<string, string> = {
  CSE: 'bg-[#FF7A00]',
  IT: 'bg-[#8B2E3B]',
  'AI/ML & Allied': 'bg-purple-600',
  'ECE & EEE': 'bg-amber-500',
  'Mech & Civil': 'bg-blue-500',
  Other: 'bg-slate-400',
};

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Builds the last 6 calendar months (oldest first, current month last) as {key, label} pairs. */
function lastSixMonths(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
    });
  }
  return months;
}

export function DashboardTab({
  userCount,
  users,
  publishedForms,
  formSubmissions,
  isLoading = false,
  onRefresh,
}: DashboardTabProps) {
  const totalSubmissions =
    formSubmissions.length > 0
      ? formSubmissions.length
      : publishedForms.reduce((acc, f) => acc + (f.response_count || 0), 0);

  const publishedCount = publishedForms.filter((f) => f.status === 'PUBLISHED').length;
  const scheduledCount = publishedForms.filter((f) => f.status === 'SCHEDULED').length;

  // --- "Last synced at" feedback — fires whenever isLoading transitions
  // true -> false, which only happens on an explicit Sync Now click (the
  // background poll in useAdminData runs silently and never touches
  // isLoading), not on every 8s poll tick.
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const wasLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) setLastSyncedAt(new Date());
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // --- Real monthly registrations trend, computed from actual join dates.
  const monthlyTrend = useMemo(() => {
    const buckets = lastSixMonths();
    const counts = buckets.map(({ key }) => {
      const [year, month] = key.split('-').map(Number);
      return users.filter((u) => {
        const joined = new Date(u.joinedDate);
        return joined.getFullYear() === year && joined.getMonth() === month;
      }).length;
    });
    const max = Math.max(1, ...counts);
    const lastCount = counts[counts.length - 1] ?? 0;
    const prevCount = counts[counts.length - 2] ?? 0;
    let growthLabel: string;
    let growthUp = true;
    if (prevCount === 0) {
      growthLabel = lastCount > 0 ? 'New' : '0%';
    } else {
      const pct = Math.round(((lastCount - prevCount) / prevCount) * 100);
      growthUp = pct >= 0;
      growthLabel = `${pct >= 0 ? '+' : ''}${pct}%`;
    }
    return {
      bars: buckets.map((b, i) => ({ month: b.label, count: counts[i], heightPct: Math.max(4, (counts[i] / max) * 100) })),
      growthLabel,
      growthUp,
    };
  }, [users]);

  // --- Real branch breakdown, grouped the same way the signup/admin branch
  // dropdowns group related specializations.
  const branchBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      const group = BRANCH_GROUPS[(u.branch || '').toUpperCase()] || 'Other';
      counts[group] = (counts[group] || 0) + 1;
    }
    const total = users.length || 1;
    return Object.entries(counts)
      .map(([group, count]) => ({
        branch: group,
        count,
        pct: Math.round((count / total) * 100),
        color: BRANCH_GROUP_COLORS[group] || BRANCH_GROUP_COLORS.Other,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [users]);

  const cardHoverClasses =
    'transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/70 dark:hover:shadow-black/30';

  return (
    <div className="space-y-8">
      {/* Live Sync Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800 dark:text-slate-200">Real-Time Data Feed Active</span>
          <span className="text-slate-400 font-mono hidden sm:inline">• Auto-syncing live submissions & forms</span>
        </div>

        {onRefresh && (
          <div className="flex items-center gap-3">
            {lastSyncedAt && !isLoading && (
              <span className="text-[11px] text-slate-400 font-mono">Last synced at {formatSyncTime(lastSyncedAt)}</span>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95 disabled:opacity-70"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Real-time Metric Snapshot Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className={`glass-panel p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between ${cardHoverClasses}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white mt-1">{userCount}</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-md bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`glass-panel p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between ${cardHoverClasses}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Live Forms</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {publishedCount}
              {scheduledCount > 0 && <span className="text-xs font-normal text-blue-400 ml-1.5">({scheduledCount} sched)</span>}
            </p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`glass-panel p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between ${cardHoverClasses}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Forms Schema</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#8B2E3B] dark:text-rose-400 mt-1">{publishedForms.length}</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 text-[#8B2E3B] dark:text-rose-400">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`glass-panel p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between ${cardHoverClasses}`}>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Submissions Recorded</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{totalSubmissions}</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Registrations Overview & Branch Breakdown Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#FF7A00]" />
              <span>Registrations Overview Trend (Monthly)</span>
            </h3>
            <span
              className={`text-xs font-mono font-bold flex items-center gap-1 ${
                monthlyTrend.growthUp ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {monthlyTrend.growthUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {monthlyTrend.growthLabel}
            </span>
          </div>

          <div className="h-48 pt-6 flex items-end justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            {monthlyTrend.bars.map((bar, i) => (
              <div
                key={bar.month}
                className="relative flex-1 flex flex-col items-center gap-2 h-full justify-end"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar((cur) => (cur === i ? null : cur))}
              >
                {hoveredBar === i && (
                  <div className="absolute -top-2 -translate-y-full px-2 py-1 rounded-md bg-[#1A1A2E] dark:bg-black text-white text-[11px] font-bold whitespace-nowrap shadow-lg z-10">
                    {bar.count} registration{bar.count === 1 ? '' : 's'}
                  </div>
                )}
                {/* Always-visible data label — resolves "can't tell the actual
                    numbers" without adding a full Y-axis to a chart this small. */}
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">{bar.count}</span>
                <div
                  style={{ height: `${bar.heightPct}%` }}
                  className={`w-full max-w-[40px] rounded-t bg-gradient-to-t from-[#8B2E3B] to-[#FF7A00] transition-opacity ${
                    hoveredBar === i ? 'opacity-100' : 'opacity-90'
                  }`}
                ></div>
                <span className="text-xs font-bold text-slate-500">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[#8B2E3B] dark:text-rose-400" />
            <span>Participant Branch Breakdown</span>
          </h3>

          <div className="space-y-3 pt-2">
            {branchBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No members registered yet.</p>
            ) : (
              branchBreakdown.map((item) => (
                <div key={item.branch} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#1A1A2E] dark:text-white">{item.branch}</span>
                    <span className="text-slate-500 font-mono">
                      {item.pct}% ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Streams: Recent Forms & Latest Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Recent Dynamic Forms</h3>
            <Link href="/admin/forms" className="text-xs font-bold text-[#FF7A00] hover:underline">
              Manage All →
            </Link>
          </div>
          <div className="space-y-3">
            {publishedForms.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No dynamic forms registered yet.</p>
              </div>
            ) : (
              publishedForms.slice(0, 5).map((pf) => (
                <div key={pf.id} className="p-3.5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white truncate">{pf.title}</p>
                    <p className="text-[11px] text-slate-500">Status: {pf.status} • {pf.response_count ?? 0} responses</p>
                  </div>
                  <Link href={`/forms/${pf.slug}`} target="_blank" className="text-xs font-bold text-[#FF7A00] hover:underline whitespace-nowrap">
                    View Live →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Latest Live Registrations</h3>
            <Link href="/admin/responses" className="text-xs font-bold text-[#FF7A00] hover:underline">
              View Responses →
            </Link>
          </div>
          <div className="space-y-3">
            {formSubmissions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>No recent student registrations received yet.</p>
              </div>
            ) : (
              formSubmissions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="p-3.5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white truncate">{sub.submitterName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{sub.formTitle} • {sub.submittedAt}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Recorded</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
