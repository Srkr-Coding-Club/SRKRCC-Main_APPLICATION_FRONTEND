'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquareText, ThumbsUp, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { eventFeedbackApi } from '@/lib/api/events';
import { apiErrorMessage } from '@/lib/api/hackathons';
import type { EventFeedbackSummary } from '@/lib/types';

const RATINGS = ['5', '4', '3', '2', '1'] as const;
const percent = (value: number | null) => (value === null ? 'n/a' : `${Math.round(value * 100)}%`);

interface EventFeedbackPanelProps {
  event: { slug: string; title: string } | null;
  onClose: () => void;
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

/** What attendees said about one event: the score, who answered, the spread and the written answers. */
export function EventFeedbackPanel({ event, onClose }: EventFeedbackPanelProps) {
  const slug = event?.slug;
  const [summary, setSummary] = useState<EventFeedbackSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(null);
    setError('');
    if (!slug) return;
    let cancelled = false;
    eventFeedbackApi.summary(slug)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((err) => { if (!cancelled) setError(apiErrorMessage(err, 'Could not load the feedback.')); });
    return () => { cancelled = true; };
  }, [slug]);

  const tallest = summary ? Math.max(1, ...RATINGS.map((rating) => summary.distribution[rating])) : 1;

  return (
    <Modal isOpen={event !== null} onClose={onClose} title={event ? `Feedback: ${event.title}` : 'Feedback'} icon={MessageSquareText} maxWidth="max-w-2xl">
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!error && !summary && <p aria-busy="true" className="py-6 text-center text-sm text-slate-500">Loading…</p>}
      {summary && event && (
        <div className="space-y-5">
          {!summary.ended && <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">This event has not ended yet, so attendees cannot give feedback.</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat icon={MessageSquareText} label="Average rating" value={summary.average_rating === null ? 'n/a' : `${summary.average_rating.toFixed(1)} / 5`} hint={`${summary.count} answer${summary.count === 1 ? '' : 's'}`} />
            <Stat icon={ThumbsUp} label="Would recommend" value={percent(summary.recommend_rate)} />
            <Stat icon={Users} label="Response rate" value={percent(summary.response_rate)} hint={`${summary.count} of ${summary.attendees} checked in`} />
          </div>

          <section aria-label="Ratings spread" className="space-y-1.5">
            {RATINGS.map((rating) => (
              <div key={rating} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 font-semibold text-slate-600 dark:text-slate-300">{rating} star{rating === '1' ? '' : 's'}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-[#8B2E3B]" style={{ width: `${(summary.distribution[rating] / tallest) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums text-slate-500 dark:text-slate-400">{summary.distribution[rating]}</span>
              </div>
            ))}
          </section>

          <section aria-label="Written answers" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Written answers ({summary.comments.length})</h3>
              <ExportMenu subject="feedback" disabled={summary.count === 0} onExport={(format) => eventFeedbackApi.exportFile(event.slug, format)} />
            </div>
            {summary.comments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nobody has written anything yet.</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {summary.comments.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.name} · {item.rating}/5</p>
                    {item.went_well && <p className="mt-1 text-slate-700 dark:text-slate-300"><span className="font-semibold">Went well:</span> {item.went_well}</p>}
                    {item.to_improve && <p className="mt-1 text-slate-700 dark:text-slate-300"><span className="font-semibold">Could be better:</span> {item.to_improve}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
