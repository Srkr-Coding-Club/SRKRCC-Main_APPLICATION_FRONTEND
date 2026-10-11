'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  FilePlus2,
  FileX2,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  CalendarPlus,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api-client';
import { downloadCodeQuestReport } from '@/lib/codequest-export';
import type { CodeQuestAuditEvent, CodeQuestReport } from '@/lib/types';

type Tone = 'created' | 'updated' | 'deleted' | 'review' | 'batch' | 'export';

const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  'codequest.problem_created': { label: 'Problem created', tone: 'created' },
  'codequest.problem_updated': { label: 'Problem updated', tone: 'updated' },
  'codequest.problem_deleted': { label: 'Problem deleted', tone: 'deleted' },
  'codequest.problems_batch_scheduled': { label: 'Problems batch scheduled', tone: 'batch' },
  'codequest.submission_reviewed': { label: 'Submission reviewed', tone: 'review' },
  'codequest.report_exported': { label: 'Report exported', tone: 'export' },
};

const TONE_CLASS: Record<Tone, string> = {
  created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  updated: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  deleted: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  review: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  batch: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  export: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const REPORTS: { dataset: CodeQuestReport; label: string }[] = [
  { dataset: 'members', label: 'Members' },
  { dataset: 'submissions', label: 'Submissions' },
  { dataset: 'problems', label: 'Problems' },
  { dataset: 'analytics', label: 'Analytics' },
];

const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

const actionLabel = (action: string) => ACTION_META[action]?.label ?? action;

const formatDetails = (details: Record<string, unknown>): string[] =>
  Object.entries(details).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}: ${value.length} item(s)`;
    if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
    return `${key}: ${String(value)}`;
  });

export function CodeQuestAudit() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CodeQuestAuditEvent[]>([]);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<CodeQuestReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(
        await fetchApi<CodeQuestAuditEvent[]>(
          '/audit/?action_prefix=codequest.&limit=100',
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

  const runExport = async (dataset: CodeQuestReport, label: string) => {
    setExporting(dataset);
    try {
      await downloadCodeQuestReport(dataset);
      toast.success('Export ready', `${label} CSV downloaded.`);
    } catch (e) {
      toast.error('Could not export', message(e));
    } finally {
      setExporting(null);
    }
  };

  const actions = useMemo(
    () => Array.from(new Set(events.map((event) => event.action))).sort(),
    [events],
  );
  const visible =
    actionFilter === 'ALL'
      ? events
      : events.filter((event) => event.action === actionFilter);

  return (
    <section className="space-y-4">
      <div className="glass-panel rounded-xl border border-slate-200 p-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              CSV reports
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Download a full club-wide dataset. Exports are recorded on the
              audit trail below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REPORTS.map(({ dataset, label }) => (
              <button
                key={dataset}
                type="button"
                onClick={() => void runExport(dataset, label)}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#FF7A00] hover:text-[#FF7A00] disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
              >
                <Download
                  className={`h-3.5 w-3.5 ${exporting === dataset ? 'animate-pulse' : ''}`}
                />
                {exporting === dataset ? 'Exporting…' : label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-[#1A1A2E] dark:text-white">
              Audit trail
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Every scheduling, review and export action recorded for CodeQuest.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:[color-scheme:dark]"
            >
              <option value="ALL" className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100">
                All actions
              </option>
              {Object.keys(ACTION_META).map((action) => (
                <option
                  key={action}
                  value={action}
                  className="bg-white text-slate-900 dark:bg-[#151722] dark:text-slate-100"
                >
                  {actionLabel(action)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
              aria-label="Refresh audit trail"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            Could not load the audit trail: {error}
          </div>
        ) : loading && events.length === 0 ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No CodeQuest activity recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((event) => {
              const meta = ACTION_META[event.action];
              return (
                <li key={event.id} className="flex flex-col gap-2 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuditIcon tone={meta?.tone ?? 'export'} />
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        meta
                          ? TONE_CLASS[meta.tone]
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {actionLabel(event.action)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {event.target}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    by {event.actor_name}
                    {event.actor_email ? ` · ${event.actor_email}` : ''}
                  </p>
                  {formatDetails(event.details).length > 0 && (
                    <p className="text-[11px] text-slate-400">
                      {formatDetails(event.details).join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

function AuditIcon({ tone }: { tone: Tone }) {
  if (tone === 'created') return <FilePlus2 className="h-4 w-4 text-emerald-600" />;
  if (tone === 'updated') return <PencilLine className="h-4 w-4 text-amber-600" />;
  if (tone === 'deleted') return <FileX2 className="h-4 w-4 text-rose-600" />;
  if (tone === 'review') return <ShieldCheck className="h-4 w-4 text-sky-600" />;
  if (tone === 'batch') return <CalendarPlus className="h-4 w-4 text-violet-600" />;
  return <Download className="h-4 w-4 text-slate-500" />;
}
