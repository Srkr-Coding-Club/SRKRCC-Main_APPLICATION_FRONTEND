'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, ChevronLeft, ChevronRight, Lock, Search, Trash2 } from 'lucide-react';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { clubIdApi, type ClubIdCounter, type ClubIdEvent, type ClubIdReservation, type EventPage } from '@/lib/clubIds';
import type { DirectoryPage } from '@/lib/userDirectory';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { EmailStatusBadge } from '../directory/EmailStatusBadge';
import { LoadError } from '../hackathon/LoadError';

const SELECT = 'min-h-11 rounded-lg border border-journey-text/15 bg-journey-surface px-3 text-sm font-semibold text-journey-text focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-xs';
const SEARCH = 'min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface pl-9 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm';
const SMALL = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 disabled:opacity-40 sm:min-h-9';
const GHOST = `${SMALL} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`;
const DANGER = `${SMALL} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`;
const PAGE = 25;

export interface HolderTarget { id: number; name: string; email: string; club_id: string; role: string }

function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (text: string) => void; label: string; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1 basis-56">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} placeholder={placeholder} className={SEARCH} />
    </div>
  );
}

function Pager({ count, page, onPage }: { count: number; page: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / PAGE));
  if (count <= PAGE) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 border-t border-journey-text/10 pt-3 text-xs text-journey-muted" aria-label="Pages">
      <span aria-live="polite">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, count)} of {count}</span>
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={GHOST}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
        <span className="tabular-nums">Page {page} of {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className={GHOST}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </span>
    </nav>
  );
}

/** Loads something that depends on filters; only the newest answer is applied. */
function useLoaded<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const newest = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    const mine = ++newest.current;
    load().then((result) => { if (mine === newest.current) { setData(result); setError(''); } })
      .catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load this.')); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, reload: run };
}

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), ms); return () => window.clearTimeout(timer); }, [value, ms]);
  return debounced.trim();
}

// ---- Registry ----------------------------------------------------------------------------------------------------------

export function RegistryTab({ isAdmin, counters, refreshKey, onMove, onClear }: {
  isAdmin: boolean; counters: ClubIdCounter[]; refreshKey: number; onMove: (holder: HolderTarget) => void; onClear: (holder: HolderTarget) => void;
}) {
  const [text, setText] = useState('');
  const [prefix, setPrefix] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(text);
  useEffect(() => { setPage(1); }, [q, prefix, status]);
  const { data, error, reload } = useLoaded<DirectoryPage>(() => clubIdApi.registry({ page, q, prefix, status }), [page, q, prefix, status, refreshKey]);
  const rows = data?.results ?? [];
  return (
    <section className="space-y-4" aria-label="Registry">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={text} onChange={setText} label="Search the registry" placeholder="Club ID, name, email or roll number" />
        <select aria-label="Filter by year and prefix" value={prefix} onChange={(event) => setPrefix(event.target.value)} className={SELECT}>
          <option value="">Every series</option>
          {counters.map((counter) => <option key={`${counter.prefix}${counter.year}`} value={`${String(counter.year % 100).padStart(2, '0')}${counter.prefix}`}>{String(counter.year % 100).padStart(2, '0')}{counter.prefix} ({counter.in_use})</option>)}
        </select>
        <select aria-label="Filter by membership status" value={status} onChange={(event) => setStatus(event.target.value)} className={SELECT}>
          <option value="">Any status</option><option value="ACTIVE">Active</option><option value="ALUMNI">Alumni</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option>
        </select>
      </div>
      {error && <LoadError message={error} onRetry={reload} />}
      {data && rows.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">No Club ID matches.</p>}
      {rows.length > 0 && (
        <ul className="divide-y divide-journey-text/10 rounded-xl border border-journey-text/10">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                <span className="rounded-lg border border-journey-accent/30 bg-journey-accent/10 px-2.5 py-1 font-mono text-xs font-bold text-journey-accent">{row.club_id}</span>
                <span className="min-w-0"><span className="block break-words text-sm font-bold text-journey-text">{row.full_name}</span><span className="block break-all text-xs text-journey-muted">{row.email}</span></span>
              </span>
              <span className="flex flex-wrap items-center gap-2"><StatusPill tone={row.membership_status === 'ACTIVE' ? 'green' : 'slate'}>{row.membership_status}</StatusPill><EmailStatusBadge user={row} compact /></span>
              {isAdmin && row.club_id && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => onMove({ id: row.id, name: row.full_name, email: row.email, club_id: row.club_id!, role: row.role })} className={GHOST} aria-label={`Move ${row.club_id}`}><ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" /> Move</button>
                  <button type="button" onClick={() => onClear({ id: row.id, name: row.full_name, email: row.email, club_id: row.club_id!, role: row.role })} className={DANGER} aria-label={`Clear ${row.club_id}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager count={data?.count ?? 0} page={page} onPage={setPage} />
    </section>
  );
}

// ---- Reservations -----------------------------------------------------------------------------------------------------

const RESERVATION_PILL = { RESERVED: { tone: 'amber', label: 'Held' }, CLAIMED: { tone: 'green', label: 'Claimed' }, RELEASED: { tone: 'slate', label: 'Released' } } as const;

export function ReservationsTab({ isAdmin, refreshKey, onReserve, onChanged }: { isAdmin: boolean; refreshKey: number; onReserve: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [status, setStatus] = useState('RESERVED');
  const { data, error, reload } = useLoaded(() => clubIdApi.reservations(status || undefined), [status, refreshKey]);
  const rows: ClubIdReservation[] = data?.results ?? [];
  const release = async (row: ClubIdReservation) => {
    const ok = await confirm({ title: `Release ${row.club_id}?`, message: `${row.email || 'The hold'} loses it and the id goes back to the pool.`, confirmLabel: 'Release', danger: true });
    if (!ok) return;
    try { await clubIdApi.release(row.id); toast.success(`${row.club_id} was released`); onChanged(); reload(); } catch (err) { toast.error('Could not release it', apiErrorMessage(err)); }
  };
  return (
    <section className="space-y-4" aria-label="Reservations">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Filter reservations" className="flex flex-wrap gap-1.5">
          {[['RESERVED', 'Held'], ['CLAIMED', 'Claimed'], ['RELEASED', 'Released'], ['', 'All']].map(([value, label]) => (
            <button key={label} type="button" role="tab" aria-selected={status === value} onClick={() => setStatus(value)} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${status === value ? 'border-journey-accent bg-journey-accent/10 text-journey-accent' : 'border-journey-text/10 text-journey-muted'}`}>{label}</button>
          ))}
        </div>
        {isAdmin && <button type="button" onClick={onReserve} className={`${SMALL} bg-journey-accent text-journey-on-accent hover:opacity-90`}><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Reserve an id</button>}
      </div>
      {error && <LoadError message={error} onRetry={reload} />}
      {data && rows.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">Nothing here.</p>}
      <ul className="space-y-3">
        {rows.map((row) => {
          const pill = RESERVATION_PILL[row.status];
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-journey-text/10 p-4">
              <span className="min-w-0 flex-1 basis-64">
                <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold text-journey-accent">{row.club_id}</span><StatusPill tone={pill.tone}>{pill.label}</StatusPill></span>
                <span className="mt-1 block break-all text-sm text-journey-text">{row.email || 'Held for later, no person named'}</span>
                <span className="block text-xs text-journey-muted">{row.reason || 'No reason given'} · by {row.created_by || 'unknown'} · {formatDateTime(row.created_at)}{row.status === 'CLAIMED' && ` · claimed by ${row.claimed_by || 'its person'}`}</span>
              </span>
              {isAdmin && row.status === 'RESERVED' && <button type="button" onClick={() => release(row)} className={DANGER}>Release</button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---- Counters ----------------------------------------------------------------------------------------------------------

export function CountersTab({ isAdmin, counters, onMove }: { isAdmin: boolean; counters: ClubIdCounter[]; onMove: (counter: ClubIdCounter) => void }) {
  return (
    <section className="space-y-3" aria-label="Counters">
      <p className="text-sm text-journey-muted">The next number each series will give out. A number that is held, reserved or retired is skipped. Gaps are numbers below the highest one that nobody holds.</p>
      {counters.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">No Club IDs have been issued yet.</p>}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {counters.map((counter) => (
          <li key={`${counter.prefix}${counter.year}`} className="space-y-2 rounded-xl border border-journey-text/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-xs font-bold uppercase tracking-wider text-journey-muted">{counter.year} · {counter.prefix}</p><p className="font-mono text-2xl font-extrabold text-journey-text">{counter.next_id}</p><p className="text-xs text-journey-muted">is the next one{counter.has_counter ? '' : ' (no counter yet)'}</p></div>
              {isAdmin && counter.editable && <button type="button" onClick={() => onMove(counter)} className={GHOST}>Move counter</button>}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div><dt className="font-bold uppercase text-journey-muted">In use</dt><dd className="text-base font-bold tabular-nums text-journey-text">{counter.in_use}</dd></div>
              <div><dt className="font-bold uppercase text-journey-muted">Highest</dt><dd className="text-base font-bold tabular-nums text-journey-text">{counter.highest}</dd></div>
              <div><dt className="font-bold uppercase text-journey-muted">Gaps</dt><dd className="text-base font-bold tabular-nums text-journey-text">{counter.gaps}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- History -----------------------------------------------------------------------------------------------------------

const KIND_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate' | 'sky' | 'purple'> = {
  ISSUED: 'green', ASSIGNED: 'green', CHANGED: 'amber', REASSIGNED_OUT: 'amber', REASSIGNED_IN: 'sky', CLEARED: 'red', RESERVED: 'purple', RESERVATION_RELEASED: 'slate', CLAIMED: 'green', COUNTER_SET: 'slate',
};
const KINDS = [['', 'Every kind'], ['ISSUED,ASSIGNED', 'Given'], ['REASSIGNED_OUT,REASSIGNED_IN,CHANGED', 'Moved or changed'], ['CLEARED', 'Cleared'], ['RESERVED,CLAIMED,RESERVATION_RELEASED', 'Reservations'], ['COUNTER_SET', 'Counters']];

export function HistoryTab({ refreshKey }: { refreshKey: number }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(text);
  useEffect(() => { setPage(1); }, [q, kind]);
  const { data, error, reload } = useLoaded<EventPage>(() => clubIdApi.events({ page: page > 1 ? page : undefined, q, kind }), [page, q, kind, refreshKey]);
  const rows: ClubIdEvent[] = data?.results ?? [];
  return (
    <section className="space-y-4" aria-label="History">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={text} onChange={setText} label="Search the history" placeholder="Club ID or an email" />
        <select aria-label="Filter by kind" value={kind} onChange={(event) => setKind(event.target.value)} className={SELECT}>{KINDS.map(([value, label]) => <option key={label} value={value}>{label}</option>)}</select>
      </div>
      {error && <LoadError message={error} onRetry={reload} />}
      {data && rows.length === 0 && <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">No history matches.</p>}
      <ol className="space-y-2">
        {rows.map((event) => (
          <li key={event.id} className="rounded-xl border border-journey-text/10 p-3.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={KIND_TONE[event.kind] ?? 'slate'}>{event.kind_label}</StatusPill>
              {event.club_id && <span className="font-mono text-sm font-bold text-journey-accent">{event.club_id}</span>}
              <span className="text-xs text-journey-muted">{formatDateTime(event.created_at)}</span>
            </div>
            <p className="mt-1.5 break-words text-journey-text">
              {event.user_email && <span>{event.user_email}</span>}
              {event.other_email && <span className="text-journey-muted"> ↔ {event.other_email}</span>}
              {event.actor_email ? <span className="text-journey-muted"> · by {event.actor_email}</span> : <span className="text-journey-muted"> · automatically</span>}
            </p>
            {event.reason && <p className="break-words text-xs text-journey-muted">“{event.reason}”</p>}
          </li>
        ))}
      </ol>
      <Pager count={data?.count ?? 0} page={page} onPage={setPage} />
    </section>
  );
}
