'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { clubIdApi, type ClubIdLookup, type ClubIdPerson } from '@/lib/clubIds';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import type { HolderTarget } from './ClubIdTabs';

const BUTTON = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 sm:min-h-9';
const GHOST = `${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`;

interface LookupBoxProps {
  isAdmin: boolean;
  refreshKey: number;
  onAssign: (clubId: string) => void;
  onReserve: () => void;
  onMove: (holder: HolderTarget) => void;
  onClear: (holder: HolderTarget) => void;
  onAllocate: () => void;
}

const asHolder = (person: ClubIdPerson): HolderTarget => ({ id: person.id, name: person.name, email: person.email, club_id: person.club_id!, role: person.role });

function PersonLine({ person }: { person: ClubIdPerson }) {
  return (
    <span className="min-w-0">
      <span className="block break-words text-sm font-bold text-journey-text">{person.name}</span>
      <span className="block break-all text-xs text-journey-muted">{person.email} · {person.role} · {person.membership_status} · {person.email_verified ? 'email verified' : 'email not verified'}</span>
    </span>
  );
}

/** Type an id, a name or an email and see everything known about it, with the controls that apply. */
export function LookupBox({ isAdmin, refreshKey, onAssign, onReserve, onMove, onClear, onAllocate }: LookupBoxProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ClubIdLookup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shownFor, setShownFor] = useState(0);

  const search = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      setResult(await clubIdApi.lookup(text.trim()));
      setShownFor(refreshKey);
    } catch (err) {
      setResult(null);
      setError(apiErrorMessage(err, 'Could not look that up.'));
    } finally {
      setLoading(false);
    }
  };

  // After a change elsewhere the answer on screen may be stale: look again.
  React.useEffect(() => { if (result && refreshKey !== shownFor) void search(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-4 rounded-xl border border-journey-text/10 p-4 sm:p-5" aria-label="Look up">
      <form onSubmit={search} className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Look up a Club ID, a name or an email"
            placeholder="Look up a Club ID (25SCC277), a name or an email"
            className="min-h-11 w-full rounded-lg border border-journey-text/15 bg-journey-surface pl-9 pr-3 text-base text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none sm:min-h-10 sm:text-sm"
          />
        </div>
        <button type="submit" disabled={loading || !text.trim()} className={`${BUTTON} min-h-11 bg-journey-accent px-4 text-journey-on-accent hover:opacity-90 disabled:opacity-40 sm:min-h-10`}>{loading ? 'Looking…' : 'Look up'}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {result?.kind === 'id' && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xl font-extrabold text-journey-accent">{result.club_id}</span>
            {result.holder ? <StatusPill tone="green">Held</StatusPill> : result.reservation ? <StatusPill tone="amber">Reserved</StatusPill> : <StatusPill tone="slate">Free</StatusPill>}
            {result.retired && <StatusPill tone="red">Retired</StatusPill>}
          </div>
          {result.holder && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-journey-text/[0.04] p-3">
              <PersonLine person={result.holder} />
              {isAdmin && <span className="flex gap-2"><button type="button" onClick={() => onMove(asHolder(result.holder!))} className={GHOST}>Move</button><button type="button" onClick={() => onClear(asHolder(result.holder!))} className={`${BUTTON} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}>Clear</button></span>}
            </div>
          )}
          {!result.holder && result.reservation && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-journey-text">Held back for {result.reservation.email || 'later'}. {result.reservation.reason}</p>}
          {!result.holder && !result.reservation && isAdmin && <button type="button" onClick={() => onAssign(result.club_id)} className={GHOST}>Assign this id to someone</button>}
          {result.retired && !result.holder && <p className="text-xs text-journey-muted">It was cleared from a member earlier, so it is not handed out again by itself.</p>}
          {result.events.length > 0 ? (
            <ol className="space-y-1.5 border-l-2 border-journey-text/10 pl-3" aria-label="History of this id">
              {result.events.map((event) => (
                <li key={event.id} className="text-xs text-journey-muted"><strong className="text-journey-text">{event.kind_label}</strong> {event.user_email}{event.other_email ? ` ↔ ${event.other_email}` : ''} · {event.actor_email ? `by ${event.actor_email}` : 'automatically'} · {formatDateTime(event.created_at)}{event.reason ? ` · “${event.reason}”` : ''}</li>
              ))}
            </ol>
          ) : <p className="text-xs text-journey-muted">Nothing has happened to this id yet.</p>}
        </div>
      )}

      {result?.kind === 'person' && (
        <div className="space-y-3" aria-live="polite">
          {result.people.length === 0 && result.reservations.length === 0 && <p className="text-sm text-journey-muted">Nobody matches.</p>}
          <ul className="space-y-2">
            {result.people.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-journey-text/[0.04] p-3">
                <PersonLine person={person} />
                {person.club_id ? <button type="button" onClick={() => { setText(person.club_id!); }} className="rounded-lg border border-journey-accent/30 bg-journey-accent/10 px-2.5 py-1 font-mono text-xs font-bold text-journey-accent">{person.club_id}</button> : <span className="text-xs italic text-journey-muted">No Club ID</span>}
              </li>
            ))}
          </ul>
          {result.reservations.map((row) => <p key={row.id} className="rounded-lg bg-amber-500/10 p-3 text-sm text-journey-text">{row.club_id} is reserved for {row.email}.</p>)}
          {isAdmin && <div className="flex gap-2"><button type="button" onClick={onAllocate} className={GHOST}>Give the next number…</button><button type="button" onClick={onReserve} className={GHOST}>Reserve an id…</button></div>}
        </div>
      )}
    </section>
  );
}
