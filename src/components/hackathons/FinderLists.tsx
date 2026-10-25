'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Send, UserPlus, Users, X } from 'lucide-react';
import type { FinderListing, FinderTeam, Hackathon, JoinRequestRow } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { FieldLabel, SpotlightTextarea } from '@/components/ui/InputField';
import { BTN, BTN_ACCENT, BTN_QUIET, H2 } from './dashboardStyles';
import {
  EMPTY_REGISTRATION,
  RegistrationDetailsFields,
  needsRegistrationDetails,
  registrationErrors,
  toRegistrationInput,
  type RegistrationValue,
} from './RegistrationDetailsFields';

interface Props {
  slug: string;
  hackathon: Pick<Hackathon, 'rules' | 'require_rules_acceptance' | 'registration_questions'>;
  listing: FinderListing;
  hasTeam: boolean;
  iAmLeader: boolean;
  /** Called after something changed, so the page can load again. */
  onChanged: () => void | Promise<void>;
  /** Show only this many of each list (the dashboard card); the rest is behind "See all". */
  limit?: number;
  /** Narrow both lists (the finder page's search box). */
  search?: string;
}

const matches = (needle: string, text: string) => !needle || text.toLowerCase().includes(needle);

/** The lists of teams that need people and people who are available, with the actions that go with them. */
export function FinderLists({ slug, hackathon, listing, hasTeam, iAmLeader, onChanged, limit, search = '' }: Props) {
  const { toast } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [asking, setAsking] = useState<FinderTeam | null>(null);
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState<RegistrationValue>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needle = search.trim().toLowerCase();
  const allTeams = useMemo(() => listing.teams.filter((team) => matches(needle, `${team.name} ${team.looking_for} ${team.problem ?? ''}`)), [listing.teams, needle]);
  const allSeekers = useMemo(() => listing.seekers.filter((person) => matches(needle, `${person.name} ${person.skills} ${person.note} ${person.profile}`)), [listing.seekers, needle]);
  const teams = limit ? allTeams.slice(0, limit) : allTeams;
  const seekers = limit ? allSeekers.slice(0, limit) : allSeekers;
  const asked = useMemo(() => new Map<number, JoinRequestRow>((listing.my_requests ?? []).filter((r) => r.status === 'PENDING').map((r) => [r.team_id, r])), [listing.my_requests]);
  const needsDetails = needsRegistrationDetails(hackathon);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusyKey(key);
    try {
      await action();
      toast.success(success);
      await onChanged();
    } catch (err) {
      toast.error('Could not do that', apiErrorMessage(err));
      await onChanged();
    } finally {
      setBusyKey(null);
    }
  };

  const openAsk = (team: FinderTeam) => {
    setAsking(team);
    setMessage('');
    setRegistration(EMPTY_REGISTRATION);
    setErrors({});
  };

  const sendAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!asking) return;
    const found = needsDetails ? registrationErrors(hackathon, registration) : {};
    if (Object.keys(found).length > 0) { setErrors(found); return; }
    setBusyKey(`join-${asking.id}`);
    try {
      await hackathonApi.finder.requestToJoin(slug, asking.id, message.trim(), needsDetails ? toRegistrationInput(registration) : undefined);
      toast.success(`Asked ${asking.leader || 'the leader'} to add you`, 'You will be told when they answer.');
      setAsking(null);
      await onChanged();
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      setErrors({ [field ?? 'form']: apiErrorMessage(err) });
    } finally {
      setBusyKey(null);
    }
  };

  const more = (count: number, shown: number) => (limit && count > shown ? (
    <Link href={`/hackathons/${slug}/finder`} className="text-xs font-bold text-journey-accent hover:underline">See all {count}</Link>
  ) : null);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-label="Teams that need people" className="space-y-3">
          <h2 className={H2}><Users className="h-4 w-4" /> Teams that need people ({allTeams.length})</h2>
          {teams.length === 0 ? <p className="text-sm text-journey-muted">No team is recruiting right now.</p> : (
            <ul className="space-y-3">
              {teams.map((team) => {
                const sent = asked.get(team.id);
                return (
                  <li key={team.id} className="space-y-1 rounded-xl border border-journey-text/10 p-3">
                    <p className="font-bold text-journey-text">{team.name} <span className="text-xs font-normal text-journey-muted">· {team.members}/{team.max_members} members</span></p>
                    {team.looking_for && <p className="text-sm text-journey-text/80">Looking for: {team.looking_for}</p>}
                    {team.problem && <p className="text-xs text-journey-muted">{team.problem}</p>}
                    {!hasTeam && (sent ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Request sent: waiting for the leader</span>
                        <button type="button" disabled={busyKey === `cancel-${sent.id}`} onClick={() => run(`cancel-${sent.id}`, () => hackathonApi.finder.answerRequest(slug, sent.id, 'cancel'), 'Request cancelled')} className={BTN_QUIET}>Cancel request</button>
                      </div>
                    ) : (
                      <button type="button" disabled={busyKey === `join-${team.id}`} onClick={() => openAsk(team)} className={`${BTN} mt-1 bg-journey-accent text-white`}>
                        <Send className="h-3.5 w-3.5" aria-hidden="true" /> Ask to join
                      </button>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
          {more(allTeams.length, teams.length)}
        </section>

        <section aria-label="People who are available" className="space-y-3">
          <h2 className={H2}><UserPlus className="h-4 w-4" /> People looking for a team ({allSeekers.length})</h2>
          {seekers.length === 0 ? <p className="text-sm text-journey-muted">Nobody is listed yet.</p> : (
            <ul className="space-y-3">
              {seekers.map((person) => (
                <li key={person.id} className="space-y-1 rounded-xl border border-journey-text/10 p-3">
                  <p className="font-bold text-journey-text">{person.name}{person.is_me && <span className="ml-2 text-[10px] font-bold text-journey-muted">(you)</span>}</p>
                  {person.profile && <p className="text-xs text-journey-muted">{person.profile}</p>}
                  {person.skills && <p className="text-sm text-journey-text/80">Skills: {person.skills}</p>}
                  {person.note && <p className="text-sm text-journey-muted">{person.note}</p>}
                  {iAmLeader && !person.is_me && (
                    <button type="button" disabled={busyKey === `invite-${person.id}`} onClick={() => run(`invite-${person.id}`, () => hackathonApi.finder.invite(slug, person.id), `Invite sent to ${person.name}`)} className={`${BTN} mt-1 bg-journey-accent text-white`}>
                      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Invite to my team
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {more(allSeekers.length, seekers.length)}
          {hasTeam && !iAmLeader && <p className="text-xs text-journey-muted">Only your team leader can send invites.</p>}
        </section>
      </div>

      {asking && (
        <Modal isOpen onClose={() => setAsking(null)} title={`Ask to join ${asking.name}`} icon={Send} busy={busyKey === `join-${asking.id}`}>
          <form onSubmit={sendAsk} className="space-y-4">
            <p className="text-sm text-journey-muted">{asking.leader || 'The leader'} will see your name, branch and skills (never your email) and can accept or decline.</p>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="join-message">A short message (optional)</FieldLabel>
              <SpotlightTextarea id="join-message" rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you would be a good fit" hasError={!!errors.message} />
              {errors.message && <p className="text-xs text-rose-500">{errors.message}</p>}
            </div>
            {needsDetails && (
              <RegistrationDetailsFields config={hackathon} value={registration} onChange={setRegistration} errors={errors} />
            )}
            {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(null)} className={BTN_QUIET}>Cancel</button>
              <button type="submit" disabled={busyKey === `join-${asking.id}`} className={BTN_ACCENT}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> {busyKey === `join-${asking.id}` ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/** Requests waiting for this team's leader: accept or decline, with the reason when accepting is not possible right now. */
export function JoinRequestsToAnswer({ slug, requests, onChanged }: { slug: string; requests: JoinRequestRow[]; onChanged: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (requests.length === 0) return null;

  const answer = async (request: JoinRequestRow, action: 'accept' | 'decline') => {
    setBusy(`${action}-${request.id}`);
    try {
      await hackathonApi.finder.answerRequest(slug, request.id, action);
      toast.success(action === 'accept' ? `${request.name} joined ${request.team_name}` : 'Request declined');
    } catch (err) {
      toast.error(action === 'accept' ? 'Could not accept' : 'Could not decline', apiErrorMessage(err));
    } finally {
      setBusy(null);
      await onChanged();
    }
  };

  return (
    <ul aria-label="Requests to join your team" className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className="space-y-2 rounded-xl border border-journey-text/10 p-3">
          <div>
            <p className="font-bold text-journey-text">{request.name} <span className="text-xs font-normal text-journey-muted">wants to join {request.team_name}</span></p>
            {request.profile && <p className="text-xs text-journey-muted">{request.profile}</p>}
            {request.skills && <p className="text-sm text-journey-text/80">Skills: {request.skills}</p>}
            {request.message && <p className="text-sm text-journey-text/80">&ldquo;{request.message}&rdquo;</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!busy || !!request.blocked_reason} onClick={() => answer(request, 'accept')} aria-label={`Accept ${request.name}`} className={`${BTN} bg-emerald-600 text-white hover:opacity-90`}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> {busy === `accept-${request.id}` ? 'Adding…' : 'Accept'}
            </button>
            <button type="button" disabled={!!busy} onClick={() => answer(request, 'decline')} aria-label={`Decline ${request.name}`} className={BTN_QUIET}>
              <X className="h-3.5 w-3.5" aria-hidden="true" /> {busy === `decline-${request.id}` ? 'Declining…' : 'Decline'}
            </button>
            {request.blocked_reason && <p className="w-full text-xs text-amber-700 dark:text-amber-300">{request.blocked_reason}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
