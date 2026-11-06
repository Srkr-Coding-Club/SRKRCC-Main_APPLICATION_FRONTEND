'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Circle, EyeOff, MinusCircle } from 'lucide-react';
import type { JudgeRoundDetail, RoundCellState } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { describeDue } from '@/lib/dueText';
import { PANEL } from '@/components/hackathons/dashboardStyles';
import { ROUND_STATE } from './JudgeRoundsPanel';

const TEAM_STATE: Record<RoundCellState, { label: string; icon: React.ReactNode }> = {
  scored: { label: 'Scored', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" /> },
  pending: { label: 'To score', icon: <Circle className="h-5 w-5 text-journey-muted" aria-hidden="true" /> },
  recused: { label: 'You stepped aside', icon: <MinusCircle className="h-5 w-5 text-amber-500" aria-hidden="true" /> },
};

/** One round for its judge: where they stand, the rubric in short, and only the teams they were given. */
export function JudgeRoundTeams({ slug, round }: { slug: string; round: JudgeRoundDetail }) {
  const state = ROUND_STATE[round.status];
  const percent = round.assigned ? Math.round((round.scored / round.assigned) * 100) : 0;
  const due = round.status === 'IN_PROGRESS' ? describeDue(round.deadline) : null;
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl">{round.name}</h1>
          <StatusPill tone={state.tone}>{state.label}</StatusPill>
          {round.blind && <StatusPill tone="purple" icon={EyeOff}>Blind: team names are hidden</StatusPill>}
        </div>
        {round.description && <p className="whitespace-pre-line text-sm text-journey-muted">{round.description}</p>}
        {round.status !== 'NOT_STARTED' && (
          <div className={`${PANEL} space-y-3`}>
            <div className="grid grid-cols-3 gap-2 text-center" aria-label="Where you stand">
              {[
                { label: 'To score', value: round.pending, tone: 'text-amber-700 dark:text-amber-300' },
                { label: 'Scored', value: round.scored, tone: 'text-emerald-700 dark:text-emerald-300' },
                { label: 'Stepped aside', value: round.recused, tone: 'text-journey-muted' },
              ].map((tile) => (
                <div key={tile.label} className="rounded-xl bg-journey-text/[0.05] px-2 py-3">
                  <p className={`text-2xl font-extrabold tabular-nums ${tile.tone}`}>{tile.value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-journey-muted">{tile.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-journey-text">{round.scored} of {round.assigned} scored</p>
                {due && (
                  <p title={round.deadline ? formatDateTime(round.deadline) : undefined} className={`text-xs font-bold ${due.tone === 'late' ? 'text-rose-600 dark:text-rose-400' : due.tone === 'soon' ? 'text-amber-700 dark:text-amber-300' : 'text-journey-muted'}`}>{due.text}</p>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-journey-text/10" role="progressbar" aria-label="Your progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>
        )}
      </header>

      {round.criteria.length > 0 && (
        <section className={`${PANEL} space-y-2`} aria-label="How you score">
          <h2 className="text-sm font-bold text-journey-text">How you score</h2>
          <ul className="space-y-1 text-sm text-journey-text/80">
            {round.criteria.map((criterion) => (
              <li key={criterion.id}>
                <strong>{criterion.name}</strong> out of {criterion.max_score}, weight {criterion.weight}
                {criterion.description ? <span className="block text-xs text-journey-muted">{criterion.description}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {round.status === 'NOT_STARTED' ? (
        <p className={`${PANEL} text-sm text-journey-muted`}>Scoring has not opened yet. You will be told when it does, and your teams will appear here.</p>
      ) : round.teams.length === 0 ? (
        <p className={`${PANEL} text-sm text-journey-muted`}>No teams were given to you in this round.</p>
      ) : (
        <ul className="space-y-2" aria-label="Your teams">
          {round.teams.map((team) => {
            const teamState = TEAM_STATE[team.state];
            return (
              <li key={team.entry_id}>
                <Link
                  href={`/hackathons/${slug}/judging/rounds/${round.round_id}/teams/${team.entry_id}`}
                  className={`${PANEL} flex min-h-14 items-center gap-3 !py-3 transition hover:border-journey-accent/50`}
                >
                  {teamState.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-journey-text">{team.label}</span>
                    <span className="block text-xs text-journey-muted">
                      {teamState.label}{team.my_total !== null ? ` · you gave ${team.my_total.toFixed(1)}` : ''}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-journey-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
