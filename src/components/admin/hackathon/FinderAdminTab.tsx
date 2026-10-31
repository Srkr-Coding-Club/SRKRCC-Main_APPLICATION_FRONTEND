'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Mail, Phone, Search, Send, UserCheck, UserMinus, UserPlus, Users, UsersRound, X } from 'lucide-react';
import type { FinderAdminPayload, FinderAdminRequest, FinderAdminSeeker, FinderAdminTeam, Hackathon, HackathonTeam } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { Modal } from '@/components/ui/Modal';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { LoadError } from './LoadError';
import { Kpi, plural } from './OverviewParts';
import { BTN_DANGER as DANGER, BTN_GHOST as GHOST, BTN_PRIMARY as PRIMARY, INPUT, PANEL } from './shared';

/** Buttons are a full 44px tall on a phone and the compact size from the tablet up. */
const TOUCH = 'min-h-11 sm:min-h-9';
const BTN_GHOST = `${GHOST} ${TOUCH}`;
const BTN_PRIMARY = `${PRIMARY} ${TOUCH}`;
const BTN_DANGER = `${DANGER} ${TOUCH}`;

const REFRESH_MS = 30000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Matches the server: a person listed this long without a team is worth a nudge. */
const LONG_WAIT_DAYS = 3;

type View = 'people' | 'teams' | 'requests';
type PeopleFilter = FinderAdminSeeker['status'] | 'ALL';
type RequestFilter = 'PENDING' | 'STUCK' | 'ALL';

const PERSON_PILL: Record<FinderAdminSeeker['status'], { tone: PillTone; label: string }> = {
  WAITING: { tone: 'amber', label: 'Looking for a team' },
  MATCHED: { tone: 'green', label: 'On a team' },
  WITHDRAWN: { tone: 'slate', label: 'Not listed' },
};

const REQUEST_PILL: Record<FinderAdminRequest['status'], { tone: PillTone; label: string }> = {
  PENDING: { tone: 'amber', label: 'Waiting for the leader' },
  ACCEPTED: { tone: 'green', label: 'Accepted' },
  DECLINED: { tone: 'red', label: 'Declined' },
  CANCELLED: { tone: 'slate', label: 'Closed' },
};

/** "today", "yesterday", "5 days ago". */
export function waitedFor(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return 'today';
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY_MS;

function Contact({ email, phone }: { email?: string; phone?: string }) {
  if (!email && !phone) return null;
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {email && <a href={`mailto:${email}`} className="inline-flex min-h-8 items-center gap-1 break-all font-semibold text-journey-accent hover:underline"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" /> {email}</a>}
      {phone && <a href={`tel:${phone}`} className="inline-flex min-h-8 items-center gap-1 font-semibold text-journey-accent hover:underline"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" /> {phone}</a>}
    </span>
  );
}

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-full border px-3 py-1 text-xs font-bold ${value === option.value ? 'border-journey-accent bg-journey-accent/10 text-journey-accent' : 'border-journey-text/10 text-journey-muted hover:text-journey-text'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ReasonTarget { kind: 'remove' | 'stop'; id: number; name: string }

/** The team finder as organizers see it: who is looking, who is recruiting, the requests between them, and the controls to tidy and match. */
export function FinderAdminTab({ hackathon }: { hackathon: Hackathon }) {
  const slug = hackathon.slug;
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [data, setData] = useState<FinderAdminPayload | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('people');
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('WAITING');
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('PENDING');
  const [longWait, setLongWait] = useState(false);
  const [seatsOnly, setSeatsOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<ReasonTarget | null>(null);
  const [reason, setReason] = useState('');
  const [placing, setPlacing] = useState<FinderAdminSeeker | null>(null);

  const newest = useRef(0);
  const load = useCallback(() => {
    const mine = ++newest.current;
    hackathonApi.admin.finder(slug)
      .then((payload) => { if (mine === newest.current) { setData(payload); setError(''); } })
      .catch((err) => { if (mine === newest.current) setError(apiErrorMessage(err, 'Could not load the team finder.')); });
  }, [slug]);
  const reload = useRef(load);
  useEffect(() => { reload.current = load; }, [load]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const run = async (key: string, action: () => Promise<string>, failure = 'Could not complete that') => {
    setBusy(key);
    try {
      toast.success(await action());
      return true;
    } catch (err) {
      toast.error(failure, apiErrorMessage(err));
      return false;
    } finally {
      setBusy(null);
      reload.current();
    }
  };

  const submitReason = async () => {
    if (!reasonFor) return;
    const target = reasonFor;
    const ok = await run(`${target.kind}-${target.id}`, async () => {
      if (target.kind === 'remove') {
        await hackathonApi.admin.finderRemoveSeeker(slug, target.id, reason.trim());
        return `${target.name} was removed from the finder`;
      }
      const { requests_closed: closed } = await hackathonApi.admin.finderStopRecruiting(slug, target.id, reason.trim());
      return `${target.name} stopped recruiting${closed ? ` · ${plural(closed, 'request')} closed` : ''}`;
    });
    if (ok) { setReasonFor(null); setReason(''); }
  };

  const closeRequest = async (row: FinderAdminRequest) => {
    const ok = await confirm({
      title: `Close ${row.name}'s request?`,
      message: `${row.name} is told the request to ${row.team_name} was closed and can ask another team.`,
      confirmLabel: 'Close request',
    });
    if (ok) await run(`request-${row.id}`, async () => { await hackathonApi.admin.finderCancelRequest(slug, row.id); return 'Request closed'; });
  };

  const remind = async (audience: 'seekers' | 'teams') => {
    const who = audience === 'seekers' ? 'people who have waited' : 'recruiting teams';
    const ok = await confirm({
      title: audience === 'seekers' ? 'Remind people who are waiting?' : 'Remind recruiting teams?',
      message: audience === 'seekers'
        ? `People listed for ${LONG_WAIT_DAYS} days or more get one in-app nudge that teams are recruiting. Nobody is nudged more than once a day.`
        : 'Recruiting teams with a free seat get one in-app nudge that people are looking for a team. No team is nudged more than once a day.',
      confirmLabel: 'Send reminders',
    });
    if (!ok) return;
    await run(`remind-${audience}`, async () => {
      const { reminded } = await hackathonApi.admin.finderRemind(slug, audience);
      return reminded ? `${reminded} notified` : `No ${who} needed a reminder right now`;
    });
  };

  const query = search.trim().toLowerCase();
  const matches = (...texts: (string | null | undefined)[]) => !query || texts.some((text) => (text ?? '').toLowerCase().includes(query));

  const people = useMemo(() => (data?.seekers ?? []).filter((person) => (
    (peopleFilter === 'ALL' || person.status === peopleFilter)
    && (!longWait || (person.status === 'WAITING' && daysSince(person.listed_at) >= LONG_WAIT_DAYS))
    && matches(person.name, person.email, person.skills, person.note, person.profile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  )), [data, peopleFilter, longWait, query]);
  const teams = useMemo(() => (data?.teams ?? []).filter((team) => (!seatsOnly || team.seats_open > 0) && matches(team.name, team.looking_for, team.leader, team.problem)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data, seatsOnly, query]);
  const requests = useMemo(() => (data?.requests ?? []).filter((row) => (
    (requestFilter === 'ALL' || (requestFilter === 'PENDING' ? row.status === 'PENDING' : row.stuck))
    && matches(row.name, row.team_name, row.message)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  )), [data, requestFilter, query]);

  if (error && !data) return <LoadError message={error} onRetry={load} />;
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-journey-text/10" />;

  const { stats } = data;
  const median = stats.median_hours_to_match;
  const counts: Record<View, number> = { people: stats.seekers_waiting, teams: data.teams.length, requests: stats.requests_pending };

  return (
    <div className="space-y-6">
      {dialog}
      {!data.enabled && (
        <p role="status" className={`${PANEL} border-amber-500/30 text-sm text-journey-text`}>
          The team finder is switched off for this hackathon, so participants cannot use it. You can still look, but actions are disabled. Turn it on under Registration controls.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={UsersRound} label="Looking for a team" value={stats.seekers_waiting} hint={`${stats.matched} matched so far`} onClick={() => { setView('people'); setPeopleFilter('WAITING'); }} />
        <Kpi icon={Users} label="Teams with a free seat" value={stats.teams_recruiting} hint={`${data.teams.length} recruiting`} tone="green" onClick={() => { setView('teams'); setSeatsOnly(true); }} />
        <Kpi icon={Send} label="Requests waiting" value={stats.requests_pending} hint={stats.requests_stuck ? `${stats.requests_stuck} older than 48 hours` : 'None stuck'} tone={stats.requests_stuck ? 'amber' : 'accent'} onClick={() => { setView('requests'); setRequestFilter(stats.requests_stuck ? 'STUCK' : 'PENDING'); }} />
        <Kpi icon={Clock} label="Typical time to match" value={median === null ? '—' : median < 48 ? `${Math.round(median)} h` : `${Math.round(median / 24)} days`} hint={median === null ? 'No matches yet' : 'from listing to a team'} tone="green" />
      </div>

      <section className={`${PANEL} space-y-4`} aria-label="Team finder">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Finder views" className="flex flex-wrap gap-1.5">
            {([['people', 'People'], ['teams', 'Teams'], ['requests', 'Requests']] as [View, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={`min-h-10 rounded-lg px-3.5 py-2 text-xs font-bold ${view === key ? 'bg-journey-accent text-journey-on-accent' : 'border border-journey-text/10 text-journey-muted hover:text-journey-text'}`}
              >
                {label} <span className="tabular-nums opacity-80">({counts[key]})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => remind(view === 'teams' ? 'teams' : 'seekers')} disabled={!data.enabled || busy !== null} className={BTN_GHOST}>
              <Mail className="h-3.5 w-3.5" /> {view === 'teams' ? 'Remind teams' : 'Remind people'}
            </button>
            <ExportMenu
              subject={view === 'teams' ? 'recruiting teams' : 'unmatched people'}
              onExport={(format) => hackathonApi.exportFile(slug, view === 'teams' ? 'finder-teams' : 'finder-seekers', format)}
              triggerClassName={BTN_GHOST}
            />
            <button type="button" onClick={load} className={BTN_GHOST}>Refresh</button>
          </div>
        </div>
        {error && <LoadError message={error} onRetry={load} />}

        <div className="flex flex-wrap items-center gap-3">
          {view === 'people' && (
            <>
              <Chips<PeopleFilter> label="Filter people" value={peopleFilter} onChange={setPeopleFilter} options={[
                { value: 'WAITING', label: 'Looking' }, { value: 'MATCHED', label: 'On a team' }, { value: 'WITHDRAWN', label: 'Not listed' }, { value: 'ALL', label: 'All' },
              ]} />
              <label className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-journey-muted">
                <input type="checkbox" checked={longWait} onChange={(event) => setLongWait(event.target.checked)} className="h-4 w-4 accent-[#FF7A00]" />
                Waiting {LONG_WAIT_DAYS}+ days
              </label>
            </>
          )}
          {view === 'teams' && (
            <label className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-journey-muted">
              <input type="checkbox" checked={seatsOnly} onChange={(event) => setSeatsOnly(event.target.checked)} className="h-4 w-4 accent-[#FF7A00]" />
              Only teams with a free seat
            </label>
          )}
          {view === 'requests' && (
            <Chips<RequestFilter> label="Filter requests" value={requestFilter} onChange={setRequestFilter} options={[
              { value: 'PENDING', label: `Waiting (${stats.requests_pending})` }, { value: 'STUCK', label: `Stuck (${stats.requests_stuck})` }, { value: 'ALL', label: 'All' },
            ]} />
          )}
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, skill, team…" aria-label="Search the finder" className={`${INPUT} pl-9`} />
          </div>
        </div>

        {view === 'people' && (
          people.length === 0 ? <Empty text={peopleFilter === 'WAITING' && !query && !longWait ? 'Nobody is looking for a team right now.' : 'Nobody matches.'} /> : (
            <ul className="space-y-3">
              {people.map((person) => <PersonCard key={person.id} person={person} enabled={data.enabled} busy={busy} onPlace={() => setPlacing(person)} onRemove={() => { setReasonFor({ kind: 'remove', id: person.id, name: person.name }); setReason(''); }} />)}
            </ul>
          )
        )}

        {view === 'teams' && (
          teams.length === 0 ? <Empty text="No team is recruiting." /> : (
            <ul className="space-y-3">
              {teams.map((team) => <TeamCard key={team.id} team={team} enabled={data.enabled} busy={busy} onStop={() => { setReasonFor({ kind: 'stop', id: team.id, name: team.name }); setReason(''); }} />)}
            </ul>
          )
        )}

        {view === 'requests' && (
          requests.length === 0 ? <Empty text={requestFilter === 'ALL' ? 'No requests yet.' : 'Nothing is waiting.'} /> : (
            <ul className="space-y-3">
              {requests.map((row) => <RequestCard key={row.id} row={row} enabled={data.enabled} busy={busy} onClose={() => closeRequest(row)} />)}
            </ul>
          )
        )}
      </section>

      <Modal
        isOpen={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        busy={busy !== null}
        title={reasonFor?.kind === 'remove' ? `Remove ${reasonFor.name} from the finder?` : `Stop ${reasonFor?.name ?? 'this team'} recruiting?`}
        icon={reasonFor?.kind === 'remove' ? UserMinus : X}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setReasonFor(null)} className={BTN_GHOST} disabled={busy !== null}>Cancel</button>
            <button type="button" onClick={submitReason} disabled={busy !== null} className={BTN_PRIMARY}>{busy ? 'Working…' : reasonFor?.kind === 'remove' ? 'Remove listing' : 'Stop recruiting'}</button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-journey-muted">
            {reasonFor?.kind === 'remove'
              ? 'Their skills and note are cleared and their open requests are withdrawn. They are told, and can list themselves again.'
              : 'The requests waiting on this team are closed and the senders are told. The leader can switch recruiting on again.'}
          </p>
          <label htmlFor="finder-reason" className="block text-xs font-bold text-journey-text">Reason (shown to them, optional)</label>
          <textarea id="finder-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={3} className={INPUT} />
        </div>
      </Modal>

      {placing && <PlaceDialog hackathon={hackathon} seeker={placing} recruiting={data.teams} onClose={() => setPlacing(null)} onPlace={async (teamId, teamName) => {
        const ok = await run(`place-${placing.id}`, async () => { await hackathonApi.admin.finderPlace(slug, placing.id, teamId); return `${placing.name} was placed in ${teamName}`; }, 'Could not place them');
        if (ok) setPlacing(null);
        return ok;
      }} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-journey-text/15 p-6 text-center text-sm text-journey-muted">{text}</p>;
}

function PersonCard({ person, enabled, busy, onPlace, onRemove }: { person: FinderAdminSeeker; enabled: boolean; busy: string | null; onPlace: () => void; onRemove: () => void }) {
  const pill = PERSON_PILL[person.status];
  const waiting = person.status === 'WAITING';
  return (
    <li className="space-y-3 rounded-xl border border-journey-text/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-journey-text">{person.name}</p>
          <p className="text-xs text-journey-muted">{person.profile || 'No profile details'} · listed {waitedFor(person.listed_at)}</p>
        </div>
        <StatusPill tone={pill.tone}>{person.status === 'MATCHED' && person.team ? `On ${person.team}` : pill.label}</StatusPill>
      </div>
      {(person.skills || person.note) && (
        <dl className="space-y-1 text-sm">
          {person.skills && <div><dt className="inline text-xs font-bold uppercase text-journey-muted">Skills </dt><dd className="inline break-words text-journey-text">{person.skills}</dd></div>}
          {person.note && <div><dt className="inline text-xs font-bold uppercase text-journey-muted">Note </dt><dd className="inline break-words text-journey-text/85">{person.note}</dd></div>}
        </dl>
      )}
      <Contact email={person.email} phone={person.phone} />
      {person.pending_requests > 0 && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{plural(person.pending_requests, 'request')} waiting for a leader's answer</p>}
      {waiting && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPlace} disabled={!enabled || busy !== null} className={BTN_PRIMARY}><UserPlus className="h-3.5 w-3.5" /> Place on a team</button>
          <button type="button" onClick={onRemove} disabled={!enabled || busy !== null} className={BTN_DANGER}><UserMinus className="h-3.5 w-3.5" /> Remove listing</button>
        </div>
      )}
    </li>
  );
}

function TeamCard({ team, enabled, busy, onStop }: { team: FinderAdminTeam; enabled: boolean; busy: string | null; onStop: () => void }) {
  return (
    <li className="space-y-3 rounded-xl border border-journey-text/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-journey-text">{team.name}</p>
          <p className="text-xs text-journey-muted">{team.leader || 'No leader'}{team.problem ? ` · ${team.problem}` : ''}</p>
        </div>
        <StatusPill tone={team.seats_open > 0 ? 'green' : 'slate'}>{team.members}/{team.max_members} · {team.seats_open > 0 ? `${plural(team.seats_open, 'seat')} free` : 'Full'}</StatusPill>
      </div>
      {team.looking_for && <p className="text-sm text-journey-text"><span className="text-xs font-bold uppercase text-journey-muted">Looking for </span>{team.looking_for}</p>}
      <Contact email={team.leader_email} phone={team.leader_phone} />
      {team.pending_requests > 0 && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{plural(team.pending_requests, 'request')} waiting for the leader</p>}
      <button type="button" onClick={onStop} disabled={!enabled || busy !== null} className={BTN_DANGER}><X className="h-3.5 w-3.5" /> Stop recruiting</button>
    </li>
  );
}

function RequestCard({ row, enabled, busy, onClose }: { row: FinderAdminRequest; enabled: boolean; busy: string | null; onClose: () => void }) {
  const pill = REQUEST_PILL[row.status];
  return (
    <li className={`space-y-2 rounded-xl border p-4 ${row.stuck ? 'border-amber-500/40' : 'border-journey-text/10'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-journey-text">{row.name} <span className="font-normal text-journey-muted">asked to join</span> {row.team_name}</p>
          <p className="text-xs text-journey-muted">{row.profile || 'No profile details'} · sent {waitedFor(row.created_at)}</p>
        </div>
        <span className="flex flex-wrap gap-1.5">
          {row.stuck && <StatusPill tone="amber" icon={Clock}>Stuck</StatusPill>}
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </span>
      </div>
      {row.message && <p className="break-words text-sm text-journey-text/85">“{row.message}”</p>}
      <Contact email={row.email} phone={row.phone} />
      {row.status !== 'PENDING' && row.decided_at && (
        <p className="text-xs text-journey-muted">{pill.label}{row.decided_by ? ` by ${row.decided_by}` : ''} on {formatDateTime(row.decided_at)}.</p>
      )}
      {row.status === 'PENDING' && (
        <button type="button" onClick={onClose} disabled={!enabled || busy !== null} className={BTN_DANGER}><X className="h-3.5 w-3.5" /> Close request</button>
      )}
    </li>
  );
}

/** Pick the team for a listed person: the recruiting ones first, then any other team that still has a seat. */
function PlaceDialog({ hackathon, seeker, recruiting, onClose, onPlace }: {
  hackathon: Hackathon; seeker: FinderAdminSeeker; recruiting: FinderAdminTeam[]; onClose: () => void; onPlace: (teamId: number, teamName: string) => Promise<boolean>;
}) {
  const [others, setOthers] = useState<HackathonTeam[]>([]);
  const [teamId, setTeamId] = useState('');
  const [working, setWorking] = useState(false);
  const max = hackathon.max_team_size ?? 0;
  const open = recruiting.filter((team) => team.seats_open > 0);
  const recruitingIds = new Set(recruiting.map((team) => team.id));

  useEffect(() => {
    hackathonApi.admin.teams(hackathon.slug)
      .then((all) => setOthers(all.filter((team) => (team.status === 'FORMING' || team.status === 'REGISTERED') && !recruitingIds.has(team.id) && (!max || team.member_count < max))))
      .catch(() => setOthers([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon.slug]);

  const nameOf = (id: string) => open.find((team) => String(team.id) === id)?.name ?? others.find((team) => String(team.id) === id)?.name ?? 'the team';
  const submit = async () => {
    if (!teamId) return;
    setWorking(true);
    const ok = await onPlace(Number(teamId), nameOf(teamId));
    if (!ok) setWorking(false);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      busy={working}
      title={`Place ${seeker.name} on a team`}
      icon={UserCheck}
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={working} className={BTN_GHOST}>Cancel</button>
          <button type="button" onClick={submit} disabled={working || !teamId} className={BTN_PRIMARY}>{working ? 'Placing…' : 'Place on team'}</button>
        </div>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-journey-muted">
          The same checks as a normal join apply (free seat, registration open, complete profile, not already on a team). {seeker.name} is told, and finishes the rules and questions on their dashboard.
        </p>
        <label htmlFor="place-team" className="block text-xs font-bold text-journey-text">Team</label>
        <select id="place-team" value={teamId} onChange={(event) => setTeamId(event.target.value)} className={INPUT}>
          <option value="">Choose a team…</option>
          {open.length > 0 && (
            <optgroup label="Recruiting">
              {open.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.members}/{team.max_members}{team.looking_for ? ` · ${team.looking_for}` : ''}</option>)}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other teams with a free seat">
              {others.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.member_count}/{max || '?'}</option>)}
            </optgroup>
          )}
        </select>
        {open.length === 0 && others.length === 0 && <p className="text-xs text-journey-muted">No team has a free seat right now.</p>}
      </div>
    </Modal>
  );
}
