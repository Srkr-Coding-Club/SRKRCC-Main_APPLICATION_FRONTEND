'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Flag, Search, Target } from 'lucide-react';
import type { HackathonStats } from '@/lib/types';
import { StatusPill } from '@/components/ui/StatusPill';
import { PANEL } from './shared';

/** "1 team", "3 teams". */
export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

type Tone = 'accent' | 'amber' | 'green' | 'red';

const TONE_ICON: Record<Tone, string> = {
  accent: 'bg-journey-accent/15 text-journey-accent',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  red: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

/** One headline number. A tile with an `onClick` is a button that opens the tab behind the number. */
export function Kpi({ icon: Icon, label, value, hint, tone = 'accent', onClick, className = '' }: {
  icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: Tone; onClick?: () => void; className?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase leading-tight tracking-wide text-journey-muted">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONE_ICON[tone]}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0">{label}</span>
      </span>
      <span className="mt-3 block text-3xl font-extrabold leading-none tabular-nums text-journey-text">{value}</span>
      <span className="mt-1.5 block min-h-4 text-xs text-journey-muted">{hint ?? ''}</span>
    </>
  );
  const base = `${PANEL} !p-4 text-left sm:!p-5 ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} transition hover:border-journey-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-journey-accent`}>{body}</button>
  ) : (
    <div className={base}>{body}</div>
  );
}

export interface AttentionItem {
  key: string;
  count: number;
  /** What the count means, already worded ("teams waiting for their payment to be checked"). */
  label: string;
  action: string;
  tone: 'amber' | 'red' | 'accent';
  onClick: () => void;
}

/** Everything that needs an organizer, in one place; nothing at all is shown as a calm "all clear". */
export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  const open = items.filter((item) => item.count > 0);
  if (open.length === 0) {
    return (
      <section className={`${PANEL} flex items-center gap-3 !py-3.5`} aria-label="Needs attention">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${TONE_ICON.green}`} aria-hidden="true"><CheckCircle2 className="h-4 w-4" /></span>
        <p className="text-sm font-semibold text-journey-text">All clear <span className="font-normal text-journey-muted">· nothing is waiting for an organizer.</span></p>
      </section>
    );
  }
  return (
    <section className={`${PANEL} space-y-3 !p-4 sm:!p-5`} aria-label="Needs attention">
      <h3 className="text-sm font-bold text-journey-text">Needs attention <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">{open.length}</span></h3>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {open.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onClick}
              className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-journey-text/10 bg-journey-text/[0.03] px-3 py-2 text-left transition hover:border-journey-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-journey-accent"
            >
              <span className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-base font-extrabold tabular-nums ${TONE_ICON[item.tone]}`}>{item.count}</span>
              <span className="min-w-0 flex-1 text-xs leading-snug text-journey-text/85">{item.label}</span>
              <span className="shrink-0 text-xs font-bold text-journey-accent group-hover:underline">{item.action}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SHOWN = 8;

/** Problem statements by how many teams picked them: the busiest few, with the full list behind a search. */
export function ProblemUptake({ stats, onManage }: { stats: HackathonStats; onManage?: () => void }) {
  const [all, setAll] = useState(false);
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => [...stats.problem_statements].sort((a, b) => b.teams - a.teams || a.code.localeCompare(b.code, undefined, { numeric: true })), [stats.problem_statements]);
  const needle = query.trim().toLowerCase();
  const rows = needle ? sorted.filter((p) => `${p.code} ${p.title}`.toLowerCase().includes(needle)) : all ? sorted : sorted.slice(0, SHOWN);
  const untouched = sorted.filter((p) => p.teams === 0).length;
  const hidden = sorted.length - SHOWN;

  return (
    <section className={`${PANEL} flex flex-col gap-3`} aria-label="Problem statement uptake">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><Target className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Problem statement uptake</h3>
        {onManage && <button type="button" onClick={onManage} className="text-xs font-bold text-journey-accent hover:underline">Manage</button>}
      </div>
      <p className="text-xs text-journey-muted">
        <span className="font-bold text-journey-text">{plural(stats.open_innovation_teams, 'active team')}</span> brought their own problem (open innovation)
        {sorted.length > 0 && <> · <span className="font-bold text-journey-text">{untouched}</span> of {sorted.length} statements not picked yet</>}.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-journey-muted">No problem statements yet.</p>
      ) : (
        <>
          {(all || sorted.length > SHOWN) && (
            <label className="relative block">
              <span className="sr-only">Search problem statements</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by code or title"
                className="h-10 w-full rounded-lg border border-journey-text/10 bg-journey-text/[0.03] pl-9 pr-3 text-sm text-journey-text placeholder:text-journey-muted focus:border-journey-accent focus:outline-none"
              />
            </label>
          )}
          <ul className={`space-y-2.5 ${all || needle ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
            {rows.map((p) => {
              const pct = p.max_teams ? Math.min(100, Math.round((p.teams / p.max_teams) * 100)) : p.teams > 0 ? 100 : 0;
              const full = p.max_teams !== null && p.teams >= p.max_teams;
              return (
                <li key={p.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-semibold text-journey-text" title={`${p.code}: ${p.title}`}>{p.code}: {p.title}</span>
                    <span className="shrink-0 tabular-nums text-journey-muted">{plural(p.teams, 'team')}{p.max_teams ? ` of ${p.max_teams}` : ''}{full ? ' · full' : ''}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-journey-text/10" aria-hidden="true">
                    <div className={`h-full rounded-full ${full ? 'bg-rose-500' : p.max_teams ? 'bg-journey-accent' : 'bg-journey-accent/70'}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && <li className="text-sm text-journey-muted">Nothing matches “{query}”.</li>}
          </ul>
          {!needle && hidden > 0 && (
            <button type="button" onClick={() => setAll((value) => !value)} className="inline-flex min-h-10 items-center gap-1 self-start text-xs font-bold text-journey-accent hover:underline">
              {all ? <>Show the top {SHOWN} <ChevronUp className="h-3.5 w-3.5" /></> : <>Show all {sorted.length} <ChevronDown className="h-3.5 w-3.5" /></>}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Each round as one stacked bar: shortlisted, not shortlisted and still pending. */
export function RoundFunnel({ rounds, onManage }: { rounds: HackathonStats['rounds']; onManage?: () => void }) {
  return (
    <section className={`${PANEL} flex flex-col gap-3`} aria-label="Round funnel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><Flag className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Round funnel</h3>
        {onManage && <button type="button" onClick={onManage} className="text-xs font-bold text-journey-accent hover:underline">Manage</button>}
      </div>
      {rounds.length === 0 ? (
        <p className="text-sm text-journey-muted">No rounds created yet.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {rounds.map((round) => (
              <li key={round.id} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 break-words text-xs font-bold text-journey-text">R{round.order} · {round.name}</span>
                  <span className="flex items-center gap-2 text-xs text-journey-muted">
                    {plural(round.total, 'team')}
                    {!round.results_published && <StatusPill tone="slate">Unpublished</StatusPill>}
                  </span>
                </div>
                <div
                  className="flex h-2.5 overflow-hidden rounded-full bg-journey-text/10"
                  role="img"
                  aria-label={`${round.SHORTLISTED} shortlisted, ${round.REJECTED} not shortlisted, ${round.PENDING} pending of ${round.total}`}
                >
                  {round.total > 0 && (
                    <>
                      <div className="bg-emerald-500" style={{ width: `${(round.SHORTLISTED / round.total) * 100}%` }} />
                      <div className="bg-rose-500" style={{ width: `${(round.REJECTED / round.total) * 100}%` }} />
                      <div className="bg-amber-500/70" style={{ width: `${(round.PENDING / round.total) * 100}%` }} />
                    </>
                  )}
                </div>
                <p className="text-[11px] tabular-nums text-journey-muted">{round.SHORTLISTED} shortlisted · {round.REJECTED} not · {round.PENDING} pending</p>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-journey-muted" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Shortlisted</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-500" /> Not shortlisted</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500/70" /> Pending</span>
          </p>
        </>
      )}
    </section>
  );
}
