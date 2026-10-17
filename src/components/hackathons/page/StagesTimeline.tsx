'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { PublicStage } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { istDayMonth } from '@/lib/hackathonPage';
import {
  STAGE_ICONS,
  TONE_STYLES,
  relativeTo,
  stageStatus,
  type StageIconKey,
  type StageStatus,
  type StageTone,
} from './stageVisuals';

const LONG_DESCRIPTION = 280;

export function StageMarker({ stage, status }: { stage: PublicStage; status: StageStatus }) {
  const tone = TONE_STYLES[(stage.tone as StageTone) in TONE_STYLES ? (stage.tone as StageTone) : 'ORANGE'];
  const live = status === 'live';
  const ring = live ? 'ring-4 ring-emerald-500/30 animate-pulse' : '';

  if (stage.marker === 'DATE' && stage.starts_at) {
    const { day, month } = istDayMonth(stage.starts_at);
    return (
      <div className={`w-11 overflow-hidden rounded-lg border ${tone.border} text-center shadow-sm ${ring}`}>
        <div className={`${tone.solid} py-1 text-base font-extrabold leading-none`}>{day}</div>
        <div className={`${tone.soft} py-0.5 text-[10px] font-bold uppercase`}>{month}</div>
      </div>
    );
  }
  const Icon = STAGE_ICONS[(stage.icon as StageIconKey) in STAGE_ICONS ? (stage.icon as StageIconKey) : 'FLAG'].icon;
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${tone.solid} shadow-sm ${ring}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function StatusPill({ status }: { status: StageStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live now
      </span>
    );
  }
  if (status === 'next') return <span className="rounded-full bg-[#FF7A00]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#C25A00] dark:text-[#FFB066]">Up next</span>;
  if (status === 'done') return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">Completed</span>;
  return null;
}

/** One timeline entry. Used by the public page and by the admin live preview. */
export function StageEntry({
  stage,
  status,
  isLast,
  now,
}: {
  stage: PublicStage;
  status: StageStatus;
  isLast: boolean;
  now: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const tone = TONE_STYLES[(stage.tone as StageTone) in TONE_STYLES ? (stage.tone as StageTone) : 'ORANGE'];
  const description = stage.description?.trim() ?? '';
  const isLong = description.length > LONG_DESCRIPTION;

  const schedule = stage.starts_at || stage.ends_at
    ? `${stage.starts_at ? formatDateTime(stage.starts_at) : 'TBA'} → ${stage.ends_at ? formatDateTime(stage.ends_at) : 'TBA'}`
    : 'Dates to be announced';

  let hint = '';
  if (now !== null) {
    if (status === 'live' && stage.ends_at) hint = `Ends ${relativeTo(new Date(stage.ends_at).getTime(), now)}`;
    else if ((status === 'next' || status === 'upcoming') && stage.starts_at) hint = `Starts ${relativeTo(new Date(stage.starts_at).getTime(), now)}`;
  }

  return (
    <li className="flex gap-4">
      <div className="flex w-12 shrink-0 flex-col items-center">
        <StageMarker stage={stage} status={status} />
        {!isLast && (
          <div
            className={`mt-1 w-px flex-1 border-l ${status === 'done' ? `${tone.line} border-solid` : 'border-dashed border-slate-300 dark:border-slate-700'}`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2 pb-1">
        <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{schedule}</span>
          {hint && <span className="font-semibold text-[#C25A00] dark:text-[#FFB066]">· {hint}</span>}
        </p>
        <div
          className={`space-y-3 rounded-2xl border bg-white/70 p-5 dark:bg-white/[0.03] ${
            status === 'live' ? 'border-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]' : status === 'next' ? tone.border : 'border-slate-200 dark:border-white/10'
          } ${status === 'done' ? 'opacity-80' : ''}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">{stage.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={status} />
              {stage.badge && <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${tone.soft}`}>{stage.badge}</span>}
            </div>
          </div>

          {stage.location && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" /> {stage.location}
            </p>
          )}

          {description && (
            <div className="relative">
              <div className={`text-sm text-slate-600 dark:text-slate-300 ${isLong && !expanded ? 'max-h-28 overflow-hidden' : ''}`}>
                <MarkdownRenderer content={description} />
              </div>
              {isLong && !expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--background)] to-transparent" aria-hidden="true" />
              )}
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((open) => !open)}
                  aria-expanded={expanded}
                  className="mt-1 text-xs font-bold text-[#FF7A00] hover:underline"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {stage.link_url && stage.link_label && (
            <a
              href={stage.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition hover:opacity-90 active:scale-95 ${tone.solid}`}
            >
              {stage.link_label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/** Vertical timeline of the stages an admin curated for the public page. */
export function StagesTimeline({ stages }: { stages: PublicStage[] }) {
  // Time-dependent badges are filled in after mount so the server and client markup agree.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const statuses = stages.map((stage) => stageStatus(stage, now));
  const nextIndex = statuses.findIndex((status) => status === 'upcoming');
  if (nextIndex >= 0 && !statuses.includes('live')) statuses[nextIndex] = 'next';

  return (
    <ol className="space-y-6">
      {stages.map((stage, index) => (
        <StageEntry key={stage.id} stage={stage} status={statuses[index]} isLast={index === stages.length - 1} now={now} />
      ))}
    </ol>
  );
}
