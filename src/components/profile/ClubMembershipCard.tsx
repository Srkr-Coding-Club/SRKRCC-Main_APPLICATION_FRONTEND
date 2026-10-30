'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Loader2, ShieldCheck, UsersRound, XCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { membershipApi, type MyMembership } from '@/lib/clubMembership';
import { requestCelebrationCheck } from '@/lib/hooks/useCelebrations';

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Becoming a club member: ask, see where the request is, read why it was not approved, or withdraw it. */
export function ClubMembershipCard() {
  const { toast } = useToast();
  const [state, setState] = useState<MyMembership | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => membershipApi.me().then(setState).catch(() => setState(null));
  useEffect(() => { void load(); }, []);

  if (!state) return null;
  const request = state.request;
  const member = Boolean(state.club_id);

  const run = async (call: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const done = await call();
      if (done) toast.success(done);
    } catch (err) {
      toast.error('Could not do that', apiErrorMessage(err));
    } finally {
      setBusy(false);
      await load();
    }
  };

  const ask = () => run(async () => {
    const reply = await membershipApi.request(message.trim());
    setMessage('');
    if (reply.auto_approved) { requestCelebrationCheck(); return 'You are a club member. Your Club ID was already reserved for you.'; }
    return 'Request sent. An organizer will look at it.';
  });

  return (
    <section aria-label="Club membership" className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-journey-accent"><UsersRound className="h-4 w-4" aria-hidden="true" /> Club membership</h2>
      <div className="space-y-3 rounded-2xl border border-journey-text/10 bg-journey-surface p-4 sm:p-5">
        {member && (
          <p className="flex items-start gap-2 text-sm text-journey-text"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" /> You are a club member. Your Club ID is <strong className="font-mono text-journey-accent">{state.club_id}</strong>.</p>
        )}

        {!member && request?.status === 'PENDING' && (
          <>
            <p className="flex items-start gap-2 text-sm text-journey-text"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" /> Your request from {day(request.created_at)} is waiting for an organizer. You will get a notification and an email when it is decided.</p>
            {request.message && <p className="break-words text-xs text-journey-muted">You wrote: “{request.message}”</p>}
            <button type="button" onClick={() => run(async () => { await membershipApi.cancel(); return 'Request withdrawn.'; })} disabled={busy} className={`${BUTTON} border border-journey-text/15 text-journey-text hover:bg-journey-text/10`}>Withdraw the request</button>
          </>
        )}

        {!member && request?.status === 'REJECTED' && (
          <div className="space-y-1.5 rounded-xl bg-rose-500/10 p-3">
            <p className="flex items-start gap-2 text-sm font-bold text-journey-text"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" /> Your last request was not approved.</p>
            {request.note && <p className="break-words text-sm text-journey-text">{request.note}</p>}
          </div>
        )}

        {!member && request?.status !== 'PENDING' && (
          <>
            {!request && <p className="text-sm text-journey-muted">Club members get a permanent Club ID and take part in events and hackathons as members. Ask to join: an organizer approves it.</p>}
            {state.blockers.length > 0 && (
              <ul className="space-y-1.5" aria-label="Before you can ask">
                {state.blockers.map((blocker) => (
                  <li key={blocker.code} className="text-sm text-journey-text">
                    {blocker.message}{blocker.until ? ` (from ${day(blocker.until)})` : ''}{blocker.fix && <> <Link href={blocker.fix} className="font-bold text-journey-accent hover:underline">Fix this</Link></>}
                  </li>
                ))}
              </ul>
            )}
            {state.can_request && (
              <div className="space-y-2">
                <label htmlFor="membership-message" className="block text-xs font-bold text-journey-text">Anything the organizers should know? (optional)</label>
                <textarea id="membership-message" rows={2} maxLength={300} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-lg border border-journey-text/15 bg-journey-bg px-3 py-2 text-base text-journey-text focus:border-journey-accent focus:outline-none sm:text-sm" />
                <button type="button" onClick={ask} disabled={busy} className={`${BUTTON} bg-journey-accent text-journey-on-accent hover:opacity-90`}>
                  {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Sending…</> : 'Ask to join the club'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
