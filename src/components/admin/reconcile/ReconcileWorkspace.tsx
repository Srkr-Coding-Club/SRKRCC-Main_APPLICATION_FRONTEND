'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { reconciliationApi, type RunSummary } from '@/lib/reconciliation';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from '../hackathon/LoadError';
import { RunView } from './RunView';
import { UploadWizard } from './UploadWizard';

const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition active:scale-95 sm:min-h-10';

/** Past members: compare an old sheet with the accounts. The chosen comparison lives in the address (`?run=`). */
export function ReconcileWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const runId = useSearchParams()?.get('run') ?? '';
  const isAdmin = getStoredUser()?.role === 'ADMIN';
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    reconciliationApi.runs().then((data) => { setRuns(data.results); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the comparisons.')));
  }, []);
  useEffect(() => { if (!runId) load(); }, [runId, load]);

  const open = (id: string) => router.replace(`${pathname}?run=${id}`, { scroll: false });
  const close = () => router.replace(pathname, { scroll: false });

  if (runId) return <RunView runId={runId} canAct={isAdmin} onBack={close} onDeleted={close} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-journey-text"><FileSpreadsheet className="h-5 w-5 text-journey-accent" aria-hidden="true" /> Past members</h1>
          <p className="mt-1 max-w-2xl text-sm text-journey-muted">Upload an old member sheet (name, email, Club ID). Every row is checked against the accounts: who matches, who needs a Club ID linked, where the two disagree and who has no account yet.{!isAdmin && ' You can look and export; only an Admin can upload or change anything.'}</p>
        </div>
        {isAdmin && <button type="button" onClick={() => setUploading(true)} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}><Upload className="h-4 w-4" aria-hidden="true" /> Upload a sheet</button>}
      </header>

      {error && <LoadError message={error} onRetry={load} />}
      {runs && runs.length === 0 && (
        <div className="rounded-xl border border-dashed border-journey-text/20 p-10 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-journey-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-journey-text">No sheet has been compared yet.</p>
          <p className="text-xs text-journey-muted">{isAdmin ? 'Upload one to see who matches and who is missing.' : 'An Admin can upload one.'}</p>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(runs ?? []).map((run) => (
          <li key={run.id}>
            <button type="button" onClick={() => open(run.id)} className="w-full space-y-2 rounded-xl border border-journey-text/10 p-4 text-left transition hover:border-journey-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-journey-accent">
              <span className="block break-words text-sm font-bold text-journey-text">{run.filename}</span>
              <span className="block text-xs text-journey-muted">{run.total} rows · by {run.created_by || 'unknown'} · {formatDateTime(run.created_at)}</span>
              <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className="text-emerald-600 dark:text-emerald-400">{run.by_outcome.MATCH + run.by_outcome.NAME_DIFFERS} match</span><span className="font-bold text-journey-accent">{run.open} need a decision</span></span>
            </button>
          </li>
        ))}
      </ul>

      {uploading && <UploadWizard onClose={() => setUploading(false)} onCreated={(run) => open(run.id)} />}
    </div>
  );
}
