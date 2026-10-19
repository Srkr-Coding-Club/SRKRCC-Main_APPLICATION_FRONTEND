'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Lightbulb, Lock, MessageSquareWarning, XCircle } from 'lucide-react';
import type { Hackathon, IdeaDraft, IdeaStatus, MyIdeaPayload } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { FieldLabel, SpotlightInput, SpotlightTextarea } from '@/components/ui/InputField';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { TagInput } from '@/components/ui/TagInput';
import { BTN_ACCENT, H2, PANEL } from './dashboardStyles';
import { formatDateTime } from './HackathonAnnouncementsFeed';

const EMPTY: IdeaDraft = { title: '', problem: '', solution: '', plan: '', tech_stack: [], deck_url: '' };
const TEXT_LIMIT = 3000;

const STATUS: Record<IdeaStatus, { tone: PillTone; label: string; Icon: React.ElementType }> = {
  SUBMITTED: { tone: 'amber', label: 'Waiting for review', Icon: Clock },
  APPROVED: { tone: 'green', label: 'Approved', Icon: CheckCircle2 },
  CHANGES_REQUESTED: { tone: 'orange', label: 'Changes requested', Icon: MessageSquareWarning },
  REJECTED: { tone: 'red', label: 'Not accepted', Icon: XCircle },
};

const toDraft = (payload: MyIdeaPayload): IdeaDraft => {
  const idea = payload.idea;
  return idea ? { title: idea.title, problem: idea.problem, solution: idea.solution, plan: idea.plan, tech_stack: idea.tech_stack, deck_url: idea.deck_url ?? '' } : EMPTY;
};

/** Phase 1 of the hackathon: describe the plan before building it. */
export function IdeaPanel({ hackathon }: { hackathon: Hackathon }) {
  const { toast } = useToast();
  const slug = hackathon.slug;
  const [payload, setPayload] = useState<MyIdeaPayload | null>(null);
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    hackathonApi.myIdea(slug).then((data) => { setPayload(data); setDraft(toDraft(data)); }).catch((err) => setLoadError(apiErrorMessage(err)));
  }, [slug]);

  useEffect(load, [load]);

  const set = <K extends keyof IdeaDraft>(key: K, value: IdeaDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const saved = await hackathonApi.saveIdea(slug, draft);
      setPayload(saved);
      setDraft(toDraft(saved));
      toast.success(saved.review_required ? 'Idea sent for review' : 'Idea saved');
    } catch (err: any) {
      const field = err?.body?.field as string | undefined;
      setErrors({ [field ?? 'form']: apiErrorMessage(err) });
      load();
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <section className={PANEL}><p className="text-sm text-rose-500">{loadError}</p></section>;
  if (!payload) return <section className={`${PANEL} h-40 animate-pulse`} aria-busy="true" />;

  const idea = payload.idea;
  const status = idea ? STATUS[idea.status] : null;
  const fieldError = (key: keyof IdeaDraft) => errors[key] && <p className="text-xs text-rose-500">{errors[key]}</p>;

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={H2}><Lightbulb className="h-4 w-4" /> Phase 1: your idea</h2>
        <div className="flex flex-wrap items-center gap-2">
          {status && <StatusPill tone={status.tone} icon={status.Icon}>{status.label}</StatusPill>}
          {payload.state === 'OPEN' && payload.deadline && <StatusPill tone="amber" icon={Clock}>Due {formatDateTime(payload.deadline)}</StatusPill>}
          {payload.state === 'CLOSED' && <StatusPill tone="slate" icon={Lock}>Closed</StatusPill>}
          {payload.state === 'NOT_OPEN' && <StatusPill tone="slate" icon={Clock}>Opens {formatDateTime(payload.opens_at)}</StatusPill>}
        </div>
      </div>

      <p className="text-xs text-journey-muted">
        Describe the problem, your approach and a plan first.
        {payload.review_required ? ' The organizers review it' : ' It is accepted as soon as you submit it'}
        {payload.project_requires_idea ? ', and your project can only be submitted once your idea is accepted.' : '.'}
      </p>

      {idea?.status === 'CHANGES_REQUESTED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-orange-500/10 px-3 py-2 text-sm text-orange-800 dark:text-orange-200"><strong>The organizers asked for changes:</strong> {idea.feedback}</p>
      )}
      {idea?.status === 'REJECTED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"><strong>Why it was not accepted:</strong> {idea.feedback}</p>
      )}
      {idea?.status === 'APPROVED' && idea.feedback && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"><strong>Note from the organizers:</strong> {idea.feedback}</p>
      )}

      {payload.can_edit ? (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-title" required>Idea title</FieldLabel>
            <SpotlightInput id="idea-title" value={draft.title} maxLength={200} onChange={(e) => set('title', e.target.value)} hasError={!!errors.title} />
            {fieldError('title')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-problem" required>The problem</FieldLabel>
            <SpotlightTextarea id="idea-problem" rows={4} value={draft.problem} maxLength={TEXT_LIMIT} onChange={(e) => set('problem', e.target.value)} hasError={!!errors.problem} placeholder="Who has this problem, and why does it matter?" />
            {fieldError('problem')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-solution" required>Your approach</FieldLabel>
            <SpotlightTextarea id="idea-solution" rows={4} value={draft.solution} maxLength={TEXT_LIMIT} onChange={(e) => set('solution', e.target.value)} hasError={!!errors.solution} placeholder="What will you build and how will it work?" />
            {fieldError('solution')}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="idea-plan">The plan</FieldLabel>
            <SpotlightTextarea id="idea-plan" rows={4} value={draft.plan} maxLength={TEXT_LIMIT} onChange={(e) => set('plan', e.target.value)} placeholder="Milestones, who does what, what you will have working by the end." />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-tech">Tech you plan to use</FieldLabel>
              <TagInput id="idea-tech" value={draft.tech_stack} onChange={(tags) => set('tech_stack', tags)} placeholder="Press Enter to add" maxTags={10} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="idea-deck">Slides (optional)</FieldLabel>
              <SpotlightInput id="idea-deck" type="url" value={draft.deck_url} onChange={(e) => set('deck_url', e.target.value)} placeholder="https://…" hasError={!!errors.deck_url} />
              {fieldError('deck_url')}
            </div>
          </div>
          {errors.form && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{errors.form}</p>}
          <button type="submit" disabled={busy} className={BTN_ACCENT}>
            {busy ? 'Saving…' : idea ? (idea.status === 'CHANGES_REQUESTED' ? 'Resubmit idea' : 'Save changes') : 'Submit idea'}
          </button>
        </form>
      ) : idea ? (
        <div className="space-y-3 text-sm">
          <h3 className="text-base font-bold text-journey-text">{idea.title}</h3>
          {[['The problem', idea.problem], ['Your approach', idea.solution], ['The plan', idea.plan]].map(([label, text]) => text && (
            <div key={label}><p className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">{label}</p><p className="whitespace-pre-line text-journey-text/80">{text}</p></div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-journey-muted">
          {payload.state === 'CLOSED' ? 'The idea deadline passed without a submission.' : payload.state === 'NOT_OPEN' ? `Idea submission opens ${formatDateTime(payload.opens_at)}.` : 'Only your team leader can submit the idea.'}
        </p>
      )}
    </section>
  );
}
