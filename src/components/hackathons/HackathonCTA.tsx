'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, LogIn, Users } from 'lucide-react';
import type { Hackathon, MyTeamPayload } from '@/lib/types';
import { fetchAndSyncCurrentUser, isAuthenticated } from '@/lib/auth';
import { hackathonApi } from '@/lib/api/hackathons';

const PRIMARY =
  'flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95';
const MUTED =
  'flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400';

/** Register / go-to-team call to action on the public hackathon page. */
export function HackathonCTA({ hackathon }: { hackathon: Hackathon }) {
  const dashboard = `/hackathons/${hackathon.slug}/dashboard`;
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [mine, setMine] = useState<MyTeamPayload | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoggedIn(false);
      return;
    }
    // Confirm the session is actually live first: a stale stored user would
    // otherwise make my-team 401, and fetchApi's 401 handling redirects to
    // /login — not acceptable on a public page.
    let cancelled = false;
    fetchAndSyncCurrentUser().then((user) => {
      if (cancelled) return;
      setLoggedIn(!!user);
      if (user) hackathonApi.myTeam(hackathon.slug).then((m) => !cancelled && setMine(m)).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [hackathon.slug]);

  const open = hackathon.is_registration_open ?? hackathon.status !== 'CLOSED';
  const opensAt = hackathon.registration_opens_at ? new Date(hackathon.registration_opens_at) : null;
  const notYetOpen = !open && hackathon.status !== 'CLOSED' && opensAt && opensAt > new Date();

  if (mine?.team) {
    return (
      <Link href={dashboard} className={PRIMARY}>
        <Users className="h-4 w-4" />
        Go to my team — {mine.team.name}
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
        {notYetOpen ? `Registration opens ${opensAt!.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Registration Closed'}
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
  return (
    <Link href={dashboard} className={PRIMARY}>
      Register Team
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
