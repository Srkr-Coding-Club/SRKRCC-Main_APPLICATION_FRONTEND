'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gavel, ScanLine, ShieldCheck } from 'lucide-react';
import type { HackathonPermissionKey, MyHackathonPermissions } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { isAuthenticated } from '@/lib/auth';

const MANAGE_PERMISSIONS: HackathonPermissionKey[] = ['settings', 'content', 'teams', 'rounds', 'ideas', 'submissions', 'judging', 'results', 'insights', 'staff'];
const LINK = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-journey-accent/40 bg-journey-accent/10 px-3 py-1.5 text-xs font-bold text-journey-accent transition hover:bg-journey-accent/20 sm:min-h-0';

/** Quick links for people who hold a role in this hackathon; renders nothing for everyone else. */
export function StaffShortcuts({ slug }: { slug: string }) {
  const [me, setMe] = useState<MyHackathonPermissions | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) return;
    hackathonApi.myPermissions(slug).then(setMe).catch(() => setMe(null));
  }, [slug]);

  if (!me) return null;
  const canManage = me.permissions.some((key) => MANAGE_PERMISSIONS.includes(key));
  const canJudge = me.permissions.includes('judge');
  const canCheckIn = me.permissions.includes('check_in');
  if (!canManage && !canJudge && !canCheckIn) return null;

  return (
    <nav aria-label="Your roles in this hackathon" className="flex flex-wrap gap-2">
      {canManage && <Link href={me.is_site_organizer ? `/admin/hackathons/${slug}` : `/hackathons/${slug}/manage`} className={LINK}><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Manage this hackathon</Link>}
      {canJudge && <Link href={`/hackathons/${slug}/judging`} className={LINK}><Gavel className="h-3.5 w-3.5" aria-hidden="true" /> Score projects</Link>}
      {canCheckIn && <Link href={`/hackathons/${slug}/check-in`} className={LINK}><ScanLine className="h-3.5 w-3.5" aria-hidden="true" /> Check people in</Link>}
    </nav>
  );
}
