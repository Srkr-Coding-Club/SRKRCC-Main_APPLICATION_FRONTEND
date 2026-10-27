'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { CheckInStats as Stats } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { LoadError } from './LoadError';
import { BTN_GHOST, PANEL } from './shared';

const REFRESH_MS = 60000;

function slotLabel(iso: string, bucketMinutes: number): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: bucketMinutes < 60 ? '2-digit' : undefined, day: bucketMinutes >= 60 ? 'numeric' : undefined,
    month: bucketMinutes >= 60 ? 'short' : undefined, timeZone: 'Asia/Kolkata',
  });
}

/** Organizers: how many people each volunteer scanned and when people arrived. */
export function CheckInStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    hackathonApi.checkIn.stats(slug).then((data) => { setStats(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the check-in numbers.')));
  }, [slug]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const peak = Math.max(1, ...(stats?.timeline ?? []).map((slot) => slot.count));
  const busiest = Math.max(1, ...(stats?.volunteers ?? []).map((volunteer) => volunteer.count));

  return (
    <section className={`${PANEL} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><BarChart3 className="h-4 w-4 text-journey-accent" /> Arrivals and volunteers</h3>
        <button type="button" onClick={load} className={BTN_GHOST}>Refresh</button>
      </div>
      {error && <LoadError message={error} onRetry={load} />}
      {stats && stats.total === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nobody has checked in yet. Numbers appear as people arrive.</p>}
      {stats && stats.total > 0 && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.total} checked in{stats.overrides > 0 && `, ${stats.overrides} let in by an organizer`}. Each bar is {stats.bucket_minutes === 60 ? 'an hour' : `${stats.bucket_minutes} minutes`} (IST).
          </p>
          <div role="img" aria-label={`Arrivals over time, busiest slot ${peak} people`} className="overflow-x-auto">
            <ul className="flex h-32 min-w-full items-end gap-1">
              {stats.timeline.map((slot) => (
                <li key={slot.at} className="flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1" title={`${slotLabel(slot.at, stats.bucket_minutes)}: ${slot.count}`}>
                  <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">{slot.count || ''}</span>
                  <span className="w-full rounded-t bg-journey-accent" style={{ height: `${(slot.count / peak) * 100}%`, minHeight: slot.count ? 2 : 0 }} />
                </li>
              ))}
            </ul>
            <ul className="mt-1 flex min-w-full gap-1" aria-hidden="true">
              {stats.timeline.map((slot, index) => (
                <li key={slot.at} className="min-w-6 flex-1 truncate text-center text-[10px] text-slate-500 dark:text-slate-400">{index % Math.ceil(stats.timeline.length / 8) === 0 ? slotLabel(slot.at, stats.bucket_minutes) : ''}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase text-[#1A1A2E] dark:text-white">Scans per volunteer</h4>
            <ul className="space-y-1.5">
              {stats.volunteers.map((volunteer) => (
                <li key={volunteer.name} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 truncate text-[#1A1A2E] dark:text-white sm:w-48">{volunteer.name}</span>
                  <span className="h-2 min-w-1 rounded-full bg-journey-accent" style={{ width: `${(volunteer.count / busiest) * 60}%` }} aria-hidden="true" />
                  <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">{volunteer.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
