'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Mail, Trophy } from 'lucide-react';
import type { HackathonTeam, HackathonTeamInvite } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';

/** Profile-page summary of the user's hackathon teams and pending invites. Renders nothing if there are none. */
export function MyHackathonsPanel() {
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [invites, setInvites] = useState<HackathonTeamInvite[]>([]);

  useEffect(() => {
    hackathonApi.myTeams().then(setTeams).catch(() => setTeams([]));
    hackathonApi.myInvites().then(setInvites).catch(() => setInvites([]));
  }, []);

  if (teams.length === 0 && invites.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-journey-text flex items-center gap-2">
        <Trophy className="w-5 h-5 text-journey-accent" />
        My Hackathons
      </h2>

      {invites.map((inv) => (
        <Link
          key={`inv-${inv.id}`}
          href={`/hackathons/${inv.hackathon_slug}/dashboard`}
          className="flex items-center gap-3 rounded-xl border border-journey-accent/40 bg-journey-accent/5 px-5 py-4 transition hover:border-journey-accent"
        >
          <Mail className="h-5 w-5 text-journey-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-journey-text">Invite to join {inv.team_name}</p>
            <p className="text-xs text-journey-muted truncate">{inv.hackathon_title} · from {inv.invited_by_name ?? 'the team leader'}</p>
          </div>
          <span className="text-xs font-bold text-journey-accent">Respond →</span>
        </Link>
      ))}

      {teams.map((t) => {
        const pill = TEAM_STATUS_PILL[t.status];
        return (
          <Link
            key={t.id}
            href={`/hackathons/${t.hackathon_slug}/dashboard`}
            className="group relative flex items-center gap-4 overflow-hidden glass-panel rounded-xl border border-journey-text/10 px-5 py-4 transition hover:border-journey-accent/60"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-journey-accent" />
            <div className="min-w-0 flex-1 pl-1">
              <p className="text-xs font-mono font-bold text-journey-accent truncate">{t.hackathon_title}</p>
              <p className="flex items-center gap-2 text-base font-bold text-journey-text truncate">
                {t.name}
                {t.is_leader && <Crown className="h-4 w-4 text-journey-accent" aria-label="Team leader" />}
              </p>
              <p className="text-xs text-journey-muted truncate">
                {t.member_count} member{t.member_count === 1 ? '' : 's'}
                {t.problem_statement ? ` · ${t.problem_statement.code}: ${t.problem_statement.title}` : t.open_innovation ? ` · ${t.open_innovation.code}: ${t.open_innovation.title} (open innovation)` : ''}
              </p>
            </div>
            {pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
            <ArrowRight className="h-4 w-4 text-journey-muted transition group-hover:translate-x-0.5 group-hover:text-journey-accent" />
          </Link>
        );
      })}
    </div>
  );
}
