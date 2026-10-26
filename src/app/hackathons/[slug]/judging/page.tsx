'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ExternalLink, Gavel, Lightbulb } from 'lucide-react';
import type { JudgeReview, JudgingIdeasPayload, JudgingPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useRequireLogin } from '@/lib/hooks/useRequireLogin';
import { useToast } from '@/context/ToastContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { BTN_ACCENT, PANEL } from '@/components/hackathons/dashboardStyles';

type Criteria = JudgingPayload['criteria'];
type Kind = 'PROJECT' | 'IDEA';

interface ReviewFormProps {
  itemId: number;
  teamName: string;
  criteria: Criteria;
  existing: JudgeReview | null;
  save: (scores: Record<string, number>, comment: string) => Promise<unknown>;
  onSaved: () => void;
}

function ReviewForm({ itemId, teamName, criteria, existing, save, onSaved }: ReviewFormProps) {
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(criteria.map((criterion) => [String(criterion.id), existing ? String(existing.scores[String(criterion.id)] ?? '') : ''])),
  );
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save(Object.fromEntries(Object.entries(scores).map(([id, value]) => [id, Number(value)])), comment);
      toast.success(`Scored ${teamName}`);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-journey-text/10 pt-4">
      {criteria.map((criterion) => {
        const id = `score-${itemId}-${criterion.id}`;
        return (
          <div key={criterion.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <label htmlFor={id} className="min-w-0 text-sm">
              <span className="font-semibold text-journey-text">{criterion.name}</span>
              <span className="ml-2 text-xs text-journey-muted">weight {criterion.weight}</span>
              {criterion.description && <span className="block text-xs text-journey-muted">{criterion.description}</span>}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id={id}
                type="number"
                inputMode="decimal"
                required
                min={0}
                max={criterion.max_score}
                step="0.5"
                value={scores[String(criterion.id)] ?? ''}
                onChange={(e) => setScores((current) => ({ ...current, [String(criterion.id)]: e.target.value }))}
                className="h-11 w-20 rounded-lg border border-journey-text/20 bg-transparent px-2 text-center text-sm text-journey-text focus:border-journey-accent focus:outline-none"
              />
              <span className="text-xs text-journey-muted">/ {criterion.max_score}</span>
            </div>
          </div>
        );
      })}
      <div className="space-y-1.5">
        <label htmlFor={`comment-${itemId}`} className="text-sm font-semibold text-journey-text">Comment for the organizers</label>
        <textarea id={`comment-${itemId}`} rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="glass-panel block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" />
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <button type="submit" disabled={busy} className={BTN_ACCENT}>{busy ? 'Saving…' : existing ? 'Update my scores' : 'Save my scores'}</button>
    </form>
  );
}

function Links({ items }: { items: (string | null | undefined)[][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-journey-accent">
      {items.map(([label, url]) => url && (
        <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:underline">{label}<ExternalLink className="h-3 w-3" /></a>
      ))}
    </div>
  );
}

const TEXT = 'whitespace-pre-line text-sm text-journey-text/80';

export default function JudgingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const signedIn = useRequireLogin(`/hackathons/${slug}/judging`);
  const [kind, setKind] = useState<Kind>('PROJECT');
  const [projects, setProjects] = useState<JudgingPayload | null>(null);
  const [ideas, setIdeas] = useState<JudgingIdeasPayload | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    hackathonApi.judging.list(slug)
      .then((payload) => { setProjects(payload); setError(''); if (payload.ideas_scoring) hackathonApi.judging.ideas(slug).then(setIdeas).catch(() => setIdeas(null)); })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the submissions.')));
  }, [slug]);

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);

  const data = kind === 'IDEA' ? ideas : projects;
  const rubricMissing = data ? data.criteria.length === 0 : false;
  const scoredCount = data?.reviewed ?? 0;
  const total = data?.total ?? 0;
  const switchKind = (next: Kind) => { setKind(next); setOpenId(null); };

  return (
    <div className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Link href={`/hackathons/${slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-journey-muted sm:min-h-8 hover:text-journey-accent"><ArrowLeft className="h-4 w-4" /> Hackathon page</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-journey-text sm:text-3xl"><Gavel className="h-6 w-6 text-journey-accent" /> Judging</h1>
            <p className="text-sm text-journey-muted">Score each {kind === 'IDEA' ? 'idea' : 'project'} on every criterion. You can change your scores until the organizers publish results.</p>
          </div>
          {data && <StatusPill tone={scoredCount === total && total > 0 ? 'green' : 'amber'}>{scoredCount} of {total} scored</StatusPill>}
        </div>

        {projects?.ideas_scoring && (
          <div role="tablist" aria-label="What to score" className="inline-flex rounded-xl border border-journey-text/15 p-1">
            {(['PROJECT', 'IDEA'] as const).map((item) => (
              <button key={item} type="button" role="tab" aria-selected={kind === item} onClick={() => switchKind(item)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition sm:min-h-9 ${kind === item ? 'bg-journey-accent text-journey-on-accent' : 'text-journey-muted hover:text-journey-text'}`}>
                {item === 'PROJECT' ? <Gavel className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />} {item === 'PROJECT' ? 'Projects' : 'Ideas'}
              </button>
            ))}
          </div>
        )}

        {error && <p role="alert" className={`${PANEL} text-sm text-rose-600 dark:text-rose-400`}>{error}</p>}
        {data && !data.enabled && <p className={`${PANEL} text-sm text-journey-muted`}>Judging is not switched on for this hackathon.</p>}
        {data && data.enabled && rubricMissing && <p className={`${PANEL} text-sm text-journey-muted`}>The organizers have not set the scoring criteria yet. Check back soon.</p>}
        {data && data.enabled && total === 0 && !rubricMissing && <p className={`${PANEL} text-sm text-journey-muted`}>Nothing has been submitted yet.</p>}

        {kind === 'PROJECT' && projects && projects.enabled && !rubricMissing && (
          <ul className="space-y-4">
            {projects.submissions.map((submission) => {
              const open = openId === submission.id;
              return (
                <li key={submission.id} className={`${PANEL} space-y-3`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-journey-text">{submission.project_title}</h2>
                      <p className="text-xs text-journey-muted">{submission.team_name}{submission.tagline ? ` · ${submission.tagline}` : ''}</p>
                    </div>
                    {submission.my_review && <StatusPill tone="green" icon={CheckCircle2}>You gave {submission.my_review.total.toFixed(1)}</StatusPill>}
                  </div>
                  <p className={TEXT}>{submission.description}</p>
                  {submission.tech_stack.length > 0 && <p className="text-xs text-journey-muted">Built with {submission.tech_stack.join(', ')}</p>}
                  <Links items={[['Repository', submission.repo_url], ['Demo', submission.demo_url], ['Video', submission.video_url], ['Slides', submission.slides_url]]} />
                  {submission.is_own_team ? (
                    <p className="text-xs text-journey-muted">This is your own team, so you cannot score it.</p>
                  ) : open ? (
                    <ReviewForm
                      itemId={submission.id} teamName={submission.team_name} criteria={projects.criteria} existing={submission.my_review}
                      save={(scores, comment) => hackathonApi.judging.review(slug, submission.id, { scores, comment })}
                      onSaved={() => { setOpenId(null); load(); }}
                    />
                  ) : (
                    <button type="button" onClick={() => setOpenId(submission.id)} className={BTN_ACCENT}>{submission.my_review ? 'Edit my scores' : 'Score this project'}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {kind === 'IDEA' && ideas && ideas.enabled && !rubricMissing && (
          <ul className="space-y-4">
            {ideas.ideas.map((idea) => {
              const open = openId === idea.id;
              return (
                <li key={idea.id} className={`${PANEL} space-y-3`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-journey-text">{idea.title}</h2>
                      <p className="text-xs text-journey-muted">{idea.team_name}</p>
                    </div>
                    {idea.my_review && <StatusPill tone="green" icon={CheckCircle2}>You gave {idea.my_review.total.toFixed(1)}</StatusPill>}
                  </div>
                  {[['The problem', idea.problem], ['The approach', idea.solution], ['The plan', idea.plan]].map(([label, text]) => text && (
                    <div key={label}><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">{label}</p><p className={TEXT}>{text}</p></div>
                  ))}
                  {idea.tech_stack.length > 0 && <p className="text-xs text-journey-muted">Planned tech: {idea.tech_stack.join(', ')}</p>}
                  <Links items={[['Slides link', idea.deck_url], ['LinkedIn post', idea.linkedin_url]]} />
                  {idea.deck_file && (
                    <button type="button" onClick={() => hackathonApi.ideaFileLink(slug, idea.id, 'deck').then((link) => window.location.assign(link.url)).catch((err) => toast.error('Could not open the slides', apiErrorMessage(err)))}
                      className="inline-flex min-h-8 items-center gap-1 text-xs font-bold text-journey-accent hover:underline">
                      Presentation ({idea.deck_file.name})<ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                  {idea.is_own_team ? (
                    <p className="text-xs text-journey-muted">This is your own team, so you cannot score it.</p>
                  ) : open ? (
                    <ReviewForm
                      itemId={idea.id} teamName={idea.team_name} criteria={ideas.criteria} existing={idea.my_review}
                      save={(scores, comment) => hackathonApi.judging.reviewIdea(slug, idea.id, { scores, comment })}
                      onSaved={() => { setOpenId(null); load(); }}
                    />
                  ) : (
                    <button type="button" onClick={() => setOpenId(idea.id)} className={BTN_ACCENT}>{idea.my_review ? 'Edit my scores' : 'Score this idea'}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
