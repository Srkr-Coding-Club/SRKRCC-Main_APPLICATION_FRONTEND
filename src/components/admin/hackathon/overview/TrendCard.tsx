'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { cumulative, istText, projection, type Projection } from '@/lib/hackathonOverview';
import type { HackathonAnalytics } from '@/lib/types';
import { PANEL } from '../shared';

const DEFAULT_W = 640;
const H = 190;
const PAD = { left: 40, right: 16, top: 14, bottom: 28 };
const DAY = 86_400_000;
const shortDate = (date: Date) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(date);

function sentence(plan: Projection | null, limit: number | null, closes: Date | null): string {
  if (!plan) return 'Not enough sign-ups yet to say where this is heading.';
  if (plan.state === 'full') return 'The participant limit has been reached.';
  const close = closes ? ` by ${shortDate(closes)}` : '';
  if (plan.state === 'fills' && plan.fullOn) return `At this pace you reach the limit of ${limit} on ${shortDate(plan.fullOn)}.`;
  if (plan.state === 'short') return `At this pace you reach about ${plan.projected} of ${limit}${close}: ${Math.max((limit ?? 0) - plan.projected, 0)} short.`;
  return `At this pace you reach about ${plan.projected}${close}.`;
}

/** "Last edition had 28 teams at this point; you have 31": ahead or behind the edition this one was cloned from. */
function EditionNote({ analytics }: { analytics: HackathonAnalytics }) {
  const prev = analytics.previous_edition;
  if (!prev) return null;
  const now = analytics.capacity.placed_participants;
  const gap = now - prev.participants_then;
  const verdict = gap === 0 ? 'level with it' : gap > 0 ? `${gap} ahead` : `${-gap} behind`;
  return (
    <p className="rounded-lg bg-journey-text/[0.04] px-3 py-2 text-xs text-journey-text" data-testid="edition-note">
      <strong>{prev.title}</strong> had {prev.participants_then} {prev.participants_then === 1 ? 'person' : 'people'} in {prev.teams_then} {prev.teams_then === 1 ? 'team' : 'teams'} at this point, and {prev.participants_final} in {prev.teams_final} by the end. You have {now}: <strong className={gap < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>{verdict}</strong>.
    </p>
  );
}

interface TrendCardProps {
  analytics: HackathonAnalytics;
  /** When registration closes (or the event ends when nothing closes): where the projection runs to. */
  endsAt: Date | null;
  now: Date;
}

/** People joining teams, as a running total with dates, the participant limit and where it is heading at the last week's pace. */
export function TrendCard({ analytics, endsAt, now }: TrendCardProps) {
  // Drawn at the real width so text and dots keep their size on a phone and on a wide screen alike.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(([entry]) => { const width = Math.round(entry.contentRect.width); if (width > 120) setW(width); });
    watch.observe(node);
    return () => watch.disconnect();
  }, []);
  const points = cumulative(analytics.joined_per_day);
  const limit = analytics.capacity.max_participants;
  const total = points.at(-1)?.total ?? 0;
  const plan = projection({ days: analytics.joined_per_day, total, limit, endsAt, now });
  const lastWeek = analytics.joined_per_day.filter((day) => new Date(`${day.date}T00:00:00Z`).getTime() >= now.getTime() - 7 * DAY).reduce((sum, day) => sum + day.count, 0);

  if (points.length === 0) {
    return (
      <section className={`${PANEL} space-y-2`} aria-label="Sign-ups over time">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><TrendingUp className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Sign-ups over time</h3>
        <p className="text-sm text-journey-muted">Nobody has joined a team yet.</p>
      </section>
    );
  }

  const first = new Date(`${points[0].date}T00:00:00Z`).getTime();
  const lastDay = new Date(`${points.at(-1)!.date}T00:00:00Z`).getTime();
  const end = Math.max(lastDay, first + DAY);
  const top = Math.max(total, limit ?? 0, 1);
  const x = (time: number) => PAD.left + ((time - first) / (end - first)) * (W - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - value / top) * (H - PAD.top - PAD.bottom);
  const coords = points.map((point) => [x(new Date(`${point.date}T00:00:00Z`).getTime()), y(point.total)] as const);
  const line = coords.map(([cx, cy], index) => `${index === 0 ? 'M' : 'L'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ');
  const area = `${line} L${coords.at(-1)![0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${coords[0][0].toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;
  const ticks = end - first <= 2 * DAY ? [first, end] : [first, first + (end - first) / 2, end];

  return (
    <section className={`${PANEL} space-y-3`} aria-label="Sign-ups over time">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><TrendingUp className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Sign-ups over time</h3>
        <p className="text-xs text-journey-muted"><strong className="text-base tabular-nums text-journey-text">{total}</strong> in teams{limit ? ` of ${limit}` : ''} · <strong className="tabular-nums text-journey-text">+{lastWeek}</strong> in the last 7 days</p>
      </div>
      <div ref={box} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={`${total} people in teams${limit ? ` of a limit of ${limit}` : ''}, ${lastWeek} joined in the last 7 days. ${sentence(plan, limit, endsAt)}`}>
        <title>Running total of people in teams, by day</title>
        {[0, 0.5, 1].map((fraction) => <line key={fraction} x1={PAD.left} x2={W - PAD.right} y1={y(top * fraction)} y2={y(top * fraction)} className="stroke-journey-text/10" strokeWidth="1" />)}
        {[0, 1].map((fraction) => <text key={fraction} x={PAD.left - 6} y={y(top * fraction) + 4} textAnchor="end" className="fill-journey-muted text-[10px]">{Math.round(top * fraction)}</text>)}
        {limit ? (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(limit)} y2={y(limit)} className="stroke-rose-500" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - PAD.right} y={y(limit) - 4} textAnchor="end" className="fill-rose-500 text-[10px] font-bold">Limit {limit}</text>
          </g>
        ) : null}
        <path d={area} className="fill-journey-accent/15" />
        <path d={line} className="fill-none stroke-journey-accent" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map(([cx, cy], index) => (
          <circle key={points[index].date} cx={cx} cy={cy} r="3.5" className="fill-journey-accent stroke-journey-surface" strokeWidth="1.5">
            <title>{`${shortDate(new Date(`${points[index].date}T00:00:00Z`))}: +${points[index].count}, ${points[index].total} in total`}</title>
          </circle>
        ))}
        {ticks.map((time, index) => <text key={index} x={x(time)} y={H - 8} textAnchor={index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle'} className="fill-journey-muted text-[10px]">{shortDate(new Date(time))}</text>)}
      </svg>
      </div>
      <EditionNote analytics={analytics} />
      <p className="text-sm text-journey-text/85" aria-live="polite">{sentence(plan, limit, endsAt)}{endsAt ? <span className="text-journey-muted"> (until {istText(endsAt)})</span> : null}</p>
      <details className="text-xs text-journey-muted">
        <summary className="inline-flex min-h-9 cursor-pointer items-center font-bold text-journey-accent">Show the numbers</summary>
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-journey-text/10" tabIndex={0}>
          <table className="w-full text-left"><caption className="sr-only">People joining teams per day</caption>
            <thead className="bg-journey-text/5"><tr><th scope="col" className="px-3 py-1.5">Day</th><th scope="col" className="px-3 py-1.5">Joined</th><th scope="col" className="px-3 py-1.5">In teams</th></tr></thead>
            <tbody className="divide-y divide-journey-text/10">{[...points].reverse().map((point) => <tr key={point.date}><td className="px-3 py-1.5">{shortDate(new Date(`${point.date}T00:00:00Z`))}</td><td className="px-3 py-1.5 tabular-nums">+{point.count}</td><td className="px-3 py-1.5 tabular-nums">{point.total}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
