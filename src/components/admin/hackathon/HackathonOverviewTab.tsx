'use client';

import React, { useEffect, useState } from 'react';
import { Armchair, Flag, IndianRupee, Loader2, Mail, RefreshCw, ScanLine, Users, UsersRound } from 'lucide-react';
import type { Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { agoText, BLOCK_ORDER, currentStage, isEventDay, milestones, moneySummary, rupees, upcoming, type BlockKey, type StatusInput } from '@/lib/hackathonOverview';
import { isForbidden, useLiveSection } from '@/lib/hooks/useLiveSection';
import { AnalyticsPanel } from './AnalyticsPanel';
import { LoadError } from './LoadError';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BTN_GHOST, BTN_PRIMARY, PANEL } from './shared';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { AttentionStrip, Kpi, ProblemUptake, RoundFunnel, plural, type AttentionItem } from './OverviewParts';
import { DeadlineStrip } from './overview/DeadlineStrip';
import { EventDayCard } from './overview/EventDayCard';
import { MoneyCard } from './overview/MoneyCard';
import { PipelineCard } from './overview/PipelineCard';
import { SectionNotice } from './overview/SectionNotice';
import { StageStrip } from './overview/StageStrip';
import { ShareSummary } from './overview/ShareSummary';
import { TrendCard } from './overview/TrendCard';

type Tab = 'overview' | 'settings' | 'problems' | 'teams' | 'payments' | 'rounds' | 'announcements' | 'ideas' | 'finder' | 'checkin';

/** Matches the finder tab: somebody listed this long without a team is worth matching by hand. */
const FINDER_LONG_WAIT_MS = 3 * 24 * 60 * 60 * 1000;
/** Teams that have not sent an idea are worth a nudge from this long before the deadline. */
const IDEA_NUDGE_BEFORE_MS = 2 * 24 * 60 * 60 * 1000;
const TICK_MS = 30_000;

/** The current time, re-read every half minute so countdowns and "updated 2 minutes ago" stay true without a refresh. */
function useNow(interval = TICK_MS) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(timer);
  }, [interval]);
  return now;
}

export function HackathonOverviewTab({ slug, hackathon, onNavigate }: { slug: string; hackathon: Hackathon; onNavigate: (tab: Tab) => void }) {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [refreshKey, setRefreshKey] = useState(0);
  const [reminding, setReminding] = useState(false);
  const now = useNow();
  const features = hackathon.features ?? {};
  const eventDay = isEventDay(hackathon, now);
  const checkInLive = Boolean(features.check_in) && eventDay;

  // One request carries every number; check-in is the only live block loaded separately, and only on the day.
  const overview = useLiveSection(() => hackathonApi.admin.overview(slug), { refreshKey });
  const sessions = useLiveSection(() => hackathonApi.checkIn.sessions(slug), { refreshKey, enabled: checkInLive });
  const noShows = useLiveSection(() => hackathonApi.checkIn.noShows(slug), { refreshKey, enabled: checkInLive });
  const stats = { data: overview.data?.stats ?? null, error: overview.error, updatedAt: overview.updatedAt, reload: overview.reload };
  const analytics = { data: overview.data?.analytics ?? null };
  const ideas = { data: overview.data?.ideas ?? null };
  const payments = { data: overview.data?.payments ?? null };
  const finder = { data: overview.data?.finder ?? null };
  const withdrawals = { data: overview.data?.withdrawals ?? null };

  const partNames: Record<string, string> = { ideas: 'ideas', payments: 'fees', finder: 'team finder', withdrawals: 'withdrawals' };
  const failed = Object.keys(overview.data?.errors ?? {}).map((key) => ({ label: partNames[key] ?? key, retry: overview.reload }));
  if (overview.data && sessions.error && !isForbidden(sessions.error)) failed.push({ label: 'check-in', retry: sessions.reload });
  const loadingAny = [overview, sessions, noShows].some((section) => section.loading);

  const remindLeaders = async () => {
    if (!stats.data) return;
    const count = stats.data.forming_teams.length;
    const ok = await confirm({
      title: 'Remind team leaders?',
      message: `The leaders of ${count} team${count === 1 ? '' : 's'} below the minimum size get an in-app notification and an email saying how many members they still need.`,
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

  if (stats.error && !stats.data) return <LoadError message={apiErrorMessage(stats.error, 'Could not load the overview.')} onRetry={stats.reload} />;
  if (!stats.data) return <div className="h-48 animate-pulse rounded-xl bg-journey-text/10" aria-busy="true" aria-label="Loading the overview" />;

  const data = stats.data;
  const s = data.teams_by_status;
  const capacity = analytics.data?.capacity;
  const seatsLeft = capacity?.max_teams != null ? Math.max(0, capacity.max_teams - capacity.placed_teams) : null;
  const feesOn = Boolean(payments.data) && payments.data!.stage !== 'NONE' && payments.data!.fee_amount > 0;
  const money = payments.data ? moneySummary(payments.data.payments, now) : null;
  const waiting = s.PAYMENT_PENDING ?? 0;
  const slowPayments = money?.longWaiting ?? 0;
  const toReview = ideas.data?.counts.SUBMITTED ?? 0;
  const waitlisted = analytics.data?.waitlisted_teams ?? 0;
  const stuckRequests = finder.data?.enabled ? finder.data.stats.requests_stuck : 0;
  const longWaiting = finder.data?.enabled && finder.data.stats.teams_recruiting > 0
    ? finder.data.seekers.filter((person) => person.status === 'WAITING' && now.getTime() - new Date(person.listed_at).getTime() >= FINDER_LONG_WAIT_MS).length
    : 0;
  const pendingWithdrawals = withdrawals.data?.pending ?? 0;
  const ideaDue = hackathon.idea_deadline ? new Date(hackathon.idea_deadline) : null;
  const ideaPassed = Boolean(ideaDue) && ideaDue!.getTime() <= now.getTime();
  const ideasNearDue = Boolean(ideaDue) && now.getTime() >= ideaDue!.getTime() - IDEA_NUDGE_BEFORE_MS;
  const withoutIdea = features.ideas && ideasNearDue ? ideas.data?.missing.length ?? 0 : 0;

  const attention: AttentionItem[] = [
    { key: 'payments', count: waiting, label: `${waiting === 1 ? 'team is' : 'teams are'} waiting for their payment to be checked${slowPayments ? ` (${slowPayments} for over a day)` : ''}`, action: 'Check', tone: slowPayments ? 'red' : 'amber', onClick: () => onNavigate('payments') },
    { key: 'ideas', count: toReview, label: `${toReview === 1 ? 'idea is' : 'ideas are'} waiting for a review`, action: 'Review', tone: 'accent', onClick: () => onNavigate('ideas') },
    { key: 'no-idea', count: withoutIdea, label: `${withoutIdea === 1 ? 'team has' : 'teams have'} not sent an idea${ideaPassed ? ' and the deadline has passed' : ' yet, and it is due soon'}`, action: 'See ideas', tone: ideaPassed ? 'red' : 'amber', onClick: () => onNavigate('ideas') },
    { key: 'forming', count: data.forming_teams.length, label: `${data.forming_teams.length === 1 ? 'team is' : 'teams are'} below the minimum size of ${data.min_team_size}`, action: 'See teams', tone: 'amber', onClick: () => onNavigate('teams') },
    { key: 'withdrawals', count: pendingWithdrawals, label: `${pendingWithdrawals === 1 ? 'team asks' : 'teams ask'} to withdraw and ${pendingWithdrawals === 1 ? 'needs' : 'need'} an answer`, action: 'Answer', tone: 'amber', onClick: () => onNavigate('teams') },
    { key: 'finder-stuck', count: stuckRequests, label: `join ${stuckRequests === 1 ? 'request has' : 'requests have'} waited over 48 hours for a team leader`, action: 'See requests', tone: 'amber', onClick: () => onNavigate('finder') },
    { key: 'finder-waiting', count: longWaiting, label: `${longWaiting === 1 ? 'person has' : 'people have'} been looking for a team for 3+ days while teams have room`, action: 'Match them', tone: 'accent', onClick: () => onNavigate('finder') },
    { key: 'waitlist', count: waitlisted, label: `${waitlisted === 1 ? 'team is' : 'teams are'} on the waitlist`, action: 'See teams', tone: 'accent', onClick: () => onNavigate('teams') },
  ];

  const closes = hackathon.registration_closes_at ? new Date(hackathon.registration_closes_at) : null;
  const trendEnd = closes && closes.getTime() > now.getTime() ? closes : hackathon.end_date ? new Date(hackathon.end_date) : null;
  const placed = capacity?.max_teams != null ? `${capacity.placed_teams} of ${capacity.max_teams} team places taken` : '';
  const hasDates = milestones(hackathon).length > 0;
  const statusInput = (): StatusInput => {
    const [next] = upcoming(milestones(hackathon), new Date(), 1);
    return {
      title: hackathon.title, now: new Date(), registeredTeams: s.REGISTERED, formingTeams: s.FORMING, participants: data.participants,
      maxParticipants: capacity?.max_participants ?? null, placedTeams: capacity?.placed_teams ?? null, maxTeams: capacity?.max_teams ?? null,
      checkedIn: analytics.data && features.check_in ? analytics.data.checked_in : null, next: next ?? null, money: feesOn ? money : null,
      ideasToReview: ideas.data ? toReview : null,
      attention: attention.filter((item) => item.count > 0).map((item) => `${item.count} ${item.label}`),
    };
  };

  const blocks: Record<BlockKey, React.ReactNode> = {
    eventday: (
      <>
{checkInLive && sessions.data && (
        <EventDayCard slug={slug} sessions={sessions.data} noShows={noShows.data} participants={data.participants} onOpen={() => onNavigate('checkin')} onChanged={() => { noShows.reload(); sessions.reload(); }} />
      )}
      </>
    ),
    forming: (
      <>
{data.forming_teams.length > 0 && (
        <section className={`${PANEL} space-y-3 !p-4 sm:!p-5`} aria-label="Teams below the minimum size">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text">
                <Users className="h-4 w-4 text-amber-500" aria-hidden="true" /> Teams below the minimum size ({data.forming_teams.length})
              </h3>
              <p className="text-xs text-journey-muted">
                These teams are not registered, so they are left out of Round 1.
                {data.registration_closes_at && data.is_registration_open ? ` Registration closes ${formatDateTime(data.registration_closes_at)}.` : ''}
              </p>
            </div>
            <button onClick={remindLeaders} disabled={reminding} className={BTN_PRIMARY}>
              <Mail className="h-3.5 w-3.5" /> {reminding ? 'Sending…' : 'Remind leaders'}
            </button>
          </div>
          <ul className={`grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 ${data.forming_teams.length > 9 ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
            {data.forming_teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-3 rounded-lg border border-journey-text/10 px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-journey-text">{team.name}</span>
                  <span className="block truncate text-journey-muted">{team.leader_email ?? 'No leader'}</span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {team.members}/{data.min_team_size}
                  <span className="block text-[11px] font-medium">needs {team.needed}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      </>
    ),
    pipeline: (
      <>
{analytics.data && <PipelineCard funnel={analytics.data.funnel} features={features} participants={data.participants} />}
      </>
    ),
    trend: (
      <>
{analytics.data && <TrendCard analytics={analytics.data} endsAt={trendEnd} now={now} />}
      </>
    ),
    details: (
      <>
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <ProblemUptake stats={data} onManage={() => onNavigate('problems')} />
        <div className="space-y-6">
          {money && feesOn && payments.data && <MoneyCard summary={money} feeAmount={payments.data.fee_amount} onOpen={() => onNavigate('payments')} />}
          <RoundFunnel rounds={data.rounds} onManage={() => onNavigate('rounds')} />
        </div>
      </div>
      </>
    ),
  };
  const stage = currentStage(hackathon, now);

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-journey-muted">
        <ShareSummary input={statusInput} />
        <span>Updated {stats.updatedAt ? agoText(stats.updatedAt, now.getTime()) : '…'}</span>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loadingAny} className={`${BTN_GHOST} min-h-10`} aria-label="Refresh the overview">
          {loadingAny ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />} Refresh
        </button>
      </div>

      <SectionNotice failed={failed} />

      <StageStrip current={stage} features={hackathon.features} />

      {hasDates && <DeadlineStrip hackathon={hackathon} now={now} registrationNote={placed} />}
      <AttentionStrip items={attention} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi icon={Users} label="Registered teams" value={s.REGISTERED} hint={`${s.FORMING} still forming`} onClick={() => onNavigate('teams')} />
        <Kpi icon={UsersRound} label="Participants" value={data.participants} hint={`${plural(data.pending_invites, 'invite')} pending`} />
        <Kpi
          icon={Armchair}
          label="Team places left"
          value={seatsLeft ?? '—'}
          hint={capacity?.max_teams != null ? `${capacity.placed_teams} of ${capacity.max_teams} taken` : analytics.data ? 'No team limit' : ''}
          tone={seatsLeft === 0 ? 'red' : 'accent'}
        />
        <Kpi icon={ScanLine} label="Checked in" value={analytics.data?.checked_in ?? '—'} hint={analytics.data ? `of ${data.participants} participants` : ''} tone="green" />
        {money && feesOn ? (
          <Kpi icon={IndianRupee} label="Fees verified" value={rupees(money.verified.amount)} hint={`${plural(money.verified.count, 'team')} · ${money.waiting.count} to check`} tone="green" onClick={() => onNavigate('payments')} className="col-span-2 lg:col-span-1" />
        ) : (
          <Kpi icon={Flag} label="Rounds" value={data.rounds.length} hint={data.rounds.length === 1 ? 'round set up' : 'rounds set up'} onClick={() => onNavigate('rounds')} className="col-span-2 lg:col-span-1" />
        )}
      </div>

      {BLOCK_ORDER[stage].map((key) => <React.Fragment key={key}>{blocks[key]}</React.Fragment>)}

      <AnalyticsPanel slug={slug} data={analytics.data} />
    </div>
  );
}
