'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import type { JudgeRoundDetail, JudgeTeamView } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { JudgeTeamScoring } from '@/components/hackathons/judging/JudgeTeamScoring';
import { StatusPill } from '@/components/ui/StatusPill';
import { PANEL } from '@/components/hackathons/dashboardStyles';

export default function JudgeTeamPage() {
  const { slug, roundId, entryId } = useParams<{ slug: string; roundId: string; entryId: string }>();
  const signedIn = useRequireLogin(`/hackathons/${slug}/judging/rounds/${roundId}/teams/${entryId}`);
  const [team, setTeam] = useState<JudgeTeamView | null>(null);
  const [round, setRound] = useState<JudgeRoundDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    hackathonApi.judging.team(slug, Number(roundId), Number(entryId)).then((data) => { setTeam(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load this team.')));
    hackathonApi.judging.round(slug, Number(roundId)).then(setRound).catch(() => setRound(null));
  }, [slug, roundId, entryId]);
  useEffect(() => { if (signedIn) load(); }, [signedIn, load]);

  const current = Number(entryId);
  const pending = round?.teams.filter((t) => t.state === 'pending' && t.entry_id !== current) ?? [];
  const index = round?.teams.findIndex((t) => t.entry_id === current) ?? -1;
  const next = pending.find((t) => (round?.teams.findIndex((x) => x.entry_id === t.entry_id) ?? 0) > index) ?? pending[0] ?? null;
  const previous = round && index > 0 ? round.teams[index - 1] : null;
  const following = round && index >= 0 && index < round.teams.length - 1 ? round.teams[index + 1] : null;
  const teamUrl = (id: number) => `/hackathons/${slug}/judging/rounds/${roundId}/teams/${id}`;
  const stepper = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-journey-text/15 text-journey-text transition hover:border-journey-accent/60 sm:h-9 sm:w-9';

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={`/hackathons/${slug}/judging/rounds/${roundId}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted hover:text-journey-accent sm:min-h-8"><ArrowLeft className="h-4 w-4" /> {round?.name ?? 'My teams'}</Link>
        {error && <p role="alert" className={`${PANEL} text-sm text-rose-600 dark:text-rose-400`}>{error}</p>}
        {!team && !error && <div className={`${PANEL} h-32 animate-pulse`} aria-busy="true" />}
        {team && (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">{team.label}</h1>
                {team.blind && <StatusPill tone="purple" icon={EyeOff}>Blind</StatusPill>}
              </div>
              {round && index >= 0 && (
                <nav aria-label="Your teams" className="flex items-center gap-2">
                  {previous ? <Link href={teamUrl(previous.entry_id)} aria-label={`Previous team: ${previous.label}`} className={stepper}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Link> : <span className={`${stepper} opacity-30`} aria-hidden="true"><ChevronLeft className="h-4 w-4" /></span>}
                  <span className="min-w-[5.5rem] text-center text-sm font-semibold text-journey-muted">Team {index + 1} of {round.teams.length}</span>
                  {following ? <Link href={teamUrl(following.entry_id)} aria-label={`Next team: ${following.label}`} className={stepper}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link> : <span className={`${stepper} opacity-30`} aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>}
                </nav>
              )}
            </header>
            <JudgeTeamScoring slug={slug} roundId={Number(roundId)} team={team} nextEntryId={next?.entry_id ?? null} onChanged={load} />
          </>
        )}
      </div>
    </div>
  );
}
