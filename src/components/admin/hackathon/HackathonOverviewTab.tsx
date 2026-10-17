'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flag, Mail, Target, Users, UsersRound } from 'lucide-react';
import type { HackathonStats } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { LoadError } from './LoadError';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BTN_PRIMARY } from './shared';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
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
  const [error, setError] = useState('');
  const [reminding, setReminding] = useState(false);
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.stats(slug).then(setStats).catch((err) => setError(apiErrorMessage(err, 'Could not load the overview.')));
  }, [slug]);

  useEffect(load, [load]);

  const remindLeaders = async () => {
    if (!stats) return;
    const ok = await confirm({
      title: 'Remind team leaders?',
      message: `The leaders of ${stats.forming_teams.length} team${stats.forming_teams.length === 1 ? '' : 's'} below the minimum size get an in-app notification and an email saying how many members they still need.`,
      confirmLabel: 'Send reminders',
    });
    if (!ok) return;
    setReminding(true);
    try {
      const { reminded } = await hackathonApi.admin.remindForming(slug);
      toast.success('Reminders sent', `${reminded} team leader${reminded === 1 ? '' : 's'} notified.`);
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setReminding(false);
    }
  };

  if (error) return <LoadError message={error} onRetry={load} />;
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

      {confirmDialog}
      {stats.forming_teams.length > 0 && (
        <section className={`${PANEL} space-y-3 border-amber-500/30`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
                <Users className="h-4 w-4 text-amber-500" /> Teams below the minimum size ({stats.forming_teams.length})
              </h3>
              <p className="text-xs text-slate-500">
                These teams are not registered, so they are left out of Round 1.
                {stats.registration_closes_at && stats.is_registration_open ? ` Registration closes ${formatDateTime(stats.registration_closes_at)}.` : ''}
              </p>
            </div>
            <button onClick={remindLeaders} disabled={reminding} className={BTN_PRIMARY}>
              <Mail className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind leaders'}
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {stats.forming_teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-[#1A1A2E] dark:text-white">{team.name}</span>
                  <span className="block truncate text-slate-500">{team.leader_email ?? 'No leader'}</span>
                </span>
                <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
                  {team.members}/{stats.min_team_size} · needs {team.needed}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
