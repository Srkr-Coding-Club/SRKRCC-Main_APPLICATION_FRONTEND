'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, LogIn, Users } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { useMyHackathonStatus } from '@/lib/hooks/useMyHackathonStatus';

const PRIMARY =
  'flex w-full items-center justify-center gap-1.5 rounded-lg bg-journey-accent px-4 py-3 text-sm font-bold text-journey-on-accent shadow-md transition hover:-translate-y-0.5 active:scale-95';
const MUTED =
  'flex w-full items-center justify-center gap-1.5 rounded-lg bg-journey-text/10 px-4 py-3 text-sm font-semibold text-journey-text/70';

/** Register / go-to-team call to action on the public hackathon page. */
export function HackathonCTA({ hackathon }: { hackathon: Hackathon }) {
  const dashboard = `/hackathons/${hackathon.slug}/dashboard`;
  const { loggedIn, mine } = useMyHackathonStatus(hackathon.slug);

  const open = hackathon.is_registration_open ?? hackathon.status !== 'CLOSED';
  const opensAt = hackathon.registration_opens_at ? new Date(hackathon.registration_opens_at) : null;
  const notYetOpen = !open && hackathon.status !== 'CLOSED' && opensAt && opensAt > new Date();

  if (mine?.team) {
    return (
      <Link href={dashboard} className={PRIMARY}>
        <Users className="h-4 w-4" />
        Go to my team: {mine.team.name}
      </Link>
    );
  }
  if (mine && mine.invites.length > 0) {
    return (
      <Link href={dashboard} className={PRIMARY}>
        You have {mine.invites.length} team invite{mine.invites.length > 1 ? 's' : ''}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }
  if (!open) {
    return (
      <span className={MUTED}>
        <Lock className="h-4 w-4" />
        {notYetOpen
          ? `Registration opens ${opensAt!.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`
          : 'Registration Closed'}
      </span>
    );
  }
  if (loggedIn === false) {
    return (
      <Link href={`/login?next=${encodeURIComponent(dashboard)}`} className={PRIMARY}>
        <LogIn className="h-4 w-4" />
        Sign in to register a team
      </Link>
    );
  }
  if (hackathon.is_full && !hackathon.waitlist_enabled) {
    return (
      <span className={MUTED}>
        <Lock className="h-4 w-4" />
        Registration full
      </span>
    );
  }
  return (
    <Link href={dashboard} className={PRIMARY}>
      {hackathon.is_full ? 'Join the waitlist' : 'Register Team'}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
