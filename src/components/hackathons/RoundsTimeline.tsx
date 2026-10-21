'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, FileText, Flag } from 'lucide-react';
import type { ParticipantRound } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ENTRY_STATUS_PILL, ROUND_STATUS_PILL, StatusPill } from '@/components/ui/StatusPill';
import { ROUND_KIND_LABEL } from '@/components/admin/hackathon/roundKinds';
import { formatDateTime } from './HackathonAnnouncementsFeed';

export function RoundsTimeline({ rounds, isLeader }: { rounds: ParticipantRound[]; isLeader: boolean }) {
  if (rounds.length === 0) {
    return <p className="py-6 text-center text-sm text-journey-muted">Rounds will appear here once the organizers announce them.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-journey-text/10 pl-6">
      {rounds.map((r) => {
        const entry = r.entry;
        const outcome = entry && r.results_published ? ENTRY_STATUS_PILL[entry.status] : null;
        const dot = outcome?.tone === 'green' ? 'bg-emerald-500' : outcome?.tone === 'red' ? 'bg-rose-500' : r.effective_status === 'ACTIVE' ? 'bg-journey-accent' : 'bg-journey-text/25';
        const schedule = r.starts_at || r.ends_at
          ? `${r.starts_at ? formatDateTime(r.starts_at) : 'TBA'} → ${r.ends_at ? formatDateTime(r.ends_at) : 'TBA'}`
          : null;
        const form = r.details_form;
        const formOpen = form?.status === 'PUBLISHED';

        return (
          <li key={r.id} className="relative">
            <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-[var(--background)] ${dot}`} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-journey-muted">Round {r.order}</span>
                <h4 className="font-bold text-journey-text">{r.name}</h4>
                {r.kind !== 'GENERAL' && <span className="rounded-full border border-journey-text/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-journey-muted">{ROUND_KIND_LABEL[r.kind]}</span>}
                <StatusPill tone={ROUND_STATUS_PILL[r.effective_status].tone}>{ROUND_STATUS_PILL[r.effective_status].label}</StatusPill>
                {entry && (outcome
                  ? <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill>
                  : <StatusPill tone="slate">Results pending</StatusPill>)}
              </div>
              {schedule && (
                <p className="flex items-center gap-1.5 text-xs text-journey-muted"><CalendarClock className="h-3.5 w-3.5" /> {schedule}</p>
              )}
              {r.description?.trim() && (
                <div className="text-sm text-journey-text/80"><MarkdownRenderer content={r.description} /></div>
              )}
              {!entry && r.effective_status !== 'UPCOMING' && (
                <p className="text-xs text-journey-muted">Your team is not part of this round.</p>
              )}
              {entry && r.results_published && entry.feedback?.trim() && (
                <div className="rounded-lg border border-journey-text/10 bg-journey-text/[0.03] px-3 py-2 text-xs">
                  <p className="font-bold uppercase tracking-wide text-[10px] text-journey-muted mb-1">Feedback from organizers</p>
                  <p className="whitespace-pre-line text-journey-text/80">{entry.feedback}</p>
                </div>
              )}
              {form && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-journey-accent/30 bg-journey-accent/5 px-3 py-2.5">
                  <FileText className="h-4 w-4 text-journey-accent" />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-journey-text">{form.title}</p>
                    <p className="text-journey-muted">
                      {entry?.details_submitted
                        ? 'Submitted. Your leader can still update it while the form is open.'
                        : 'Shortlisted teams must submit these details.'}
                      {form.close_at && ` Deadline: ${formatDateTime(form.close_at)}.`}
                    </p>
                  </div>
                  {entry?.details_submitted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {isLeader && form.can_submit && formOpen ? (
                    <Link
                      href={`/forms/${form.slug}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-journey-accent px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition active:scale-95"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {entry?.details_submitted ? 'Update details' : 'Submit details'}
                    </Link>
                  ) : !isLeader ? (
                    <span className="text-[11px] font-semibold text-journey-muted">Your team leader submits this</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-journey-muted">Form not open</span>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
