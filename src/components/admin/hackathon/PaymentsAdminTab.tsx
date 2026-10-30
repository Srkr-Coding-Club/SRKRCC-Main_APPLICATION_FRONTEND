'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, Mail, Phone, RotateCcw, Search, Trash2, X } from 'lucide-react';
import type { Hackathon, PaymentAction, PaymentQueue, PaymentRow, PaymentStatus } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { IdeaFileActions } from '@/components/hackathons/IdeaFileActions';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from './LoadError';
import { PaymentSettingsPanel } from './PaymentSettingsPanel';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT, PANEL } from './shared';

const REFRESH_MS = 30000;

const PILL: Record<PaymentStatus, { tone: PillTone; label: string }> = {
  PENDING: { tone: 'amber', label: 'Waiting for a check' },
  VERIFIED: { tone: 'green', label: 'Verified' },
  REJECTED: { tone: 'red', label: 'Rejected' },
};

const FILTERS: { value: PaymentStatus | ''; label: string }[] = [
  { value: 'PENDING', label: 'To check' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'VERIFIED', label: 'Verified' }, { value: '', label: 'All' },
];

interface PaymentsAdminTabProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
  /** Whether this person may also change the fee settings (the `settings` permission). */
  canEditSettings: boolean;
}

/** The fee: when teams pay and how much, and, for registration payments, the queue an organizer verifies, rejects or reopens. */
export function PaymentsAdminTab({ hackathon, onSaved, canEditSettings }: PaymentsAdminTabProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const slug = hackathon.slug;
  const atRegistration = hackathon.payment_stage === 'REGISTRATION';
  const [queue, setQueue] = useState<PaymentQueue | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PaymentStatus | ''>('PENDING');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Only the newest request may fill the list: an answer for a tab or search the person has already left must not replace it.
  const newest = useRef(0);
  const load = useCallback(() => {
    const mine = ++newest.current;
    hackathonApi.admin.payments(slug, { status: filter || undefined, search: query || undefined })
      .then((data) => { if (mine === newest.current) { setQueue(data); setError(''); } })
      .catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load the payments.')); });
  }, [slug, filter, query]);
  // An action finishes after the person may have switched tabs: refresh whatever they are looking at now, not what they were.
  const reload = useRef(load);
  useEffect(() => { reload.current = load; }, [load]);

  useEffect(() => {
    if (!atRegistration) return undefined;
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [atRegistration, load]);

  const run = async (row: PaymentRow, action: PaymentAction, done: string, body: { reason?: string } = {}) => {
    setBusyId(row.id);
    try {
      await hackathonApi.admin.paymentAction(slug, row.id, action, body);
      toast.success(done);
      setRejecting(null);
      setReason('');
    } catch (err: any) {
      toast.error('Could not complete that', apiErrorMessage(err));
    } finally {
      setBusyId(null);
      reload.current();
    }
  };

  const verify = async (row: PaymentRow) => {
    const ok = await confirm({
      title: `Verify the payment of ${row.team_name}?`,
      message: `₹${row.amount}, transaction ${row.transaction_id}. The team is registered, or put on the waitlist if the hackathon is full, and its leader is told.`,
      confirmLabel: 'Verify payment',
    });
    if (ok) await run(row, 'verify', `${row.team_name} is registered`);
  };

  const remove = async (row: PaymentRow) => {
    const ok = await confirm({
      title: `Remove ${row.team_name}?`,
      message: 'The team is deleted so its leader can create it again, and the transaction ID can be used again. The leader is told to contact the club representatives.',
      confirmLabel: 'Remove team',
      danger: true,
    });
    if (ok) await run(row, 'remove', `${row.team_name} removed`);
  };

  const rows = queue?.payments ?? [];
  const counts = queue?.counts;
  const countOf = useMemo(() => (value: PaymentStatus | '') => (counts ? (value ? counts[value] : counts.PENDING + counts.VERIFIED + counts.REJECTED) : 0), [counts]);

  return (
    <div className="space-y-6">
      {canEditSettings && <PaymentSettingsPanel hackathon={hackathon} onSaved={onSaved} />}
      {dialog}

      {!atRegistration ? (
        <p className={`${PANEL} text-sm text-slate-600 dark:text-slate-300`}>
          {hackathon.payment_stage === 'IDEA'
            ? 'The fee is paid with the idea, so payment screenshots are checked in the Ideas tab.'
            : 'No fee is collected when teams register. Choose "Paid when the team is created" above to start checking payments here.'}
        </p>
      ) : (
        <section className={`${PANEL} space-y-4`} aria-label="Registration payments">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">
              Registration payments{counts ? ` · ${counts.PENDING} to check` : ''}
            </h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={load} className={BTN_GHOST}>Refresh</button>
              <ExportMenu subject="payments" onExport={(format) => hackathonApi.exportFile(slug, 'payments', format)} triggerClassName={BTN_GHOST} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">The export lists every payment, including teams that were cancelled or removed, with a column marking the money that still needs settling with the person who paid.</p>
          {error && <LoadError message={error} onRetry={load} />}

          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Filter payments" className="flex flex-wrap gap-1.5">
              {FILTERS.map((item) => (
                <button key={item.label} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)}
                  className={`min-h-9 rounded-full border px-3 py-1 text-xs font-bold ${filter === item.value ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-orange-800 dark:text-[#FF9A4A]' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                  {item.label}{counts ? ` (${countOf(item.value)})` : ''}
                </button>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Team, leader or transaction ID…" aria-label="Search payments" className={`${INPUT} pl-9`} />
            </div>
          </div>

          {queue && rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {filter === 'PENDING' ? 'Nothing is waiting for a check.' : 'No payments match.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const pill = PILL[row.status];
                const busy = busyId === row.id;
                return (
                  <li key={row.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-[#1A1A2E] dark:text-white">{row.team_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {row.leader_name} · {row.members} {row.members === 1 ? 'member' : 'members'}{row.problem ? ` · ${row.problem}` : ''}
                        </p>
                      </div>
                      <StatusPill tone={pill.tone} icon={row.status === 'PENDING' ? Clock : undefined}>{pill.label}</StatusPill>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                      <div><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Amount</dt><dd className="text-sm font-semibold text-[#1A1A2E] dark:text-white">₹{row.amount}</dd></div>
                      <div className="min-w-0"><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Transaction ID</dt><dd className="break-all text-sm font-semibold text-[#1A1A2E] dark:text-white">{row.transaction_id}</dd></div>
                      <div><dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Sent</dt><dd className="text-sm text-[#1A1A2E] dark:text-white">{formatDateTime(row.submitted_at)}</dd></div>
                      <div className="min-w-0">
                        <dt className="font-bold uppercase text-slate-500 dark:text-slate-400">Leader</dt>
                        <dd className="space-y-0.5 text-xs">
                          {row.leader_email && <a href={`mailto:${row.leader_email}`} className="flex items-center gap-1 break-all font-semibold text-journey-accent hover:underline"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" /> {row.leader_email}</a>}
                          {row.leader_phone && <a href={`tel:${row.leader_phone}`} className="flex items-center gap-1 font-semibold text-journey-accent hover:underline"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" /> {row.leader_phone}</a>}
                        </dd>
                      </div>
                    </dl>

                    {row.screenshot && (
                      <IdeaFileActions slug={slug} link={(inline) => hackathonApi.paymentLink(slug, row.id, inline)} file={row.screenshot} label="Screenshot" />
                    )}

                    {row.status !== 'PENDING' && row.reviewed_by && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.status === 'VERIFIED' ? 'Verified' : 'Rejected'} by {row.reviewed_by} on {formatDateTime(row.reviewed_at)}.
                        {row.status === 'REJECTED' && row.reason && <span className="mt-0.5 block font-medium text-slate-700 dark:text-slate-200">Reason (only organizers see this): {row.reason}</span>}
                      </p>
                    )}

                    {rejecting === row.id && (
                      <div className="space-y-2 rounded-lg bg-rose-500/5 p-3">
                        <label htmlFor={`reject-${row.id}`} className="block text-xs font-bold text-slate-700 dark:text-slate-200">Why is it being rejected? Only organizers see this.</label>
                        <textarea id={`reject-${row.id}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} placeholder="e.g. the amount does not match, or the screenshot is unreadable" autoFocus />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">The team leader is only told to contact the club representatives.</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy} onClick={() => void run(row, 'reject', `${row.team_name} rejected`, { reason })} className={`${BTN_PRIMARY} bg-rose-600 hover:bg-rose-700`}>{busy ? 'Rejecting…' : 'Reject payment'}</button>
                          <button type="button" disabled={busy} onClick={() => { setRejecting(null); setReason(''); }} className={BTN_GHOST}>Cancel</button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {row.status === 'PENDING' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => void verify(row)} className={BTN_PRIMARY}><Check className="h-3.5 w-3.5" /> Verify</button>
                          <button type="button" disabled={busy} onClick={() => { setRejecting(row.id); setReason(''); }} className={BTN_GHOST}><X className="h-3.5 w-3.5" /> Reject</button>
                        </>
                      )}
                      {row.status === 'REJECTED' && (
                        <button type="button" disabled={busy} onClick={() => void run(row, 'reopen', `${row.team_name} is back in the queue`)} className={BTN_GHOST}><RotateCcw className="h-3.5 w-3.5" /> Reopen</button>
                      )}
                      {row.status !== 'VERIFIED' && (
                        <button type="button" disabled={busy} onClick={() => void remove(row)} className={BTN_DANGER}><Trash2 className="h-3.5 w-3.5" /> Remove team</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
