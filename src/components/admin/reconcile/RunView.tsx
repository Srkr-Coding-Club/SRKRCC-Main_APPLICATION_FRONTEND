'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Mail, RefreshCw, Search, Link2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { GROUPS, reconciliationApi, type GroupKey, type ReconRow, type RowAction, type RowPage, type RunSummary } from '@/lib/reconciliation';
import type { DirectoryPage } from '@/lib/userDirectory';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { Kpi } from '../hackathon/OverviewParts';
import { LoadError } from '../hackathon/LoadError';
import { RowCard } from './RowCard';

const PAGE = 25;
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-10';
const GHOST = `${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`;
type View = GroupKey | 'missing';

const groupCount = (summary: RunSummary, key: GroupKey) => GROUPS.find((group) => group.key === key)!.outcomes.reduce((sum, outcome) => sum + summary.by_outcome[outcome], 0);

interface RunViewProps {
  runId: string;
  canAct: boolean;
  onBack: () => void;
  onDeleted: () => void;
}

/** One compared sheet: the groups of results, each row with its choices, the bulk shortcuts and the exports. */
export function RunView({ runId, canAct, onBack, onDeleted }: RunViewProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [view, setView] = useState<View>('link');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RowPage | null>(null);
  const [missing, setMissing] = useState<DirectoryPage | null>(null);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bulkCounts, setBulkCounts] = useState({ link: 0, invite: 0 });
  const [asking, setAsking] = useState<ReconRow | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => { const timer = window.setTimeout(() => setQuery(text.trim()), 300); return () => window.clearTimeout(timer); }, [text]);
  useEffect(() => { setPage(1); }, [view, query, openOnly]);

  const newest = useRef(0);
  const load = useCallback(() => {
    const mine = ++newest.current;
    const requests: Promise<unknown>[] = [
      reconciliationApi.summary(runId).then((value) => { if (mine === newest.current) setSummary(value); }),
      reconciliationApi.rows(runId, { outcome: 'ID_MISSING_IN_APP', open: true }).then((value) => { if (mine === newest.current) setBulkCounts((counts) => ({ ...counts, link: value.count })); }),
      reconciliationApi.rows(runId, { outcome: 'NO_ACCOUNT', open: true }).then((value) => { if (mine === newest.current) setBulkCounts((counts) => ({ ...counts, invite: value.count })); }),
      view === 'missing'
        ? reconciliationApi.missing(runId, page).then((value) => { if (mine === newest.current) { setMissing(value); setMissingCount(value.count); } })
        : reconciliationApi.rows(runId, { group: view, q: query, open: openOnly && view !== 'matched' && view !== 'sheet', page }).then((value) => { if (mine === newest.current) setRows(value); }),
    ];
    if (view !== 'missing') requests.push(reconciliationApi.missing(runId).then((value) => { if (mine === newest.current) setMissingCount(value.count); }));
    Promise.all(requests).then(() => { if (mine === newest.current) setError(''); }).catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load this sheet.')); });
  }, [runId, view, query, openOnly, page]);
  useEffect(() => { load(); }, [load]);

  const attempt = async (call: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await call(); toast.success(done); } catch (err) { toast.error('Could not do that', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const act = async (row: ReconRow, action: RowAction) => {
    if (action === 'use_sheet') { setAsking(row); setNote(''); return; }
    if (action === 'link') return attempt(() => reconciliationApi.act(runId, row.id, 'link'), `${row.club_id} linked to ${row.matched_user?.name ?? 'the account'}`);
    if (action === 'link_retired') {
      const ok = await confirm({ title: `Link the retired id ${row.club_id}?`, message: 'It was cleared from a member earlier and is not normally given out again. Link it only if you are sure.', confirmLabel: 'Link it', danger: true });
      return ok ? attempt(() => reconciliationApi.act(runId, row.id, 'link', { allow_retired: true }), `${row.club_id} linked`) : undefined;
    }
    if (action === 'invite') {
      const ok = await confirm({ title: `Invite ${row.email}?`, message: `${row.club_id} is reserved for this email and they get one email with a sign-up link. When they register with that address the id is attached.`, confirmLabel: 'Invite' });
      return ok ? attempt(() => reconciliationApi.act(runId, row.id, 'invite'), `${row.email} was invited`) : undefined;
    }
    const choice = action === 'keep_app' ? 'KEEP_APP' : action === 'follow_up' ? 'FOLLOW_UP' : 'DISMISS';
    return attempt(() => reconciliationApi.act(runId, row.id, 'decide', { choice }), 'Saved');
  };

  const useSheet = async () => {
    if (!asking) return;
    const row = asking;
    setBusy(true);
    try { await reconciliationApi.act(runId, row.id, 'use-sheet', { note: note.trim() }); toast.success(`${row.matched_user?.name ?? 'The account'} now has ${row.club_id}`); setAsking(null); } catch (err) { toast.error('Could not do that', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const bulk = async (action: 'link' | 'invite') => {
    const expected = bulkCounts[action];
    const ok = await confirm({
      title: action === 'link' ? `Link ${expected} Club IDs?` : `Invite ${expected} people?`,
      message: action === 'link'
        ? `Each of the ${expected} open accounts without a Club ID gets the one in the sheet. Every change is recorded with this sheet and row as the reason.`
        : `${expected} people each get one email and have their Club ID reserved. This cannot be unsent.`,
      confirmLabel: action === 'link' ? `Link ${expected}` : `Invite ${expected}`,
      danger: action === 'invite',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await reconciliationApi.bulk(runId, { action, outcome: action === 'link' ? 'ID_MISSING_IN_APP' : 'NO_ACCOUNT', expected });
      if (result.failed.length) toast.error(`${result.done} done, ${result.failed.length} could not be`, result.failed.slice(0, 3).map((item) => `row ${item.row_number}: ${item.error}`).join(' · '));
      else toast.success(`${result.done} done`);
    } catch (err) { toast.error('Could not do that', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const recheck = async () => {
    setBusy(true);
    try { const { changed } = await reconciliationApi.recheck(runId); toast.success(changed ? `${changed} rows changed` : 'Nothing has changed'); } catch (err) { toast.error('Could not check again', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const remove = async () => {
    const ok = await confirm({ title: 'Delete this comparison?', message: 'The stored rows and your decisions are removed. Accounts, Club IDs and the Club ID history are not touched.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try { await reconciliationApi.remove(runId); onDeleted(); } catch (err) { toast.error('Could not delete it', apiErrorMessage(err)); }
  };

  const list = rows?.results ?? [];
  const count = view === 'missing' ? missing?.count ?? 0 : rows?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const current = GROUPS.find((group) => group.key === view);

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-journey-accent hover:underline"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All comparisons</button>
          <h2 className="break-words text-lg font-extrabold text-journey-text">{summary?.filename ?? 'Loading…'}</h2>
          {summary && <p className="text-xs text-journey-muted">{summary.total} rows{summary.sheet ? ` · sheet “${summary.sheet}”` : ''} · by {summary.created_by || 'unknown'} · {formatDateTime(summary.created_at)} · <strong className="text-journey-text">{summary.open}</strong> still need a decision</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={recheck} disabled={busy} className={GHOST}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Check again</button>
          <ExportMenu subject="the report" onExport={(format) => reconciliationApi.exportReport(runId, format, 'report', view === 'missing' ? undefined : view)} triggerClassName={GHOST} />
          {canAct && <button type="button" onClick={remove} className={`${BUTTON} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}>Delete</button>}
        </div>
      </div>

      {error && <LoadError message={error} onRetry={load} />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {GROUPS.map((group) => (
          <Kpi key={group.key} icon={group.key === 'link' ? Link2 : group.key === 'no_account' ? Mail : Search} label={group.label} value={summary ? groupCount(summary, group.key) : '—'} hint={group.hint}
            tone={group.key === 'matched' ? 'green' : group.key === 'mismatch' ? 'red' : group.key === 'sheet' ? 'accent' : 'amber'} className={view === group.key ? 'ring-2 ring-journey-accent' : ''} onClick={() => setView(group.key)} />
        ))}
        <Kpi icon={Search} label="Not in the sheet" value={missingCount ?? '—'} hint="app members missing from it" tone="accent" className={view === 'missing' ? 'ring-2 ring-journey-accent' : ''} onClick={() => setView('missing')} />
      </div>

      <section className="glass-panel space-y-4 rounded-xl border border-journey-text/10 p-4 sm:p-5" aria-label={view === 'missing' ? 'Members not in the sheet' : current?.label}>
        {view !== 'missing' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
              <input type="search" value={text} onChange={(event) => setText(event.target.value)} aria-label="Search this sheet" placeholder="Name, email or Club ID" className="min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface pl-9 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm" />
            </div>
            {view !== 'matched' && view !== 'sheet' && (
              <label className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-journey-muted"><input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} className="h-4 w-4 accent-[#FF7A00]" /> Only rows that need a decision</label>
            )}
          </div>
        )}

        {canAct && view === 'link' && bulkCounts.link > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-journey-accent/10 p-3"><p className="text-sm text-journey-text"><strong>{bulkCounts.link}</strong> accounts can be given the Club ID from the sheet.</p><button type="button" onClick={() => bulk('link')} disabled={busy} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}>Link all {bulkCounts.link}…</button></div>
        )}
        {canAct && view === 'no_account' && bulkCounts.invite > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-journey-accent/10 p-3"><p className="text-sm text-journey-text"><strong>{bulkCounts.invite}</strong> people with a Club ID have no account yet.</p><button type="button" onClick={() => bulk('invite')} disabled={busy} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}>Invite all {bulkCounts.invite}…</button></div>
        )}

        {view === 'missing' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-journey-muted">Members who hold a Club ID in the app but are in the sheet by neither email nor Club ID.</p><ExportMenu subject="members not in the sheet" onExport={(format) => reconciliationApi.exportReport(runId, format, 'missing')} triggerClassName={GHOST} /></div>
            {missing && missing.results.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">Everybody with a Club ID is in the sheet.</p>}
            <ul className="divide-y divide-journey-text/10 rounded-xl border border-journey-text/10">
              {(missing?.results ?? []).map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="min-w-0"><span className="block break-words text-sm font-bold text-journey-text">{user.full_name}</span><span className="block break-all text-xs text-journey-muted">{user.email}</span></span><span className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-journey-accent">{user.club_id}</span><span className="text-xs text-journey-muted">{user.membership_status}</span></span></li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {rows && list.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">{openOnly && !query && view !== 'matched' && view !== 'sheet' ? 'Nothing here needs a decision.' : 'No rows match.'}</p>}
            <ul className="space-y-3">{list.map((row) => <RowCard key={row.id} row={row} canAct={canAct} busy={busy} onAct={act} />)}</ul>
          </>
        )}

        {count > PAGE && (
          <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-journey-text/10 pt-3 text-xs text-journey-muted" aria-label="Pages">
            <span aria-live="polite">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, count)} of {count}</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} className={GHOST}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
              <span className="tabular-nums">Page {page} of {pages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= pages} className={GHOST}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </span>
          </nav>
        )}
      </section>

      <Modal
        isOpen={asking !== null}
        onClose={() => setAsking(null)}
        busy={busy}
        title="Use the sheet’s Club ID?"
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setAsking(null)} disabled={busy} className={`${BUTTON} text-journey-muted hover:bg-journey-text/10`}>Cancel</button>
            <button type="button" onClick={useSheet} disabled={busy || !note.trim()} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}>Use {asking?.club_id}</button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-journey-muted">{asking?.matched_user?.name} keeps their account but their Club ID changes from <span className="font-mono text-journey-text">{asking?.matched_user?.club_id}</span> to <span className="font-mono text-journey-text">{asking?.club_id}</span>. The old id is freed, not retired.</p>
          <label htmlFor="use-sheet-note" className="block text-xs font-bold text-journey-text">Why is the sheet right? Kept in the history</label>
          <textarea id="use-sheet-note" rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-journey-text/15 bg-journey-surface px-3 py-2 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:text-sm" />
        </div>
      </Modal>
    </div>
  );
}
