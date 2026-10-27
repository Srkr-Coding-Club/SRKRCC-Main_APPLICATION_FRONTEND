'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { HackathonAnalytics } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { LoadError } from './LoadError';
import { PANEL } from './shared';

function Bars({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const peak = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {rows.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No data yet.</p> : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.label} className="text-xs">
              <div className="flex justify-between gap-2"><span className="truncate">{row.label}</span><span className="font-bold tabular-nums">{row.count}</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-[#FF7A00]" style={{ width: `${(row.count / peak) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Participation funnel, who the participants are, and the participants export. */
export function AnalyticsPanel({ slug }: { slug: string }) {
  const [data, setData] = useState<HackathonAnalytics | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.analytics(slug).then(setData).catch((err) => setError(apiErrorMessage(err, 'Could not load analytics.')));
  }, [slug]);

  useEffect(load, [load]);

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-white/5" />;

  const top = Math.max(1, data.funnel[0]?.count ?? 1);
  const perDay = data.joined_per_day.slice(-30);
  const dayPeak = Math.max(1, ...perDay.map((day) => day.count));

  return (
    <section className={`${PANEL} space-y-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><BarChart3 className="h-4 w-4 text-journey-accent" /> Participation insight</h3>
        <ExportMenu subject="participants" onExport={(format) => hackathonApi.exportFile(slug, 'participants', format)} />
      </div>

      <ol className="space-y-2">
        {data.funnel.map((step) => (
          <li key={step.key} className="text-sm">
            <div className="flex justify-between gap-2"><span>{step.label}</span><span className="font-bold tabular-nums">{step.count}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-[#FFA500] to-[#FF7A00]" style={{ width: `${Math.min(100, (step.count / top) * 100)}%` }} /></div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {data.checked_in} checked in · {data.waitlisted_teams} on the waitlist
        {data.capacity.max_teams ? ` · ${data.capacity.placed_teams}/${data.capacity.max_teams} team places used` : ''}
        {data.capacity.max_participants ? ` · ${data.capacity.placed_participants}/${data.capacity.max_participants} participant places used` : ''}
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Bars title="By branch" rows={data.by_branch} />
        <Bars title="By year" rows={data.by_year} />
        <Bars title="By college" rows={data.by_college} />
      </div>

      {perDay.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">People joining teams, per day (last {perDay.length} days with activity)</p>
          <div className="flex h-24 items-end gap-1" role="img" aria-label={`Daily sign-ups, peak ${dayPeak}`}>
            {perDay.map((day) => (
              <div key={day.date} title={`${day.date}: ${day.count}`} className="flex-1 rounded-t bg-[#FF7A00]/80" style={{ height: `${Math.max(6, (day.count / dayPeak) * 100)}%` }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
