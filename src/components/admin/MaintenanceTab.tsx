'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Play, RefreshCw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { STATE_TEXT, ago, announceAttention, loadMaintenance, runTask, type MaintenanceOverview, type MaintenanceTask } from '@/lib/maintenance';

const POLL_MS = 3000;
// Tasks that remove data ask first.
const CONFIRM: Record<string, string> = {
  sweep_form_uploads: 'Files that were uploaded but never submitted will be deleted for good.',
  purge_form_drafts: 'Unfinished form answers nobody has touched for 30 days will be deleted for good.',
  scan_form_uploads: 'Files the virus scan flags will be deleted for good.',
  backfill_form_uploads: 'Old files will be copied into storage and the responses changed to point at them. It is safe to repeat.',
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

function LastRun({ task }: { task: MaintenanceTask }) {
  const run = task.last_run;
  if (!run) return <p className="text-xs text-slate-600 dark:text-slate-400">Never run.</p>;
  const who = run.trigger === 'command' ? 'from the command line' : run.by ? `by ${run.by}` : 'from this page';
  if (run.status === 'RUNNING') return <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Running since {ago(run.started_at)}…</p>;
  return (
    <div className="space-y-0.5 text-xs">
      <p className="text-slate-600 dark:text-slate-400" title={when(run.started_at)}>
        Last run {ago(run.started_at)} · {who}
      </p>
      {run.status === 'SUCCESS'
        ? <p className="flex items-start gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{run.result}</p>
        : <p className="flex items-start gap-1 text-rose-700 dark:text-rose-400" role="alert"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />It failed: {run.error}</p>}
    </div>
  );
}

/** Housekeeping the platform does not do on its own: what is waiting, when it last ran, and a button to run it now. */
export function MaintenanceTab() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [data, setData] = useState<MaintenanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<Record<string, boolean>>({});
  const finished = useRef<Record<string, number | undefined>>({});

  const load = useCallback(async (quiet = false) => {
    try {
      const next = await loadMaintenance();
      // Tell the person when a run they started finishes.
      next.tasks.forEach((task) => {
        const run = task.last_run;
        const seen = finished.current[task.key];
        if (seen !== undefined && run && run.id === seen && run.status !== 'RUNNING') {
          if (run.status === 'SUCCESS') toast.success(task.label, run.result);
          else toast.error(`${task.label} failed`, run.error);
          finished.current[task.key] = undefined;
        }
      });
      setData(next);
      setError(null);
      announceAttention(next.attention);
    } catch (failure: any) {
      if (!quiet) setError(failure?.message || 'Could not load the maintenance tasks.');
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const anyRunning = !!data?.tasks.some((t) => t.running);
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, load]);

  const start = async (task: MaintenanceTask) => {
    const ok = await confirm({
      title: `${task.label}?`,
      danger: task.key !== 'backfill_form_uploads',
      confirmLabel: 'Run now',
      message: <p>{CONFIRM[task.key] || task.description}{task.pending > 0 ? <> About <strong>{task.pending}</strong> {task.pending_label}.</> : null}</p>,
    });
    if (!ok) return;
    setStarting((prev) => ({ ...prev, [task.key]: true }));
    try {
      const started = await runTask(task.key);
      if (started.last_run) finished.current[task.key] = started.last_run.id;
      await load(true);
    } catch (failure: any) {
      toast.error('Could not start', failure?.message || 'Please try again.');
      await load(true);
    } finally {
      setStarting((prev) => ({ ...prev, [task.key]: false }));
    }
  };

  const attention = data?.attention ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">Maintenance</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Housekeeping that runs when you press the button. Nothing here runs by itself.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {data && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${attention > 0
            ? 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'
            : 'border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200'}`}
        >
          {attention > 0 ? `${attention} task${attention === 1 ? ' needs' : 's need'} running.` : 'Everything is up to date.'}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-bold underline">Try again</button>
        </div>
      )}

      {!data && !error && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading" /></div>}

      <ul className="grid gap-4 md:grid-cols-2" aria-label="Maintenance tasks">
        {data?.tasks.map((task) => {
          const state = STATE_TEXT[task.state];
          const busy = task.running || starting[task.key];
          return (
            <li key={task.key} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-bold text-[#1A1A2E] dark:text-white">{task.label}</h2>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${state.tone}`}>{state.label}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>

              {task.state === 'unavailable'
                ? <p className="text-xs text-slate-600 dark:text-slate-400">{task.unavailable_reason}</p>
                : (
                  <p className={`text-sm font-semibold ${task.pending > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {task.pending > 0 ? `${task.pending} ${task.pending_label}` : 'Nothing waiting.'}
                    {task.state === 'due' && task.every_hours ? ` Not run in the last ${task.every_hours >= 48 ? `${Math.round(task.every_hours / 24)} days` : `${task.every_hours} hour${task.every_hours === 1 ? '' : 's'}`}.` : ''}
                  </p>
                )}

              <LastRun task={task} />

              <div className="mt-auto pt-1">
                <button
                  type="button"
                  disabled={busy || task.state === 'unavailable'}
                  onClick={() => void start(task)}
                  aria-label={`Run ${task.label} now`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#C2410C] px-4 text-sm font-bold text-white transition hover:bg-[#9A3412] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                  {busy ? 'Running…' : 'Run now'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {dialog}
    </div>
  );
}
