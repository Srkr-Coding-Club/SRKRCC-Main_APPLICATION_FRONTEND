'use client';

import React, { useState } from 'react';
import { Bell, ScanLine } from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import type { CheckInNoShows, CheckInSessionInfo } from '@/lib/types';
import { BTN_GHOST, BTN_PRIMARY, PANEL } from '../shared';

interface EventDayCardProps {
  slug: string;
  sessions: CheckInSessionInfo[];
  /** Who has not arrived at the arrival check-in; null when that could not be loaded. */
  noShows: CheckInNoShows | null;
  /** The people in registered teams: what arrivals are counted against. */
  participants: number;
  onOpen: () => void;
  onChanged: () => void;
}

/** The numbers an organizer wants on the day: who has arrived, session by session, who has not, and a one-click reminder. */
export function EventDayCard({ slug, sessions, noShows, participants, onOpen, onChanged }: EventDayCardProps) {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [busy, setBusy] = useState(false);
  const shown = sessions.filter((session) => session.window === 'OPEN' || (session.checked_in ?? 0) > 0 || session.is_main);
  const absent = noShows?.absent_participants ?? 0;
  const arrivalOpen = noShows?.window === 'OPEN';

  const remind = async () => {
    const ok = await confirm({
      title: `Remind ${absent} ${absent === 1 ? 'person' : 'people'}?`,
      message: `Everyone in a registered team who has not checked in gets a notification and an email: ${noShows?.teams.length ?? 0} ${noShows?.teams.length === 1 ? 'team' : 'teams'}.`,
      confirmLabel: 'Send reminders',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { reminded } = await hackathonApi.checkIn.remindNoShows(slug);
      toast.success('Reminders sent', `${reminded} ${reminded === 1 ? 'person' : 'people'} notified.`);
      onChanged();
    } catch (err) {
      toast.error('Could not send reminders', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${PANEL} space-y-4`} aria-label="Event day">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-journey-text"><ScanLine className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Event day: who has arrived</h3>
        <button type="button" onClick={onOpen} className={BTN_GHOST}>Open check-in</button>
      </div>
      <ul className="space-y-3">
        {shown.map((session) => {
          const arrived = session.checked_in ?? 0;
          const pct = participants > 0 ? Math.min(100, Math.round((arrived / participants) * 100)) : 0;
          return (
            <li key={session.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-journey-text">{session.name}{session.window === 'OPEN' && <StatusPill tone="green">Open now</StatusPill>}{session.window === 'NOT_OPEN' && <StatusPill tone="slate">Not open yet</StatusPill>}</span>
                <span className="tabular-nums text-journey-muted"><strong className="text-journey-text">{arrived}</strong> of {participants} · {pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-journey-text/10" role="img" aria-label={`${session.name}: ${arrived} of ${participants} people`}><div className="h-full rounded-full bg-journey-accent" style={{ width: `${pct}%` }} /></div>
            </li>
          );
        })}
      </ul>
      {noShows && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-journey-text/[0.04] p-3">
          <p className="text-sm text-journey-text">
            {absent === 0 ? 'Everybody in a registered team has checked in.' : <><strong className="tabular-nums">{absent}</strong> {absent === 1 ? 'person' : 'people'} in {noShows.teams.length} {noShows.teams.length === 1 ? 'team has' : 'teams have'} not arrived yet.</>}
            {noShows.waitlisted_teams > 0 && <span className="text-journey-muted"> {noShows.waitlisted_teams} on the waitlist.</span>}
          </p>
          {absent > 0 && <button type="button" onClick={remind} disabled={busy || !arrivalOpen} title={arrivalOpen ? undefined : 'Check-in is not open'} className={BTN_PRIMARY}><Bell className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? 'Sending…' : 'Remind them'}</button>}
        </div>
      )}
    </section>
  );
}
