'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, UserX } from 'lucide-react';
import type { CheckInNoShows as NoShowReport, CheckInSessionInfo } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useToast } from '@/context/ToastContext';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormSelect } from '@/components/ui/FormSelect';
import { LoadError } from './LoadError';
import { BTN_DANGER, BTN_GHOST, PANEL } from './shared';

/** Organizers: nudge people who have not arrived, and free the places of teams that never showed up. */
export function CheckInNoShows({ slug }: { slug: string }) {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [report, setReport] = useState<NoShowReport | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<CheckInSessionInfo[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    hackathonApi.checkIn.sessions(slug).then(setSessions).catch(() => undefined);
  }, [slug]);

  const load = useCallback(() => {
    hackathonApi.checkIn.noShows(slug, sessionId ?? undefined).then((data) => { setReport(data); setError(''); }).catch((err) => setError(apiErrorMessage(err, 'Could not load the no-shows.')));
  }, [slug, sessionId]);

  useEffect(() => { setPicked(new Set()); load(); }, [load]);

  // Teams are only withdrawn for missing the arrival check-in; other sessions just get a reminder.
  const arrival = report?.session?.is_main ?? true;
  const sessionName = arrival ? '' : report?.session?.name ?? '';
  const options = sessions.filter((item) => item.is_active && !item.outside_schedule).map((item) => ({ value: String(item.id), label: item.name, hint: item.is_main ? 'Arrival' : undefined }));

  const toggle = (teamId: number) => setPicked((current) => {
    const next = new Set(current);
    if (!next.delete(teamId)) next.add(teamId);
    return next;
  });

  const remind = async () => {
    setBusy(true);
    try {
      const { reminded } = await hackathonApi.checkIn.remindNoShows(slug, sessionId ?? undefined);
      toast.success(reminded ? `Reminded ${reminded} ${reminded === 1 ? 'person' : 'people'}` : 'Everyone has arrived');
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    const waiting = report?.waitlisted_teams ?? 0;
    const ok = await confirm({
      title: `Withdraw ${picked.size} ${picked.size === 1 ? 'team' : 'teams'}?`,
      message: `They are marked as withdrawn and told so.${waiting ? ` Waitlisted teams (${waiting}) are moved in as places free up.` : ''}`,
      confirmLabel: 'Withdraw teams',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { withdrawn } = await hackathonApi.checkIn.withdrawNoShows(slug, [...picked]);
      toast.success(`Withdrew ${withdrawn} ${withdrawn === 1 ? 'team' : 'teams'}`);
      setPicked(new Set());
      load();
    } catch (err) {
      toast.error('Could not withdraw the teams', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-3`}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><UserX className="h-4 w-4 text-journey-accent" /> No-shows</h3>
      {options.length > 1 && (
        <FormSelect
          value={sessionId === null ? '' : String(sessionId)}
          options={options}
          placeholder="Arrival (main session)"
          allowClear
          onChange={(value) => setSessionId(value ? Number(value) : null)}
          aria-label="Session"
        />
      )}
      {error && <LoadError message={error} onRetry={load} />}
      {report && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {report.absent_participants} {report.absent_participants === 1 ? 'person has' : 'people have'} not checked in{sessionName ? ` to ${sessionName}` : ''}.
            {' '}{report.teams.length} {report.teams.length === 1 ? 'team has' : 'teams have'} nobody here.
            {arrival && report.window === 'OPEN' ? ' Check-in is still open, so withdrawing is best left until it closes.' : ''}
            {!arrival ? ' Teams are only withdrawn for missing the arrival check-in.' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void remind()} disabled={busy || report.absent_participants === 0} className={BTN_GHOST}><BellRing className="h-3.5 w-3.5" /> Remind everyone who is missing</button>
            <button type="button" onClick={load} className={BTN_GHOST}>Refresh</button>
          </div>
          {report.teams.length > 0 && (
            <>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label="Teams with nobody checked in">
                {report.teams.map((team) => (
                  <li key={team.team_id}>
                    <label className="flex min-h-11 items-center gap-3 py-1.5 text-sm text-[#1A1A2E] dark:text-white">
                      {arrival && <input type="checkbox" checked={picked.has(team.team_id)} onChange={() => toggle(team.team_id)} className="h-4 w-4 accent-[#FF7A00]" />}
                      <span className="min-w-0 flex-1 truncate font-semibold">{team.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{team.members} {team.members === 1 ? 'member' : 'members'}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {arrival && <button type="button" onClick={() => void withdraw()} disabled={busy || picked.size === 0} className={BTN_DANGER}>Withdraw selected teams</button>}
            </>
          )}
        </>
      )}
      {confirmDialog}
    </section>
  );
}
