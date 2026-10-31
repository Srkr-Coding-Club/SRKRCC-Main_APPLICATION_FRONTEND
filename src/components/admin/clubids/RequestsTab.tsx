'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Mail, Phone, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { membershipApi, type QueuePage, type QueueRow, type RequestStatus } from '@/lib/clubMembership';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from '../hackathon/LoadError';

const PAGE = 25;
const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-9';
const PRIMARY = `${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`;
const GHOST = `${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`;
const FILTERS: { value: RequestStatus | ''; label: string }[] = [
  { value: 'PENDING', label: 'Waiting' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Not approved' }, { value: 'CANCELLED', label: 'Withdrawn' }, { value: '', label: 'All' },
];
const PILL: Record<RequestStatus, { tone: PillTone; label: string }> = {
  PENDING: { tone: 'amber', label: 'Waiting' }, APPROVED: { tone: 'green', label: 'Approved' }, REJECTED: { tone: 'red', label: 'Not approved' }, CANCELLED: { tone: 'slate', label: 'Withdrawn' },
};

interface RequestsTabProps {
  isAdmin: boolean;
  refreshKey: number;
  /** Called after anything is decided so the totals and history elsewhere refresh. */
  onChanged: () => void;
}

/** People asking to become members. Approving gives the next Club ID; declining needs a reason the person is shown. */
export function RequestsTab({ isAdmin, refreshKey, onChanged }: RequestsTabProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [status, setStatus] = useState<RequestStatus | ''>('PENDING');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QueuePage | null>(null);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState<QueueRow | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { const timer = window.setTimeout(() => setQuery(text.trim()), 300); return () => window.clearTimeout(timer); }, [text]);
  useEffect(() => { setPage(1); setChosen(new Set()); }, [status, query]);

  const newest = useRef(0);
  const load = useCallback(() => {
    const mine = ++newest.current;
    membershipApi.queue({ status: status || undefined, q: query, page })
      .then((result) => { if (mine === newest.current) { setData(result); setError(''); } })
      .catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load the requests.')); });
  }, [status, query, page]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const rows = data?.results ?? [];
  const waiting = rows.filter((row) => row.status === 'PENDING');
  const counts = data?.counts;

  const attempt = async (call: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await call(); toast.success(done); setChosen(new Set()); onChanged(); } catch (err) { toast.error('Could not do that', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const approve = async (row: QueueRow) => {
    const ok = await confirm({ title: `Approve ${row.person.name}?`, message: 'They get the next Club ID and become an affiliate. They are told by notification and email.', confirmLabel: 'Approve' });
    if (ok) await attempt(() => membershipApi.approve(row.id), `${row.person.name} is a member`);
  };

  const approveChosen = async () => {
    const ids = [...chosen];
    const ok = await confirm({ title: `Approve ${ids.length} ${ids.length === 1 ? 'person' : 'people'}?`, message: 'Each gets the next Club ID in turn and is told by notification and email.', confirmLabel: `Approve ${ids.length}` });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await membershipApi.bulkApprove(ids);
      if (result.failed.length) toast.error(`${result.done} approved, ${result.failed.length} could not be`, result.failed.slice(0, 3).map((item) => item.error).join(' · '));
      else toast.success(`${result.done} approved`);
      setChosen(new Set());
      onChanged();
    } catch (err) { toast.error('Could not approve them', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const decline = async () => {
    if (!declining) return;
    const row = declining;
    setBusy(true);
    try { await membershipApi.reject(row.id, reason.trim()); toast.success(`${row.person.name} was told`); setDeclining(null); setReason(''); onChanged(); } catch (err) { toast.error('Could not do that', apiErrorMessage(err)); } finally { setBusy(false); load(); }
  };

  const toggle = (id: number) => setChosen((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const count = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE));

  return (
    <section className="space-y-4" aria-label="Requests">
      {dialog}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter requests" className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button key={item.label} type="button" role="tab" aria-selected={status === item.value} onClick={() => setStatus(item.value)} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${status === item.value ? 'border-journey-accent bg-journey-accent/10 text-journey-accent' : 'border-journey-text/10 text-journey-muted'}`}>
              {item.label}{counts ? ` (${item.value ? counts[item.value] : Object.values(counts).reduce((a, b) => a + b, 0)})` : ''}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
          <input type="search" value={text} onChange={(event) => setText(event.target.value)} aria-label="Search the requests" placeholder="Name, email or roll number" className="min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface pl-9 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm" />
        </div>
      </div>

      {isAdmin && waiting.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-journey-accent/10 p-3">
          <label className="inline-flex min-h-10 items-center gap-2 text-sm text-journey-text">
            <input type="checkbox" className="h-4 w-4 accent-[#FF7A00]" checked={chosen.size === waiting.length} onChange={(event) => setChosen(event.target.checked ? new Set(waiting.map((row) => row.id)) : new Set())} aria-label="Select everybody waiting on this page" />
            {chosen.size ? `${chosen.size} selected` : 'Select all waiting on this page'}
          </label>
          <button type="button" onClick={approveChosen} disabled={busy || chosen.size === 0} className={PRIMARY}>Approve {chosen.size || ''} selected…</button>
        </div>
      )}

      {error && <LoadError message={error} onRetry={load} />}
      {data && rows.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">{status === 'PENDING' && !query ? 'Nobody is waiting.' : 'No requests match.'}</p>}

      <ul className="space-y-3">
        {rows.map((row) => {
          const pill = PILL[row.status];
          const person = row.person;
          return (
            <li key={row.id} className="space-y-3 rounded-xl border border-journey-text/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  {isAdmin && row.status === 'PENDING' && <input type="checkbox" className="mt-1 h-4 w-4 accent-[#FF7A00]" checked={chosen.has(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${person.name}`} />}
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-journey-text">{person.name}</p>
                    <p className="text-xs text-journey-muted">{[person.roll_number, person.branch, person.year ? `Year ${person.year}` : '', person.college].filter(Boolean).join(' · ') || 'No academic details'}</p>
                  </div>
                </div>
                <span className="flex flex-wrap items-center gap-1.5"><StatusPill tone={person.email_verified ? 'green' : 'amber'}>{person.email_verified ? 'Email verified' : 'Email not verified'}</StatusPill><StatusPill tone={pill.tone}>{pill.label}</StatusPill></span>
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <a href={`mailto:${person.email}`} className="inline-flex min-h-8 items-center gap-1 break-all font-semibold text-journey-accent hover:underline"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" /> {person.email}</a>
                {person.phone && <a href={`tel:${person.phone}`} className="inline-flex min-h-8 items-center gap-1 font-semibold text-journey-accent hover:underline"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" /> {person.phone}</a>}
                <span className="inline-flex min-h-8 items-center text-journey-muted">Signed up {formatDateTime(person.joined)} · asked {formatDateTime(row.created_at)}</span>
              </p>
              {row.message && <p className="break-words rounded-lg bg-journey-text/[0.04] p-3 text-sm text-journey-text">“{row.message}”</p>}
              {row.status === 'APPROVED' && <p className="text-xs text-journey-muted">Given <span className="font-mono font-bold text-journey-accent">{row.club_id}</span>{row.decided_by ? ` by ${row.decided_by}` : ' automatically (an id was reserved for this email)'} on {formatDateTime(row.decided_at)}.</p>}
              {row.status === 'REJECTED' && <p className="text-xs text-journey-muted">Not approved{row.decided_by ? ` by ${row.decided_by}` : ''} on {formatDateTime(row.decided_at)}: “{row.note}”</p>}
              {isAdmin && row.status === 'PENDING' && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => approve(row)} disabled={busy} className={PRIMARY}><Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve</button>
                  <button type="button" onClick={() => { setDeclining(row); setReason(''); }} disabled={busy} className={GHOST}><X className="h-3.5 w-3.5" aria-hidden="true" /> Decline…</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

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

      <Modal
        isOpen={declining !== null}
        onClose={() => setDeclining(null)}
        busy={busy}
        title={`Decline ${declining?.person.name ?? ''}`}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDeclining(null)} disabled={busy} className={`${BUTTON} text-journey-muted hover:bg-journey-text/10`}>Cancel</button>
            <button type="button" onClick={decline} disabled={busy || !reason.trim()} className={`${BUTTON} bg-rose-600 text-white hover:bg-rose-700`}>Decline and tell them</button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-journey-muted">{declining?.person.name} is shown this reason by notification and email, and can ask again after 7 days.</p>
          <label htmlFor="decline-reason" className="block text-xs font-bold text-journey-text">Reason (shown to the person)</label>
          <textarea id="decline-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-journey-text/15 bg-journey-surface px-3 py-2 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:text-sm" />
        </div>
      </Modal>
    </section>
  );
}
