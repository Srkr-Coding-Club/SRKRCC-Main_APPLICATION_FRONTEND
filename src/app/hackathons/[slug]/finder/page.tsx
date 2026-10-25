'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Inbox, Search, UserPlus } from 'lucide-react';
import type { FinderListing, Hackathon, JoinRequestRow, MyTeamPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { useToast } from '@/context/ToastContext';
import { FieldLabel, SpotlightInput } from '@/components/ui/InputField';
import { BTN_ACCENT, BTN_QUIET, H2, PANEL } from '@/components/hackathons/dashboardStyles';
import { FinderLists, JoinRequestsToAnswer } from '@/components/hackathons/FinderLists';

export default function TeamFinderPage() {
  const { slug } = useParams<{ slug: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/finder`);
  const { toast } = useToast();
  const [listing, setListing] = useState<FinderListing | null>(null);
  const [mine, setMine] = useState<MyTeamPayload | null>(null);
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [incoming, setIncoming] = useState<JoinRequestRow[]>([]);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, team, loaded] = await Promise.all([hackathonApi.finder.list(slug), hackathonApi.myTeam(slug), hackathonApi.get(slug)]);
      setListing(list);
      setMine(team);
      setHackathon(loaded);
      setIncoming(team.is_leader ? (await hackathonApi.finder.requests(slug)).incoming : []);
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

  const hasTeam = Boolean(mine?.team);
  const iAmLeader = Boolean(mine?.is_leader);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={`/hackathons/${slug}/dashboard`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-journey-muted hover:text-journey-accent"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">Team finder</h1>
          <p className="text-sm text-journey-muted">Find teammates, or let a team find you. Emails are never shown, and your mobile number is shown only to team leaders: they can contact you before they invite you or accept your request. Leaders invite from here and you accept on your dashboard, or ask a team to take you in and its leader answers.</p>
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

            {iAmLeader && incoming.length > 0 && (
              <section className={`${PANEL} space-y-3`}>
                <h2 className={H2}><Inbox className="h-4 w-4" /> Waiting for your answer ({incoming.length})</h2>
                <JoinRequestsToAnswer slug={slug} requests={incoming} onChanged={load} />
              </section>
            )}

            {hackathon && (
              <div className={PANEL}>
                <FinderLists slug={slug} hackathon={hackathon} listing={listing} hasTeam={hasTeam} iAmLeader={iAmLeader} onChanged={load} search={query} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
