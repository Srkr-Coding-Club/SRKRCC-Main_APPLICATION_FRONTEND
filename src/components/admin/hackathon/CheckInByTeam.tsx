'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, CircleDot, Printer, Search, Undo2, UserCheck, Users } from 'lucide-react';
import type { CheckInByTeam as ByTeam, CheckInSessionInfo, CheckInTeamMember, CheckInTeamRow, CheckInTeamState, CheckInVia } from '@/lib/types';
import { apiErrorMessage, hackathonApi, type HackathonExportKind } from '@/lib/api/hackathons';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { FormSelect } from '@/components/ui/FormSelect';
import { StatusPill, type PillTone } from '@/components/ui/StatusPill';
import { formatDateTime } from '@/components/hackathons/HackathonAnnouncementsFeed';
import { printAttendanceSheet } from '@/lib/attendanceSheet';
import { useToast } from '@/context/ToastContext';
import { LoadError } from './LoadError';
import { BTN_GHOST, INPUT, PANEL, TAP } from './shared';

const ROW_BUTTON = 'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:min-h-8';

const SEARCH_DELAY_MS = 300;

const STATE_FILTERS: { value: '' | CheckInTeamState; label: string }[] = [
  { value: '', label: 'All teams' },
  { value: 'present', label: 'Everyone in' },
  { value: 'partial', label: 'Some in' },
  { value: 'absent', label: 'Nobody in' },
];

const STATE_PILL: Record<CheckInTeamState, { tone: PillTone; label: string }> = {
  present: { tone: 'green', label: 'Everyone in' },
  partial: { tone: 'amber', label: 'Some in' },
  absent: { tone: 'red', label: 'Nobody in' },
};

const VIA_LABEL: Record<CheckInVia, string> = {
  MEMBER_QR: 'own code', TEAM_QR: 'team code', LIST: 'ticked from the list', OVERRIDE: 'let in by an organizer',
};

const EXPORT_CHOICES: { value: HackathonExportKind; label: string; note: string; usesSession: boolean }[] = [
  { value: 'check-in-teams', label: 'One row per team', note: 'How many of each team are in', usesSession: true },
  { value: 'check-in-by-team', label: 'People, grouped by team', note: 'Every person under their team', usesSession: true },
  { value: 'check-in-matrix', label: 'Every session side by side', note: 'A column for each session', usesSession: false },
];

interface TeamCardProps {
  team: CheckInTeamRow;
  slug: string;
  sessionId: number;
  /** Asks for the numbers again after someone was ticked or un-ticked. */
  onChanged: () => void;
}

function TeamCard({ team, slug, sessionId, onChanged }: TeamCardProps) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | 'all' | null>(null);
  const [problem, setProblem] = useState('');
  // Someone a session refused because they have not arrived: an organizer may let them in with a reason.
  const [letIn, setLetIn] = useState<{ member: CheckInTeamMember; reason: string } | null>(null);
  const missing = team.members.filter((member) => !member.checked_in);

  /** Tick one person in (or take it back); the server's reason is shown beside the team when it refuses. */
  const toggle = async (member: CheckInTeamMember) => {
    setBusyId(member.user_id);
    setProblem('');
    setLetIn(null);
    try {
      if (member.checked_in) await hackathonApi.checkIn.undo(slug, member.user_id, { session: sessionId });
      else await hackathonApi.checkIn.checkIn(slug, { user_id: member.user_id, session: sessionId });
      onChanged();
    } catch (err) {
      setProblem(apiErrorMessage(err, 'Could not change that check-in.'));
      if ((err as { body?: { code?: string } })?.body?.code === 'NOT_ARRIVED') setLetIn({ member, reason: '' });
    } finally {
      setBusyId(null);
    }
  };

  const letInAnyway = async () => {
    if (!letIn) return;
    setBusyId(letIn.member.user_id);
    try {
      await hackathonApi.checkIn.checkIn(slug, { user_id: letIn.member.user_id, session: sessionId, override: true, reason: letIn.reason.trim() });
      setLetIn(null);
      setProblem('');
      onChanged();
    } catch (err) {
      setProblem(apiErrorMessage(err, 'Could not let them in.'));
    } finally {
      setBusyId(null);
    }
  };

  const checkInRest = async () => {
    setBusyId('all');
    setProblem('');
    const refused: string[] = [];
    for (const member of missing) {
      try {
        await hackathonApi.checkIn.checkIn(slug, { user_id: member.user_id, session: sessionId });
      } catch (err) {
        refused.push(`${member.name}: ${apiErrorMessage(err, 'could not be checked in')}`);
      }
    }
    if (refused.length) setProblem(refused.join(' '));
    setBusyId(null);
    onChanged();
  };
  const pill = STATE_PILL[team.state];
  const percent = team.total ? Math.round((team.present / team.total) * 100) : 0;
  const panelId = `check-in-team-${team.team_id}`;
  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#1A1A2E] dark:text-white">{team.name}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {team.present} of {team.total} in{team.first_at ? ` · first at ${formatDateTime(team.first_at)}` : ''}
          </span>
        </span>
        <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden="true">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </span>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      </button>
      {open && (
        <div id={panelId} className="space-y-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {team.leader_email && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Leader: {team.leader_name} · {team.leader_email}{team.leader_phone ? ` · ${team.leader_phone}` : ''}</p>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {team.members.map((member) => (
              <li key={member.user_id} className="flex items-start gap-2 py-1.5 text-sm">
                {member.checked_in
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-label="Checked in" />
                  : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="Not checked in" />}
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-semibold text-[#1A1A2E] dark:text-white">
                    {member.name}{member.role === 'LEADER' ? <span className="ml-1.5 text-[11px] font-bold text-journey-accent">Leader</span> : null}
                  </span>
                  <span className="block break-all text-xs text-slate-500 dark:text-slate-400">
                    {member.checked_in
                      ? `${formatDateTime(member.checked_in_at)}${member.via ? ` · ${VIA_LABEL[member.via]}` : ''}${member.checked_in_by ? ` · by ${member.checked_in_by}` : ''}`
                      : member.email}
                  </span>
                  {member.override_reason && <span className="block text-xs text-amber-700 dark:text-amber-300">Let in: {member.override_reason}</span>}
                </span>
                <button
                  type="button" onClick={() => void toggle(member)} disabled={busyId !== null} className={ROW_BUTTON}
                  aria-label={`${member.checked_in ? 'Undo check-in for' : 'Check in'} ${member.name}`}
                >
                  {member.checked_in ? <><Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo</> : <><UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Check in</>}
                </button>
              </li>
            ))}
          </ul>
          {problem && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{problem}</p>}
          {letIn && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2">
              <label htmlFor={`let-in-${team.team_id}`} className="sr-only">Why is {letIn.member.name} being let in?</label>
              <input
                id={`let-in-${team.team_id}`} value={letIn.reason} maxLength={200} placeholder={`Why is ${letIn.member.name} being let in?`}
                onChange={(e) => setLetIn({ ...letIn, reason: e.target.value })} className={`${INPUT} min-w-[12rem] flex-1`}
              />
              <button type="button" onClick={() => void letInAnyway()} disabled={busyId !== null || !letIn.reason.trim()} className={ROW_BUTTON}>Let in anyway</button>
            </div>
          )}
          {missing.length > 1 && (
            <button type="button" onClick={() => void checkInRest()} disabled={busyId !== null} className={ROW_BUTTON}>
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> {busyId === 'all' ? 'Checking in…' : `Check in the other ${missing.length}`}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Organizers: pick a session and see its check-in grouped by team, then export it. */
export function CheckInByTeam({ slug, title = 'Check-in' }: { slug: string; title?: string }) {
  const { toast } = useToast();
  const [printing, setPrinting] = useState(false);
  const [sessions, setSessions] = useState<CheckInSessionInfo[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [state, setState] = useState<'' | CheckInTeamState>('');
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ByTeam | null>(null);
  const [error, setError] = useState('');
  const [exportKind, setExportKind] = useState<HackathonExportKind>('check-in-teams');

  useEffect(() => {
    hackathonApi.checkIn.sessions(slug).then(setSessions).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(typed.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const load = useCallback(() => {
    hackathonApi.checkIn.byTeam(slug, { session: sessionId ?? undefined, state: state || undefined, q: query || undefined })
      .then((payload) => { setData(payload); setError(''); })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the teams.')));
  }, [slug, sessionId, state, query]);

  useEffect(() => {
    load();
  }, [load]);

  const sessionOptions = sessions.map((item) => ({ value: String(item.id), label: item.name, hint: item.is_main ? 'Arrival' : item.outside_schedule ? 'Retired' : undefined }));
  const choice = EXPORT_CHOICES.find((item) => item.value === exportKind) ?? EXPORT_CHOICES[0];
  const exportParams = () => ({
    ...(choice.usesSession && sessionId ? { session: sessionId } : {}),
    ...(choice.usesSession && state ? { state } : {}),
    ...(choice.usesSession && query ? { search: query } : {}),
  });
  const totals = data?.totals;

  /** The desk sheet lists every team of the session, whatever the filters on screen. */
  const printSheet = async () => {
    setPrinting(true);
    try {
      const everything = await hackathonApi.checkIn.byTeam(slug, { session: sessionId ?? undefined });
      if (!printAttendanceSheet(everything, title)) toast.error('Could not open the sheet', 'Allow pop-ups for this site and try again.');
    } catch (err) {
      toast.error('Could not prepare the sheet', apiErrorMessage(err));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-4`} aria-label="Check-in by team">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><Users className="h-4 w-4 text-journey-accent" /> Check-in by team</h3>
        <button type="button" onClick={load} className={`${BTN_GHOST} ${TAP}`}>Refresh</button>
      </div>

      {sessions.length > 1 && (
        <FormSelect
          value={sessionId === null ? '' : String(sessionId)}
          options={sessionOptions}
          placeholder="Arrival (main session)"
          allowClear
          onChange={(value) => setSessionId(value ? Number(value) : null)}
          aria-label="Session"
        />
      )}

      {totals && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <CircleDot className="h-3.5 w-3.5 text-journey-accent" aria-hidden="true" />
          <span><strong>{totals.people_in}</strong> of {totals.people} people in</span>
          <span><strong>{totals.present}</strong> teams complete</span>
          <span><strong>{totals.partial}</strong> partly in</span>
          <span><strong>{totals.absent}</strong> not here</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show teams" className="flex flex-wrap gap-1.5">
          {STATE_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'} type="button" aria-pressed={state === filter.value} onClick={() => setState(filter.value)}
              className={`min-h-11 rounded-full border px-3 sm:min-h-9 text-xs font-bold transition ${state === filter.value ? 'border-journey-accent bg-journey-accent/15 text-journey-accent' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="check-in-team-search" className="sr-only">Search teams or people</label>
          <input id="check-in-team-search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search a team or a person" className={`${INPUT} pl-9`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-500/5 p-2">
        <div className="min-w-[14rem] flex-1">
          <FormSelect
            value={exportKind}
            options={EXPORT_CHOICES.map((item) => ({ value: item.value, label: item.label, hint: item.note }))}
            placeholder="Choose what to export"
            allowClear={false}
            onChange={(value) => value && setExportKind(value as HackathonExportKind)}
            aria-label="What to export"
          />
        </div>
        <button type="button" onClick={() => void printSheet()} disabled={printing || !data || data.teams.length === 0} className={`${BTN_GHOST} ${TAP}`}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" /> {printing ? 'Preparing…' : 'Print sheet'}
        </button>
        <ExportMenu
          subject={`${choice.label.toLowerCase()} check-in`}
          disabled={!data || data.teams.length === 0}
          onExport={(format) => hackathonApi.exportFile(slug, exportKind, format, exportParams())}
        />
        {choice.usesSession && (state || query) && <p className="basis-full text-[11px] text-slate-500 dark:text-slate-400">The export follows the filters above.</p>}
      </div>

      {error && <LoadError message={error} onRetry={load} />}
      {data && data.teams.length === 0 && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{state || query ? 'No team matches.' : 'No registered teams yet.'}</p>
      )}
      {data && data.teams.length > 0 && (
        <ul className="space-y-2" aria-label="Teams">
          {data.teams.map((team) => <TeamCard key={team.team_id} team={team} slug={slug} sessionId={data.session.id} onChanged={load} />)}
        </ul>
      )}
    </section>
  );
}
