'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search, Send, UserPlus, Users } from 'lucide-react';
import type { FinderListing, MyTeamPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { useToast } from '@/context/ToastContext';
import { FieldLabel, SpotlightInput } from '@/components/ui/InputField';
import { BTN, BTN_ACCENT, BTN_QUIET, H2, PANEL } from '@/components/hackathons/dashboardStyles';

export default function TeamFinderPage() {
  const { slug } = useParams<{ slug: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/finder`);
  const { toast } = useToast();
  const [listing, setListing] = useState<FinderListing | null>(null);
  const [mine, setMine] = useState<MyTeamPayload | null>(null);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, team] = await Promise.all([hackathonApi.finder.list(slug), hackathonApi.myTeam(slug)]);
      setListing(list);
      setMine(team);
      setSkills(list.my_profile?.skills ?? '');
      setNote(list.my_profile?.note ?? '');
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the team finder.'));
    }
  }, [slug]);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusyKey(key);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (err) {
      toast.error('Could not do that', apiErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const seekers = useMemo(() => (listing?.seekers ?? []).filter((person) => !needle || `${person.name} ${person.skills} ${person.note} ${person.profile}`.toLowerCase().includes(needle)), [listing, needle]);
  const teams = useMemo(() => (listing?.teams ?? []).filter((team) => !needle || `${team.name} ${team.looking_for} ${team.problem ?? ''}`.toLowerCase().includes(needle)), [listing, needle]);
  const hasTeam = Boolean(mine?.team);
  const iAmLeader = Boolean(mine?.is_leader);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={`/hackathons/${slug}/dashboard`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-journey-muted hover:text-journey-accent"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">Team finder</h1>
          <p className="text-sm text-journey-muted">Find teammates, or let a team find you. Emails are never shown: leaders invite from here and you accept on your dashboard.</p>
        </div>

        {error && <p role="alert" className={`${PANEL} text-sm text-rose-500`}>{error}</p>}

        {listing && (
          <>
            {!hasTeam && (
              <section className={`${PANEL} space-y-4`}>
                <h2 className={H2}><UserPlus className="h-4 w-4" /> {listing.my_profile ? 'You are listed' : 'List yourself'}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="seeker-skills">Your skills</FieldLabel>
                    <SpotlightInput id="seeker-skills" value={skills} maxLength={200} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, UI design, ML" />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="seeker-note">A short note</FieldLabel>
                    <SpotlightInput id="seeker-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="What you want to build" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busyKey === 'save'} onClick={() => run('save', () => hackathonApi.finder.saveProfile(slug, { skills, note }), 'You are listed in the team finder')} className={BTN_ACCENT}>{listing.my_profile ? 'Update listing' : 'List me'}</button>
                  {listing.my_profile && <button type="button" disabled={busyKey === 'withdraw'} onClick={() => run('withdraw', () => hackathonApi.finder.withdraw(slug), 'You are no longer listed')} className={BTN_QUIET}>Remove my listing</button>}
                </div>
              </section>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
              <SpotlightInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills, names or teams…" aria-label="Search the team finder" className="pl-9" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className={`${PANEL} space-y-3`}>
                <h2 className={H2}><Users className="h-4 w-4" /> Teams that are recruiting ({teams.length})</h2>
                {teams.length === 0 ? <p className="text-sm text-journey-muted">No team is recruiting right now.</p> : (
                  <ul className="space-y-3">
                    {teams.map((team) => (
                      <li key={team.id} className="space-y-1 rounded-xl border border-journey-text/10 p-3">
                        <p className="font-bold text-journey-text">{team.name} <span className="text-xs font-normal text-journey-muted">· {team.members}/{team.max_members} members</span></p>
                        {team.looking_for && <p className="text-sm text-journey-text/80">Looking for: {team.looking_for}</p>}
                        {team.problem && <p className="text-xs text-journey-muted">{team.problem}</p>}
                        {!hasTeam && (
                          <button type="button" disabled={busyKey === `join-${team.id}`} onClick={() => run(`join-${team.id}`, () => hackathonApi.finder.requestToJoin(slug, team.id, note), `Asked ${team.leader || 'the leader'} to add you`)} className={`${BTN} mt-1 bg-journey-accent text-white`}>
                            <Send className="h-3.5 w-3.5" /> Ask to join
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${PANEL} space-y-3`}>
                <h2 className={H2}><UserPlus className="h-4 w-4" /> People looking for a team ({seekers.length})</h2>
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
                            <UserPlus className="h-3.5 w-3.5" /> Invite to my team
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {hasTeam && !iAmLeader && <p className="text-xs text-journey-muted">Only your team leader can send invites.</p>}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
