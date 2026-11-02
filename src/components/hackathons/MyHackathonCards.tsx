import React from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Mail } from 'lucide-react';
import type { HackathonTeam, HackathonTeamInvite } from '@/lib/types';
import { StatusPill, TEAM_STATUS_PILL } from '@/components/ui/StatusPill';

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** A pending invitation to join someone's team; opens the dashboard where it can be answered. */
export function HackathonInviteRow({ invite }: { invite: HackathonTeamInvite }) {
  return (
    <Link
      href={`/hackathons/${invite.hackathon_slug}/dashboard`}
      className="flex items-center gap-3 rounded-xl border border-journey-accent/40 bg-journey-accent/5 px-5 py-4 transition hover:border-journey-accent"
    >
      <Mail className="h-5 w-5 text-journey-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-journey-text">Invite to join {invite.team_name}</p>
        <p className="text-xs text-journey-muted truncate">{invite.hackathon_title} · from {invite.invited_by_name ?? 'the team leader'}</p>
      </div>
      <span className="text-xs font-bold text-journey-accent">Respond →</span>
    </Link>
  );
}

/** One of the person's hackathon teams: the hackathon, the team, its size and problem, and where it stands. */
export function HackathonTeamCard({ team }: { team: HackathonTeam }) {
  const pill = TEAM_STATUS_PILL[team.status];
  return (
    <Link
      href={`/hackathons/${team.hackathon_slug}/dashboard`}
      className="group relative flex items-center gap-4 overflow-hidden glass-panel rounded-xl border border-journey-text/10 px-5 py-4 transition hover:border-journey-accent/60"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-journey-accent" />
      <div className="min-w-0 flex-1 pl-1">
        <p className="text-xs font-mono font-bold text-journey-accent truncate">{team.hackathon_title}</p>
        <p className="flex items-center gap-2 text-base font-bold text-journey-text truncate">
          {team.name}
          {team.is_leader && <Crown className="h-4 w-4 text-journey-accent" aria-label="Team leader" />}
        </p>
        <p className="text-xs text-journey-muted truncate">
          {team.hackathon_start ? `${DATE_FORMAT.format(new Date(team.hackathon_start))} · ` : ''}{team.member_count} member{team.member_count === 1 ? '' : 's'}
          {team.problem_statement ? ` · ${team.problem_statement.code}: ${team.problem_statement.title}` : team.open_innovation ? ` · ${team.open_innovation.code}: ${team.open_innovation.title} (open innovation)` : ''}
        </p>
      </div>
      {pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
      <ArrowRight className="h-4 w-4 text-journey-muted transition group-hover:translate-x-0.5 group-hover:text-journey-accent" />
    </Link>
  );
}
