'use client';

import React, { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { Hackathon, HackathonRound } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FormSelect } from '@/components/ui/FormSelect';
import type { ConfirmOptions } from '@/components/ui/ConfirmDialog';
import { LABEL, PANEL } from './shared';

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

/** Thrown when the organizer says no to a confirmation: nothing changed, and it is not an error to report. */
class CancelledError extends Error {
  readonly cancelled = true;
}

export function isCancelled(error: unknown): boolean {
  return error instanceof CancelledError;
}
type RoundConfirmations = { confirm_published?: boolean; confirm_over_limit?: boolean };

/**
 * Runs a call that changes a round's results and, when the server asks for one of the round's confirmations
 * (results already published, more teams than the round's target), asks the organizer and repeats it.
 */
export async function withRoundConfirmations<T>(call: (flags: RoundConfirmations) => Promise<T>, confirm: Confirm, roundName: string): Promise<T> {
  const flags: RoundConfirmations = {};
  for (;;) {
    try {
      return await call({ ...flags });
    } catch (err: any) {
      const body = err?.body;
      if (body?.code === 'RESULTS_PUBLISHED' && !flags.confirm_published) {
        const ok = await confirm({
          title: 'Change a published result?',
          message: `${roundName} results are already published, so the team sees this change straight away and is notified.`,
          confirmLabel: 'Change it',
        });
        if (!ok) throw new CancelledError('Cancelled: nothing was changed.');
        flags.confirm_published = true;
      } else if (body?.code === 'SHORTLIST_LIMIT' && !flags.confirm_over_limit) {
        const ok = await confirm({
          title: 'Shortlist more teams than planned?',
          message: `${roundName} is meant to take ${body.limit} teams and this would make it ${body.would_be}.`,
          confirmLabel: 'Shortlist anyway',
        });
        if (!ok) throw new CancelledError('Cancelled: nothing was changed.');
        flags.confirm_over_limit = true;
      } else {
        throw err;
      }
    }
  }
}

/** The first round of kind "Idea review": what the picker suggests. */
export function suggestedIdeaRound(rounds: HackathonRound[]): HackathonRound | undefined {
  return [...rounds].sort((a, b) => a.order - b.order).find((round) => round.kind === 'IDEA_REVIEW');
}

interface IdeaRoundLinkPanelProps {
  hackathon: Hackathon;
  confirm: Confirm;
  /** The link changed: the hackathon (for `idea_round`) and the ideas list should be reloaded. */
  onLinked: () => void;
}

/** "Shortlisting round": idea reviews set this round's results, and final outcomes reach teams when it is published. */
export function IdeaRoundLinkPanel({ hackathon, confirm, onLinked }: IdeaRoundLinkPanelProps) {
  const slug = hackathon.slug;
  const { toast } = useToast();
  const [rounds, setRounds] = useState<HackathonRound[] | null>(null);
  const [roundsError, setRoundsError] = useState('');
  const [busy, setBusy] = useState(false);
  const linkedId = hackathon.idea_round ?? null;

  useEffect(() => {
    hackathonApi.admin.rounds(slug)
      .then((list) => { setRounds(list); setRoundsError(''); })
      .catch((err: any) => {
        setRounds([]);
        setRoundsError(err?.status === 403
          ? 'Linking a round needs the Rounds & Shortlisting permission as well.'
          : apiErrorMessage(err, 'Could not load the rounds.'));
      });
  }, [slug, linkedId]);

  if (rounds === null) return null;
  const linked = rounds.find((round) => round.id === linkedId);
  const suggested = suggestedIdeaRound(rounds);

  const change = async (value: string) => {
    const roundId = value ? Number(value) : null;
    if (roundId === linkedId) return;
    const target = rounds.find((round) => round.id === roundId);
    setBusy(true);
    try {
      if (target) {
        const plan = await hackathonApi.admin.linkIdeaRound(slug, { round: target.id, preview: true });
        const copies = plan.shortlisted + plan.rejected;
        const ok = await confirm({
          title: `Link ${target.name} to idea review?`,
          message: (
            <>
              From now on, approving an idea shortlists the team in {target.name} and rejecting it marks the team not shortlisted.
              Approvals and rejections reach the teams when {target.name} is published.
              {copies > 0 && <> The {copies} idea{copies === 1 ? '' : 's'} already reviewed ({plan.shortlisted} approved, {plan.rejected} rejected) are copied into the round now.</>}
              {plan.published && <> {target.name} is already published, so those teams see the change straight away.</>}
            </>
          ),
          confirmLabel: 'Link round',
        });
        if (!ok) return;
        await withRoundConfirmations((flags) => hackathonApi.admin.linkIdeaRound(slug, { round: target.id, ...flags }), confirm, target.name);
        toast.success(`Idea review now decides ${target.name}`, copies ? `${copies} result${copies === 1 ? '' : 's'} copied into the round.` : undefined);
      } else {
        await hackathonApi.admin.linkIdeaRound(slug, { round: null });
        toast.success('Idea review is no longer linked to a round', 'Reviews reach teams at once again.');
      }
      onLinked();
    } catch (err) {
      if (!isCancelled(err)) toast.error('Could not change the shortlisting round', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const options = [
    ...rounds.map((round) => ({ value: String(round.id), label: `${round.name}${round.id === suggested?.id && !linked ? ' (suggested)' : ''}` })),
  ];

  return (
    <section className={`${PANEL} space-y-3`} aria-label="Shortlisting round">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Link2 className="h-4 w-4 text-journey-accent" /> Shortlisting round</h3>
      <div className="max-w-sm">
        <p id="idea-round-label" className={LABEL}>Idea reviews decide</p>
        <FormSelect
          aria-labelledby="idea-round-label" placeholder="Not linked" value={linkedId ? String(linkedId) : ''}
          onChange={(value) => void change(value)} options={options} disabled={busy || rounds.length === 0}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {roundsError
          ? roundsError
          : rounds.length === 0
          ? 'Create a round (for example of kind "Idea review") in Rounds & Shortlisting to link it here.'
          : linked
            ? `Approved = shortlisted and rejected = not shortlisted in ${linked.name}. ${linked.results_published
              ? 'Its results are published, so new decisions reach the team at once.'
              : 'Teams see approvals and rejections when it is published; requests for changes reach them at once.'}`
            : 'Not linked: reviews reach the team at once and rounds are shortlisted separately.'}
      </p>
    </section>
  );
}
