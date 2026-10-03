'use client';

import React, { useEffect, useState } from 'react';
import { Flag, Mail, Target, Users, UsersRound } from 'lucide-react';
import type { HackathonStats } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { StatusPill } from '@/components/ui/StatusPill';
import { PANEL } from './shared';

type Tab = 'overview' | 'settings' | 'problems' | 'teams' | 'rounds' | 'announcements';

function Tile({ icon: Icon, label, value, sub, onClick }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`${PANEL} text-left transition enabled:hover:border-[#FF7A00]/60`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-4 w-4 text-[#FF7A00]" /> {label}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-[#1A1A2E] dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </button>
  );
}

export function HackathonOverviewTab({ slug, onNavigate }: { slug: string; onNavigate: (tab: Tab) => void }) {
  const [stats, setStats] = useState<HackathonStats | null>(null);

  useEffect(() => {
    hackathonApi.admin.stats(slug).then(setStats).catch(() => setStats(null));
  }, [slug]);

  if (!stats) return <div className="h-48 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />;

  const s = stats.teams_by_status;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Users} label="Registered teams" value={s.REGISTERED} sub={`${s.FORMING} still forming`} onClick={() => onNavigate('teams')} />
        <Tile icon={UsersRound} label="Participants" value={stats.participants} sub="in active teams" />
        <Tile icon={Mail} label="Pending invites" value={stats.pending_invites} />
        <Tile icon={Flag} label="Rounds" value={stats.rounds.length} onClick={() => onNavigate('rounds')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${PANEL} space-y-3`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Target className="h-4 w-4 text-[#FF7A00]" /> Problem statement uptake</h3>
          <p className="text-xs text-slate-500">
            <span className="font-bold text-[#1A1A2E] dark:text-white">{stats.open_innovation_teams}</span> active team{stats.open_innovation_teams === 1 ? '' : 's'} brought their own problem (open innovation).
          </p>
          {stats.problem_statements.length === 0 ? (
            <p className="text-sm text-slate-500">No problem statements yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.problem_statements.map((p) => {
                const pct = p.max_teams ? Math.min(100, Math.round((p.teams / p.max_teams) * 100)) : null;
                return (
                  <li key={p.id} className="space-y-1">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1A1A2E] dark:text-white truncate">{p.code}: {p.title}</span>
                      <span className="text-slate-500 shrink-0">{p.teams}{p.max_teams ? ` / ${p.max_teams}` : ''} teams</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div className={`h-full ${pct >= 100 ? 'bg-rose-500' : 'bg-[#FF7A00]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${PANEL} space-y-3`}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Flag className="h-4 w-4 text-[#FF7A00]" /> Round funnel</h3>
          {stats.rounds.length === 0 ? (
            <p className="text-sm text-slate-500">No rounds created yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.rounds.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs">
                  <span className="font-bold text-[#1A1A2E] dark:text-white">R{r.order} · {r.name}</span>
                  <span className="text-slate-500">{r.total} teams</span>
                  <StatusPill tone="green">{r.SHORTLISTED} shortlisted</StatusPill>
                  <StatusPill tone="red">{r.REJECTED} not</StatusPill>
                  <StatusPill tone="amber">{r.PENDING} pending</StatusPill>
                  {!r.results_published && <StatusPill tone="slate">Unpublished</StatusPill>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
