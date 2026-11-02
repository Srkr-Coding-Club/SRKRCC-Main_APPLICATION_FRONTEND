'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { eventFeedbackApi } from '@/lib/api/events';
import { apiErrorMessage } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import type { EventFeedbackBlock, EventFeedbackInput, EventFeedbackState } from '@/lib/types';

const COMMENT_LIMIT = 500;
const RATINGS = [1, 2, 3, 4, 5] as const;
const RATING_WORDS: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

const BLOCKED_COPY: Record<EventFeedbackBlock, string> = {
  EVENT_NOT_ENDED: 'Feedback opens once the event has ended.',
  NOT_ATTENDED: 'Feedback is for people who were checked in at the event.',
};

const EMPTY: EventFeedbackInput = { rating: 0, would_recommend: true, went_well: '', to_improve: '' };

const FIELD = 'w-full rounded-lg border border-journey-text/15 bg-white px-3 py-2 text-sm text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent/40 dark:bg-slate-900';

interface EventFeedbackFormProps {
  slug: string;
  /** Called after the answer was saved, so a surrounding dialog can close or refresh. */
  onSaved?: () => void;
}

/** The attendee's rating form for one finished event: loads what they may do, then saves or changes their answer. */
export function EventFeedbackForm({ slug, onSaved }: EventFeedbackFormProps) {
  const { toast } = useToast();
  const [state, setState] = useState<EventFeedbackState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<EventFeedbackInput>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    eventFeedbackApi.mine(slug)
      .then((next) => { setState(next); setDraft(next.feedback ?? EMPTY); setEditing(!next.feedback); })
      .catch((err) => setLoadError(apiErrorMessage(err, 'Could not load the feedback form.')));
  }, [slug]);

  useEffect(load, [load]);

  const set = <K extends keyof EventFeedbackInput>(key: K, value: EventFeedbackInput[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.rating < 1) { setError('Choose a rating from 1 to 5.'); return; }
    setSaving(true);
    setError('');
    try {
      const saved = await eventFeedbackApi.save(slug, draft);
      setState((current) => (current ? { ...current, feedback: saved } : current));
      setEditing(false);
      toast.success('Thanks for your feedback', 'The organizers will read it.');
      onSaved?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save your feedback.'));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div role="alert" className="space-y-2 text-sm text-journey-text/80">
        <p>{loadError}</p>
        <button type="button" onClick={load} className="font-bold text-journey-accent hover:underline">Try again</button>
      </div>
    );
  }
  if (!state) {
    return <div aria-busy="true" className="flex items-center gap-2 py-4 text-sm text-journey-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!state.eligible && state.reason) {
    return <p role="status" className="py-2 text-sm text-journey-muted">{BLOCKED_COPY[state.reason]}</p>;
  }
  if (!editing && state.feedback) {
    return (
      <div role="status" className="space-y-3 text-sm">
        <p className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> You rated this event {state.feedback.rating} out of 5.</p>
        <button type="button" onClick={() => setEditing(true)} className="font-bold text-journey-accent hover:underline">Change my answer</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-journey-text">How was the event?</legend>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating out of 5">
          {RATINGS.map((value) => (
            <label key={value} className="relative cursor-pointer rounded-md p-1 focus-within:ring-2 focus-within:ring-journey-accent/60">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={draft.rating === value}
                onChange={() => set('rating', value)}
                className="sr-only"
                aria-label={`${value} out of 5, ${RATING_WORDS[value]}`}
              />
              <Star className={`h-8 w-8 transition ${value <= draft.rating ? 'fill-journey-accent text-journey-accent' : 'text-journey-text/25'}`} aria-hidden="true" />
            </label>
          ))}
          <span className="ml-2 text-xs font-semibold text-journey-muted" aria-live="polite">{draft.rating ? RATING_WORDS[draft.rating] : ''}</span>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-journey-text">Would you recommend it to a friend?</legend>
        <div className="flex gap-2">
          {[true, false].map((answer) => (
            <label key={String(answer)} className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold focus-within:ring-2 focus-within:ring-journey-accent/60 sm:min-h-9 ${draft.would_recommend === answer ? 'border-journey-accent bg-journey-accent/10 text-journey-accent' : 'border-journey-text/15 text-journey-text/80'}`}>
              <input type="radio" name="recommend" checked={draft.would_recommend === answer} onChange={() => set('would_recommend', answer)} className="sr-only" />
              {answer ? 'Yes' : 'No'}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="feedback-well" className="text-sm font-bold text-journey-text">What went well? <span className="font-normal text-journey-muted">(optional)</span></label>
        <textarea id="feedback-well" value={draft.went_well} maxLength={COMMENT_LIMIT} rows={3} onChange={(e) => set('went_well', e.target.value)} className={FIELD} />
        <p className="text-right text-[11px] text-journey-muted">{draft.went_well.length}/{COMMENT_LIMIT}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="feedback-improve" className="text-sm font-bold text-journey-text">What could be better? <span className="font-normal text-journey-muted">(optional)</span></label>
        <textarea id="feedback-improve" value={draft.to_improve} maxLength={COMMENT_LIMIT} rows={3} onChange={(e) => set('to_improve', e.target.value)} className={FIELD} />
        <p className="text-right text-[11px] text-journey-muted">{draft.to_improve.length}/{COMMENT_LIMIT}</p>
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-journey-accent px-4 py-2 text-sm font-bold text-journey-on-accent transition hover:opacity-90 active:scale-95 disabled:opacity-50 sm:min-h-9">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {state.feedback ? 'Save changes' : 'Send feedback'}
        </button>
        {state.feedback && <button type="button" onClick={() => { setDraft(state.feedback ?? EMPTY); setEditing(false); setError(''); }} className="min-h-11 px-3 text-sm font-bold text-journey-muted hover:text-journey-text sm:min-h-9">Cancel</button>}
      </div>
    </form>
  );
}
