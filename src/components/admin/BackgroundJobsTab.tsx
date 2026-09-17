'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';

type JobType = 'email' | 'export' | 'member_import' | 'backup_import';
type StatusGroup = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

interface BackgroundJobCreatedBy {
  id: number;
  name: string;
  email: string;
}

interface BackgroundJob {
  id: string;
  type: JobType;
  type_label: string;
  title: string;
  status: string;
  status_group: StatusGroup;
  created_at: string;
  completed_at: string | null;
  created_by: BackgroundJobCreatedBy | null;
  summary: Record<string, number | string>;
  error_message: string;
}

interface BackgroundJobsResponse {
  results: BackgroundJob[];
  count: number;
  stats: Record<string, number>;
}

const POLL_INTERVAL_MS = 5000;

const TYPE_FILTERS: { value: 'ALL' | JobType; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'email', label: 'Bulk Email' },
  { value: 'export', label: 'Data Export' },
  { value: 'member_import', label: 'Member Import' },
  { value: 'backup_import', label: 'Backup Import' },
];

const STATUS_FILTERS: { value: 'ALL' | StatusGroup; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'FAILED', label: 'Failed' },
];

const TYPE_BADGE: Record<JobType, string> = {
  email: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  export: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  member_import: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  backup_import: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
};

const STATUS_GROUP_BADGE: Record<StatusGroup, string> = {
  PENDING: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/40',
  RUNNING: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  SUCCESS: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  PARTIAL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  FAILED: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
};

const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
};

const STAT_CARD_ORDER: StatusGroup[] = ['PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'];

const STAT_CARD_ICON: Record<StatusGroup, React.ElementType> = {
  PENDING: Clock,
  RUNNING: Loader2,
  SUCCESS: CheckCircle,
  PARTIAL: AlertTriangle,
  FAILED: XCircle,
};

const STAT_CARD_ACCENT: Record<StatusGroup, string> = {
  PENDING: 'text-slate-500 dark:text-slate-400',
  RUNNING: 'text-blue-400',
  SUCCESS: 'text-emerald-400',
  PARTIAL: 'text-amber-400',
  FAILED: 'text-rose-400',
};

// Summary fields already rendered inline in the table's Summary column, keyed
// by job type — everything else in `summary` is shown in the expanded row.
const INLINE_SUMMARY_KEYS: Record<JobType, string[]> = {
  email: ['total', 'sent', 'failed'],
  export: ['rows', 'format'],
  member_import: ['new_users', 'updated_users', 'conflict_rows'],
  backup_import: ['inserted', 'updated', 'conflict_records'],
};

function formatNumber(value: number | string): string {
  return typeof value === 'number' ? value.toLocaleString('en-IN') : String(value);
}

function formatSummaryInline(job: BackgroundJob): string {
  const s = job.summary || {};
  switch (job.type) {
    case 'email': {
      const total = Number(s.total ?? 0);
      const sent = Number(s.sent ?? 0);
      const failed = Number(s.failed ?? 0);
      return failed > 0 ? `${sent}/${total} sent · ${failed} failed` : `${sent}/${total} sent`;
    }
    case 'export': {
      const rows = formatNumber(s.rows ?? 0);
      const format = s.format ? String(s.format).toUpperCase() : '';
      return format ? `${rows} rows · ${format}` : `${rows} rows`;
    }
    case 'member_import': {
      const newUsers = formatNumber(s.new_users ?? 0);
      const updatedUsers = formatNumber(s.updated_users ?? 0);
      const conflicts = Number(s.conflict_rows ?? 0);
      return conflicts > 0
        ? `${newUsers} new / ${updatedUsers} updated · ${conflicts} conflicts`
        : `${newUsers} new / ${updatedUsers} updated`;
    }
    case 'backup_import': {
      const inserted = formatNumber(s.inserted ?? 0);
      const updated = formatNumber(s.updated ?? 0);
      const conflicts = Number(s.conflict_records ?? 0);
      return conflicts > 0
        ? `${inserted} inserted / ${updated} updated · ${conflicts} conflicts`
        : `${inserted} inserted / ${updated} updated`;
    }
    default:
      return '—';
  }
}

function formatFieldKey(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getRemainingSummaryEntries(job: BackgroundJob): [string, number | string][] {
  const shown = new Set(INLINE_SUMMARY_KEYS[job.type] || []);
  return Object.entries(job.summary || {}).filter(([key]) => !shown.has(key));
}

function TypeBadge({ type, label }: { type: JobType; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
        TYPE_BADGE[type] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-400'
      }`}
    >
      {label}
    </span>
  );
}

function StatusBadge({ statusGroup, status }: { statusGroup: StatusGroup; status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
        STATUS_GROUP_BADGE[statusGroup] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-400'
      }`}
      title={status}
    >
      {statusGroup === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {STATUS_GROUP_LABEL[statusGroup] || status}
    </span>
  );
}

function JobStatCard({ statusGroup, value }: { statusGroup: StatusGroup; value: number }) {
  const Icon = STAT_CARD_ICON[statusGroup];
  const accent = STAT_CARD_ACCENT[statusGroup];
  return (
    <div className="relative rounded-xl border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-[#151722] p-5 flex flex-col gap-2 transition-all">
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
          {STATUS_GROUP_LABEL[statusGroup]}
        </span>
        <Icon className={`w-4 h-4 flex-shrink-0 ${accent} ${statusGroup === 'RUNNING' ? 'animate-spin' : ''}`} />
      </div>
      <div className={`text-3xl font-black font-mono tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

export function BackgroundJobsTab() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | JobType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusGroup>('ALL');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const params = new URLSearchParams();
        if (typeFilter !== 'ALL') params.set('type', typeFilter);
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        const qs = params.toString();
        const res = await fetchApi<BackgroundJobsResponse>(`/admin/jobs/${qs ? `?${qs}` : ''}`);
        setJobs(res.results);
        setStats(res.stats || {});
      } catch (err) {
        if (!silent) {
          const message = 'Could not load background jobs. Is the backend running?';
          setError(message);
          toast.error('Failed to Load', message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [typeFilter, statusFilter, toast]
  );

  useEffect(() => {
    fetchJobs(false);
  }, [fetchJobs]);

  const hasActiveJobs = useMemo(
    () => jobs.some((j) => j.status_group === 'PENDING' || j.status_group === 'RUNNING'),
    [jobs]
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      fetchJobs(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasActiveJobs, fetchJobs]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.type_label.toLowerCase().includes(q) ||
        (j.created_by?.name || '').toLowerCase().includes(q) ||
        (j.created_by?.email || '').toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const presentStatGroups = STAT_CARD_ORDER.filter((g) => stats[g] !== undefined);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      {presentStatGroups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {presentStatGroups.map((g) => (
            <JobStatCard key={g} statusGroup={g} value={stats[g]} />
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">Background Jobs</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title, type, or creator…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | JobType)}
              className="px-3.5 py-2 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500 font-semibold"
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | StatusGroup)}
              className="px-3.5 py-2 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500 font-semibold"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => fetchJobs(false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-[#FAFAFC] dark:bg-[#0D0E15] text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Title</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Created At</th>
                <th className="px-6 py-4 font-bold">Created By</th>
                <th className="px-6 py-4 font-bold">Summary</th>
                <th className="px-6 py-4 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-40" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" /></td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {error}
                  </td>
                </tr>
              ) : visibleJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {jobs.length === 0 ? 'No background jobs yet.' : 'No jobs match your search.'}
                  </td>
                </tr>
              ) : (
                visibleJobs.map((job) => {
                  const isExpanded = expandedIds.has(job.id);
                  const remainingSummary = getRemainingSummaryEntries(job);
                  const hasError = job.error_message.trim().length > 0;
                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        onClick={() => toggleExpanded(job.id)}
                        className="cursor-pointer hover:bg-[#FAFAFC] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <TypeBadge type={job.type} label={job.type_label} />
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#1A1A2E] dark:text-white max-w-xs truncate">
                          {job.title}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge statusGroup={job.status_group} status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-xs font-mono whitespace-nowrap">
                          {new Date(job.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {job.created_by ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#1A1A2E] dark:text-white">{job.created_by.name}</span>
                              <span className="text-[11px] text-slate-500">{job.created_by.email}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{formatSummaryInline(job)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(job.id);
                            }}
                            className="text-slate-400 hover:text-orange-500 transition-colors"
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-[#FAFAFC] dark:bg-[#0D0E15]">
                            <div className="space-y-3">
                              {hasError && (
                                <div className="flex items-start gap-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-rose-600 dark:text-rose-300 break-words">{job.error_message}</p>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Completed:</span>{' '}
                                  <span className="font-semibold text-[#1A1A2E] dark:text-white">
                                    {job.completed_at
                                      ? new Date(job.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Raw status:</span>{' '}
                                  <span className="font-mono font-semibold text-[#1A1A2E] dark:text-white">{job.status}</span>
                                </div>
                              </div>
                              {remainingSummary.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {remainingSummary.map(([key, value]) => (
                                    <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{formatFieldKey(key)}</p>
                                      <p className="text-sm font-bold font-mono text-[#1A1A2E] dark:text-white">{formatNumber(value)}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
