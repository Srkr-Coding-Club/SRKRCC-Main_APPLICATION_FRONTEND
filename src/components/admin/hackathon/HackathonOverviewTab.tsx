'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Armchair, Flag, IndianRupee, Mail, ScanLine, Users, UsersRound } from 'lucide-react';
import type { FinderAdminPayload, HackathonAnalytics, HackathonStats, IdeaStatus, PaymentQueue } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { AnalyticsPanel } from './AnalyticsPanel';
import { LoadError } from './LoadError';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BTN_PRIMARY } from './shared';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { AttentionStrip, Kpi, ProblemUptake, RoundFunnel, plural, type AttentionItem } from './OverviewParts';
import { PANEL } from './shared';

type Tab = 'overview' | 'settings' | 'problems' | 'teams' | 'payments' | 'rounds' | 'announcements' | 'ideas' | 'finder';

/** Matches the finder tab: somebody listed this long without a team is worth matching by hand. */
const FINDER_LONG_WAIT_MS = 3 * 24 * 60 * 60 * 1000;

export function HackathonOverviewTab({ slug, onNavigate }: { slug: string; onNavigate: (tab: Tab) => void }) {
  const [stats, setStats] = useState<HackathonStats | null>(null);
  const [error, setError] = useState('');
  // Extra figures are a bonus: a person without the permission for one simply does not get that number.
  const [analytics, setAnalytics] = useState<HackathonAnalytics | null>(null);
  const [ideaCounts, setIdeaCounts] = useState<Record<IdeaStatus, number> | null>(null);
  const [payments, setPayments] = useState<PaymentQueue | null>(null);
  const [finder, setFinder] = useState<FinderAdminPayload | null>(null);
  const [reminding, setReminding] = useState(false);
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const load = useCallback(() => {
    setError('');
    hackathonApi.admin.stats(slug).then(setStats).catch((err) => setError(apiErrorMessage(err, 'Could not load the overview.')));
    hackathonApi.admin.analytics(slug).then(setAnalytics).catch(() => setAnalytics(null));
    hackathonApi.admin.ideas(slug).then((payload) => setIdeaCounts(payload.counts)).catch(() => setIdeaCounts(null));
    hackathonApi.admin.payments(slug).then(setPayments).catch(() => setPayments(null));
    hackathonApi.admin.finder(slug).then((payload) => setFinder(payload.enabled ? payload : null)).catch(() => setFinder(null));
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
  if (!stats) return <div className="h-48 animate-pulse rounded-xl bg-journey-text/10" />;

  const s = stats.teams_by_status;
  const capacity = analytics?.capacity;
  const seatsLeft = capacity?.max_teams != null ? Math.max(0, capacity.max_teams - capacity.placed_teams) : null;
  const feesOn = !!payments && payments.stage !== 'NONE' && payments.fee_amount > 0;
  const verified = payments?.counts.VERIFIED ?? 0;
  const waiting = s.PAYMENT_PENDING ?? 0;
  const toReview = ideaCounts?.SUBMITTED ?? 0;
  const waitlisted = analytics?.waitlisted_teams ?? 0;
  const stuckRequests = finder?.stats.requests_stuck ?? 0;
  const longWaiting = finder && finder.stats.teams_recruiting > 0
    ? finder.seekers.filter((person) => person.status === 'WAITING' && Date.now() - new Date(person.listed_at).getTime() >= FINDER_LONG_WAIT_MS).length
    : 0;

  const attention: AttentionItem[] = [
    { key: 'payments', count: waiting, label: `${waiting === 1 ? 'team is' : 'teams are'} waiting for their payment to be checked`, action: 'Check', tone: 'amber', onClick: () => onNavigate('payments') },
    { key: 'ideas', count: toReview, label: `${toReview === 1 ? 'idea is' : 'ideas are'} waiting for a review`, action: 'Review', tone: 'accent', onClick: () => onNavigate('ideas') },
    { key: 'forming', count: stats.forming_teams.length, label: `${stats.forming_teams.length === 1 ? 'team is' : 'teams are'} below the minimum size of ${stats.min_team_size}`, action: 'See teams', tone: 'amber', onClick: () => onNavigate('teams') },
    { key: 'finder-stuck', count: stuckRequests, label: `join ${stuckRequests === 1 ? 'request has' : 'requests have'} waited over 48 hours for a team leader`, action: 'See requests', tone: 'amber', onClick: () => onNavigate('finder') },
    { key: 'finder-waiting', count: longWaiting, label: `${longWaiting === 1 ? 'person has' : 'people have'} been looking for a team for 3+ days while teams have room`, action: 'Match them', tone: 'accent', onClick: () => onNavigate('finder') },
    { key: 'waitlist', count: waitlisted, label: `${waitlisted === 1 ? 'team is' : 'teams are'} on the waitlist`, action: 'See teams', tone: 'accent', onClick: () => onNavigate('teams') },
  ];

  return (
    <div className="space-y-6">
      {confirmDialog}
      <AttentionStrip items={attention} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi icon={Users} label="Registered teams" value={s.REGISTERED} hint={`${s.FORMING} still forming`} onClick={() => onNavigate('teams')} />
        <Kpi icon={UsersRound} label="Participants" value={stats.participants} hint={`${plural(stats.pending_invites, 'invite')} pending`} />
        <Kpi
          icon={Armchair}
          label="Team places left"
          value={seatsLeft ?? '—'}
          hint={capacity?.max_teams != null ? `${capacity.placed_teams} of ${capacity.max_teams} taken` : analytics ? 'No team limit' : ''}
          tone={seatsLeft === 0 ? 'red' : 'accent'}
        />
        <Kpi icon={ScanLine} label="Checked in" value={analytics?.checked_in ?? '—'} hint={analytics ? `of ${stats.participants} participants` : ''} tone="green" />
        {feesOn && payments ? (
          <Kpi icon={IndianRupee} label="Fees verified" value={`₹${(verified * payments.fee_amount).toLocaleString('en-IN')}`} hint={`${plural(verified, 'team')} · ${payments.counts.PENDING} to check`} tone="green" onClick={() => onNavigate('payments')} className="col-span-2 lg:col-span-1" />
        ) : (
          <Kpi icon={Flag} label="Rounds" value={stats.rounds.length} hint={stats.rounds.length === 1 ? 'round set up' : 'rounds set up'} onClick={() => onNavigate('rounds')} className="col-span-2 lg:col-span-1" />
        )}
      </div>

      {stats.forming_teams.length > 0 && (
        <section className={`${PANEL} space-y-3 !p-4 sm:!p-5`} aria-label="Teams below the minimum size">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text">
                <Users className="h-4 w-4 text-amber-500" aria-hidden="true" /> Teams below the minimum size ({stats.forming_teams.length})
              </h3>
              <p className="text-xs text-journey-muted">
                These teams are not registered, so they are left out of Round 1.
                {stats.registration_closes_at && stats.is_registration_open ? ` Registration closes ${formatDateTime(stats.registration_closes_at)}.` : ''}
              </p>
            </div>
            <button onClick={remindLeaders} disabled={reminding} className={BTN_PRIMARY}>
              <Mail className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind leaders'}
            </button>
          </div>
          <ul className={`grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 ${stats.forming_teams.length > 9 ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
            {stats.forming_teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-journey-text/10 px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-journey-text">{team.name}</span>
                  <span className="block truncate text-journey-muted">{team.leader_email ?? 'No leader'}</span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {team.members}/{stats.min_team_size}
                  <span className="block text-[11px] font-medium">needs {team.needed}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <ProblemUptake stats={stats} onManage={() => onNavigate('problems')} />
        <RoundFunnel rounds={stats.rounds} onManage={() => onNavigate('rounds')} />
      </div>

      <AnalyticsPanel slug={slug} data={analytics} />
    </div>
  );
}
