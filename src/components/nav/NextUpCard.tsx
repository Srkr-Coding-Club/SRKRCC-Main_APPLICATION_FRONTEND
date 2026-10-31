'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { countdown, istText } from '@/lib/hackathonOverview';
import type { Hackathon } from '@/lib/types';

/**
 * The hackathon worth showing in the Events menu: one that is taking registrations (the one closing soonest), else the
 * one starting next. Finished and hidden ones are never shown.
 */
export function pickNextUp(hackathons: Hackathon[], now: Date): Hackathon | null {
  const live = hackathons.filter((item) => item.status !== 'DRAFT' && item.status !== 'CLOSED' && !item.is_hidden && new Date(item.end_date).getTime() > now.getTime());
  const open = live
    .filter((item) => item.is_registration_open)
    .sort((a, b) => new Date(a.registration_closes_at ?? a.start_date).getTime() - new Date(b.registration_closes_at ?? b.start_date).getTime());
  if (open.length) return open[0];
  const coming = live.filter((item) => new Date(item.start_date).getTime() > now.getTime()).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  return coming[0] ?? live[0] ?? null;
}

export function NextUpCard({ hackathon, now, signedIn = true, onNavigate }: { hackathon: Hackathon; now: Date; signedIn?: boolean; onNavigate?: () => void }) {
  const closes = hackathon.is_registration_open && hackathon.registration_closes_at ? new Date(hackathon.registration_closes_at) : null;
  const starts = new Date(hackathon.start_date);
  // Registering needs an account: a signed-out visitor goes through the login page and comes straight back to this hackathon.
  const page = `/hackathons/${hackathon.slug}`;
  const needsLogin = !!closes && !signedIn;
  const line = closes ? `Registration closes ${countdown(closes, now).text}` : starts.getTime() > now.getTime() ? `Starts ${countdown(starts, now).text}` : 'Happening now';
  return (
    <Link
      href={needsLogin ? `/login?next=${encodeURIComponent(page)}` : page}
      onClick={onNavigate}
      className="flex w-[220px] shrink-0 flex-col justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#8B2E3B]/90 to-[#C2410C]/80 p-4 text-white transition hover:brightness-110 active:scale-[0.98]"
    >
      <span>
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-orange-100">Next up</span>
        <span className="mt-2 block font-poppins text-lg font-bold leading-tight">{hackathon.title}</span>
        <span className="mt-2 block text-xs leading-relaxed text-white/90">
          {istText(starts)}
          <br />
          {line}
          {typeof hackathon.team_count === 'number' && hackathon.team_count > 0 && (
            <>
              <br />
              {hackathon.team_count} {hackathon.team_count === 1 ? 'team' : 'teams'} so far
            </>
          )}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-[13px] font-bold">
        {needsLogin ? 'Sign in to register' : closes ? 'Register now' : 'See details'}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
