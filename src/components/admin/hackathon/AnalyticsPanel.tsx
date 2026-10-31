'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { HackathonAnalytics } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { LoadError } from './LoadError';
import { PANEL } from './shared';

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const peak = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="space-y-2">
      {rows.length === 0 ? <p className="text-xs text-journey-muted">No data yet.</p> : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.label} className="text-xs">
              <div className="flex justify-between gap-2"><span className="truncate" title={row.label}>{row.label}</span><span className="font-bold tabular-nums">{row.count}</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-journey-text/10"><div className="h-full rounded-full bg-journey-accent" style={{ width: `${(row.count / peak) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Who the participants are, and the participants export. */
const BREAKDOWNS = [
  { key: 'branch', label: 'Branch' },
  { key: 'year', label: 'Year' },
  { key: 'college', label: 'College' },
] as const;

/** `data`, when given, is what the parent already loaded (the panel then makes no request of its own). */
export function AnalyticsPanel({ slug, data: provided }: { slug: string; data?: HackathonAnalytics | null }) {
  const own = provided === undefined;
  const [loaded, setLoaded] = useState<HackathonAnalytics | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<(typeof BREAKDOWNS)[number]['key']>('branch');
  const data = own ? loaded : provided;

  const load = useCallback(() => {
    if (!own) return;
    setError('');
    hackathonApi.admin.analytics(slug).then(setLoaded).catch((err) => setError(apiErrorMessage(err, 'Could not load analytics.')));
  }, [slug, own]);

  useEffect(load, [load]);

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!data) return own ? <div className="h-40 animate-pulse rounded-xl bg-journey-text/10" /> : null;
  const rows = { branch: data.by_branch, year: data.by_year, college: data.by_college }[view];


  return (
    <section className={`${PANEL} space-y-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><BarChart3 className="h-4 w-4 text-journey-accent" /> Participation insight</h3>
        <ExportMenu subject="participants" onExport={(format) => hackathonApi.exportFile(slug, 'participants', format)} />
      </div>

      <p className="text-xs text-journey-muted">
        {data.checked_in} checked in · {data.waitlisted_teams} on the waitlist
        {data.capacity.max_teams ? ` · ${data.capacity.placed_teams}/${data.capacity.max_teams} team places used` : ''}
        {data.capacity.max_participants ? ` · ${data.capacity.placed_participants}/${data.capacity.max_participants} participant places used` : ''}
      </p>

      <div className="space-y-3">
        <div role="tablist" aria-label="Who the participants are" className="inline-flex rounded-lg border border-journey-text/10 p-0.5">
          {BREAKDOWNS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={view === option.key}
              onClick={() => setView(option.key)}
              className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${view === option.key ? 'bg-journey-accent text-journey-on-accent' : 'text-journey-muted hover:text-journey-text'}`}
            >
              By {option.label.toLowerCase()}
            </button>
          ))}
        </div>
        <div className={rows.length > 8 ? 'max-h-72 overflow-y-auto pr-1' : ''}><Bars rows={rows} /></div>
      </div>
    </section>
  );
}
