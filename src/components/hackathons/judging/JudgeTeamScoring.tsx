'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, ExternalLink, Lock, UserMinus } from 'lucide-react';
import type { JudgeTeamView } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScoreInput } from './ScoreInput';
import { BTN_ACCENT, BTN_QUIET, PANEL } from '@/components/hackathons/dashboardStyles';

const TEXT = 'whitespace-pre-line text-sm text-journey-text/80';

type Draft = { scores: Record<string, string>; comment: string };

const draftKey = (slug: string, roundId: number, entryId: number) => `round-judging-draft:${slug}:${roundId}:${entryId}`;
function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
}
function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch { /* storage is a convenience only */ }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={`${PANEL} space-y-2`}><h2 className="text-sm font-bold uppercase tracking-wide text-journey-accent">{title}</h2>{children}</section>;
}

function ExternalLinks({ items }: { items: [string, string | null | undefined][] }) {
  const shown = items.filter(([, url]) => url);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-journey-accent">
      {shown.map(([label, url]) => (
        <a key={label} href={url as string} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 hover:underline sm:min-h-8">{label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
      ))}
    </div>
  );
}

function Material({ slug, team }: { slug: string; team: JudgeTeamView }) {
  const { problem, idea, project } = team.material;
  const [fileError, setFileError] = useState('');
  const downloadDeck = async () => {
    setFileError('');
    try {
      window.location.assign((await hackathonApi.ideaFileLink(slug, idea!.id, 'deck')).url);
    } catch (err) {
      setFileError(apiErrorMessage(err, 'Could not open the slides.'));
    }
  };
  const ideaSection = (
    <Section key="idea" title="The idea">
      {idea ? (
        <>
          <h3 className="text-lg font-bold text-journey-text">{idea.title}</h3>
          <p className={TEXT}><strong>Problem. </strong>{idea.problem}</p>
          <p className={TEXT}><strong>Approach. </strong>{idea.solution}</p>
          {idea.plan && <p className={TEXT}><strong>Plan. </strong>{idea.plan}</p>}
          {idea.tech_stack.length > 0 && <p className="text-xs text-journey-muted">Built with {idea.tech_stack.join(', ')}</p>}
          <ExternalLinks items={[['Slides link', idea.deck_url], ['LinkedIn post', idea.linkedin_url]]} />
          {idea.has_deck_file && (
            <button type="button" onClick={() => void downloadDeck()} className={`${BTN_QUIET} min-h-11 sm:min-h-0`}><Download className="h-3.5 w-3.5" aria-hidden="true" /> Download the slides</button>
          )}
          {fileError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{fileError}</p>}
        </>
      ) : <p className="text-sm text-journey-muted">This team has not submitted an idea.</p>}
    </Section>
  );
  const projectSection = (
    <Section key="project" title="The project">
      {project ? (
        <>
          <h3 className="text-lg font-bold text-journey-text">{project.title}</h3>
          {project.tagline && <p className="text-sm text-journey-muted">{project.tagline}</p>}
          <p className={TEXT}>{project.description}</p>
          {project.tech_stack.length > 0 && <p className="text-xs text-journey-muted">Built with {project.tech_stack.join(', ')}</p>}
          <ExternalLinks items={[['Repository', project.repo_url], ['Demo', project.demo_url], ['Video', project.video_url], ['Slides', project.slides_url]]} />
        </>
      ) : <p className="text-sm text-journey-muted">This team has not submitted a project.</p>}
    </Section>
  );
  return (
    <div className="space-y-4">
      {problem && (
        <Section title="The problem it tackles">
          <h3 className="text-base font-bold text-journey-text">{problem.title}</h3>
          {problem.domain && <p className="text-xs text-journey-muted">{problem.domain}</p>}
          <p className={TEXT}>{problem.description}</p>
        </Section>
      )}
      {team.scoring_target === 'IDEA' ? [ideaSection, projectSection] : [projectSection, ideaSection]}
    </div>
  );
}

interface JudgeTeamScoringProps {
  slug: string;
  roundId: number;
  team: JudgeTeamView;
  /** The next team still to score, for the "next" button after saving. */
  nextEntryId: number | null;
  /** Reload the team and the round after something changed. */
  onChanged: () => void;
}

/** Read one team and score it: every criterion, a running total, a draft that survives a lost connection, and a way to step aside. */
export function JudgeTeamScoring({ slug, roundId, team, nextEntryId, onChanged }: JudgeTeamScoringProps) {
  const { toast } = useToast();
  const key = draftKey(slug, roundId, team.entry_id);
  const saved = team.my_review;
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [reason, setReason] = useState('');

  // Start from what was saved; when nothing was, from a draft left on this device. Only when another team is opened: a reload after
  // this judge's own save brings the same numbers back and must not wipe the "Saved" message and the links to the next team.
  useEffect(() => {
    const draft = saved ? null : readDraft(key);
    setScores(Object.fromEntries(team.criteria.map((c) => [String(c.id), draft?.scores[String(c.id)] ?? (saved ? String(saved.scores[String(c.id)] ?? '') : '')])));
    setComment(draft?.comment ?? saved?.comment ?? '');
    setJustSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.entry_id]);

  const change = (nextScores: Record<string, string>, nextComment: string) => {
    setScores(nextScores);
    setComment(nextComment);
    setJustSaved(false);
    if (!saved) writeDraft(key, { scores: nextScores, comment: nextComment });
  };

  const total = useMemo(() => {
    const weight = team.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (!weight || team.criteria.some((c) => scores[String(c.id)] === '' || scores[String(c.id)] === undefined)) return null;
    const earned = team.criteria.reduce((sum, c) => sum + (Number(scores[String(c.id)]) / c.max_score) * c.weight, 0);
    return Math.round((earned / weight) * 1000) / 10;
  }, [scores, team.criteria]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await hackathonApi.judging.scoreRoundTeam(slug, roundId, team.entry_id, {
        scores: Object.fromEntries(Object.entries(scores).map(([id, value]) => [id, Number(value)])), comment,
      });
      writeDraft(key, null);
      setJustSaved(true);
      toast.success(`Scored ${team.label}`);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save your scores.'));
    } finally {
      setBusy(false);
    }
  };

  const stepAside = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await hackathonApi.judging.recuseRoundTeam(slug, roundId, team.entry_id, reason);
      writeDraft(key, null);
      toast.success('You stepped aside', result.reassigned ? 'The team was given to another judge.' : 'The organizers can see your reason.');
      setStepping(false);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not step aside.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
      <Material slug={slug} team={team} />

      <div className="space-y-5 lg:sticky lg:top-24">
      <section className={`${PANEL} space-y-4`} aria-label="Your scores">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-journey-accent">Your scores</h2>
          {saved && !justSaved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Scored {saved.total.toFixed(1)}</span>}
        </div>

        {team.recused ? (
          <p role="status" className="flex items-start gap-2 text-sm text-journey-muted"><UserMinus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> You stepped aside from this team{team.recused_reason ? `: ${team.recused_reason}` : '.'}</p>
        ) : !team.can_score ? (
          <>
            <p role="status" className="flex items-start gap-2 text-sm text-journey-muted"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Scoring is closed for this round, so scores are final.</p>
            {saved && (
              <ul className="space-y-1 text-sm text-journey-text/80">
                {team.criteria.map((c) => <li key={c.id}>{c.name}: <strong>{saved.scores[String(c.id)] ?? '-'}</strong> / {c.max_score}</li>)}
                <li className="pt-1 font-bold">Your total: {saved.total.toFixed(1)} / 100</li>
              </ul>
            )}
            {saved?.comment && <p className={TEXT}>{saved.comment}</p>}
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {team.criteria.map((criterion) => (
              <ScoreInput
                key={criterion.id} id={`round-score-${team.entry_id}-${criterion.id}`} criterion={criterion}
                value={scores[String(criterion.id)] ?? ''} onChange={(value) => change({ ...scores, [String(criterion.id)]: value }, comment)}
              />
            ))}
            <div className="space-y-1.5">
              <label htmlFor={`round-comment-${team.entry_id}`} className="text-sm font-semibold text-journey-text">Comment for the organizers (optional)</label>
              <textarea
                id={`round-comment-${team.entry_id}`} rows={3} maxLength={2000} value={comment} onChange={(e) => change(scores, e.target.value)}
                className="glass-panel block w-full rounded-xl border border-slate-300 px-3 py-2 text-base dark:border-slate-700 sm:text-sm"
              />
            </div>
            {!saved && readDraft(key) && <p className="text-xs text-journey-muted">A draft is kept on this device until you save.</p>}
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-journey-text/10 bg-[var(--background)]/90 px-5 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
              <p className="text-sm font-bold text-journey-text" aria-live="polite">Your total: {total === null ? 'fill in every score' : `${total.toFixed(1)} / 100`}</p>
              <div className="flex items-center gap-2">
                {justSaved && <span role="status" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved</span>}
                <ActionButton type="submit" pending={busy} className={`${BTN_ACCENT} min-h-11 px-5 sm:min-h-10`}>{saved ? 'Update my scores' : 'Save my scores'}</ActionButton>
              </div>
            </div>
          </form>
        )}

        {justSaved && (
          <div className="flex flex-wrap gap-2 border-t border-journey-text/10 pt-3">
            {nextEntryId !== null && <Link href={`/hackathons/${slug}/judging/rounds/${roundId}/teams/${nextEntryId}`} className={`${BTN_ACCENT} min-h-11 sm:min-h-0`}>Next team to score</Link>}
            <Link href={`/hackathons/${slug}/judging/rounds/${roundId}`} className={`${BTN_QUIET} min-h-11 sm:min-h-0`}>Back to my teams</Link>
          </div>
        )}
      </section>

      {team.can_score && !saved && !team.recused && (
        <section className={`${PANEL} space-y-3`} aria-label="Step aside">
          {stepping ? (
            <>
              <label htmlFor={`recuse-${team.entry_id}`} className="text-sm font-semibold text-journey-text">Why are you stepping aside?</label>
              <textarea
                id={`recuse-${team.entry_id}`} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
                className="glass-panel block w-full rounded-xl border border-slate-300 px-3 py-2 text-base dark:border-slate-700 sm:text-sm" placeholder="For example: I mentored this team"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void stepAside()} disabled={busy || !reason.trim()} className={`${BTN_ACCENT} min-h-11 sm:min-h-0`}>Step aside from this team</button>
                <button type="button" onClick={() => setStepping(false)} className={`${BTN_QUIET} min-h-11 sm:min-h-0`}>Cancel</button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => setStepping(true)} className={`${BTN_QUIET} min-h-11 sm:min-h-0`}><UserMinus className="h-3.5 w-3.5" aria-hidden="true" /> I know this team: step aside</button>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
