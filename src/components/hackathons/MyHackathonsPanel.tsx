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
      <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[#FF7A00]" />
        My Hackathons
      </h2>

      {invites.map((inv) => (
        <Link
          key={`inv-${inv.id}`}
          href={`/hackathons/${inv.hackathon_slug}/dashboard`}
          className="flex items-center gap-3 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/5 px-5 py-4 transition hover:border-[#FF7A00]"
        >
          <Mail className="h-5 w-5 text-[#FF7A00]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">Invite to join {inv.team_name}</p>
            <p className="text-xs text-slate-500 truncate">{inv.hackathon_title} · from {inv.invited_by_name ?? 'the team leader'}</p>
          </div>
          <span className="text-xs font-bold text-[#FF7A00]">Respond →</span>
        </Link>
      ))}

      {teams.map((t) => {
        const pill = TEAM_STATUS_PILL[t.status];
        return (
          <Link
            key={t.id}
            href={`/hackathons/${t.hackathon_slug}/dashboard`}
            className="group relative flex items-center gap-4 overflow-hidden glass-panel rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-4 transition hover:border-[#FF7A00]/60"
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-[#8B2E3B]" />
            <div className="min-w-0 flex-1 pl-1">
              <p className="text-xs font-mono font-bold text-[#FF7A00] truncate">{t.hackathon_title}</p>
              <p className="flex items-center gap-2 text-base font-bold text-[#1A1A2E] dark:text-white truncate">
                {t.name}
                {t.is_leader && <Crown className="h-4 w-4 text-[#FF7A00]" aria-label="Team leader" />}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {t.member_count} member{t.member_count === 1 ? '' : 's'}
                {t.problem_statement ? ` · ${t.problem_statement.code}: ${t.problem_statement.title}` : t.open_innovation ? ` · ${t.open_innovation.code}: ${t.open_innovation.title} (open innovation)` : ''}
              </p>
            </div>
            {pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#FF7A00]" />
          </Link>
        );
      })}
    </div>
  );
}
