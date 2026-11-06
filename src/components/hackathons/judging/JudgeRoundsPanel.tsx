'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, EyeOff, Flag } from 'lucide-react';
import type { JudgeRoundSummary } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { describeDue } from '@/lib/dueText';
import { PANEL } from '@/components/hackathons/dashboardStyles';

export const ROUND_STATE: Record<JudgeRoundSummary['status'], { tone: PillTone; label: string }> = {
  NOT_STARTED: { tone: 'slate', label: 'Not open yet' },
  IN_PROGRESS: { tone: 'amber', label: 'Open for scoring' },
  CLOSED: { tone: 'green', label: 'Closed' },
};

/** The rounds this person has been asked to judge, each with their own progress. Shows nothing when there are none. */
export function JudgeRoundsPanel({ slug, onLoaded }: { slug: string; onLoaded?: (count: number) => void }) {
  const [rounds, setRounds] = useState<JudgeRoundSummary[] | null>(null);

  useEffect(() => {
    const settle = (list: JudgeRoundSummary[]) => { setRounds(list); onLoaded?.(list.length); };
    hackathonApi.judging.myRounds(slug).then((data) => settle(data.enabled ? data.rounds : [])).catch(() => settle([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!rounds || rounds.length === 0) return null;
  return (
    <section className="space-y-3" aria-label="Rounds you judge">
      <h2 className="flex items-center gap-2 text-lg font-bold text-journey-text"><Flag className="h-5 w-5 text-journey-accent" aria-hidden="true" /> Rounds you judge</h2>
      <ul className="space-y-3">
        {rounds.map((round) => {
          const state = ROUND_STATE[round.status];
          const percent = round.assigned ? Math.round((round.scored / round.assigned) * 100) : 0;
          return (
            <li key={round.round_id}>
              <Link
                href={`/hackathons/${slug}/judging/rounds/${round.round_id}`}
                className={`${PANEL} flex min-h-[4.5rem] items-center gap-3 transition hover:border-journey-accent/50`}
                aria-label={`${round.name}: ${round.scored} of ${round.assigned} scored`}
              >
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-journey-text">{round.name}</span>
                    <StatusPill tone={state.tone}>{state.label}</StatusPill>
                    {round.blind && <StatusPill tone="purple" icon={EyeOff}>Blind</StatusPill>}
                  </span>
                  <span className="block text-xs text-journey-muted">
                    {round.status === 'NOT_STARTED'
                      ? 'You will be told when scoring opens.'
                      : `${round.scored} of ${round.assigned} scored${round.recused ? ` · ${round.recused} stepped aside` : ''}${round.status === 'IN_PROGRESS' && describeDue(round.deadline) ? ` · ${describeDue(round.deadline)?.text.toLowerCase()}` : ''}`}
                  </span>
                  {round.status !== 'NOT_STARTED' && round.assigned > 0 && (
                    <span className="block h-1.5 overflow-hidden rounded-full bg-journey-text/10" aria-hidden="true">
                      <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-journey-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
