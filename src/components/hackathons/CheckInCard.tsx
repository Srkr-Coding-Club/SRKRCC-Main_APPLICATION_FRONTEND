'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Circle, Clock, QrCode } from 'lucide-react';
import type { MyCheckIn, MyCheckInSession } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { H2, PANEL } from './dashboardStyles';
import { formatDateTime } from './HackathonAnnouncementsFeed';

const REFRESH_MS = 20000;

type CodeKind = 'person' | 'team';

const CODE_COPY: Record<CodeKind, { tab: string; title: string; hint: string }> = {
  person: { tab: 'My code', title: 'Your check-in QR code', hint: 'Show this code at the desk. It is personal, so do not share it.' },
  team: { tab: 'Team code', title: 'Your team check-in QR code', hint: 'Show this when a volunteer checks your team in together. They pick who is there, so it checks in nobody by itself.' },
};

/** Why there is no code to show right now, from the sessions when there are several. */
function waitingMessage(state: MyCheckIn, sessions: MyCheckInSession[]): string {
  if (sessions.length > 1) {
    const next = sessions.filter((session) => session.window === 'NOT_OPEN' && session.opens_at).sort((a, b) => String(a.opens_at).localeCompare(String(b.opens_at)))[0];
    return next
      ? `${next.name} opens ${formatDateTime(next.opens_at)}. Your QR code will appear here.`
      : 'Check-in has closed. Please ask a volunteer at the desk for help.';
  }
  return state.window === 'NOT_OPEN'
    ? `Check-in opens ${formatDateTime(state.opens_at)}. Your QR code will appear here.`
    : 'Check-in has closed. Please ask a volunteer at the desk for help.';
}

function SessionRow({ session }: { session: MyCheckInSession }) {
  const status = session.checked_in
    ? { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />, text: `Checked in ${formatDateTime(session.checked_in_at)}` }
    : session.window === 'OPEN'
      ? { icon: <Clock className="h-4 w-4 text-journey-accent" aria-hidden="true" />, text: 'Open now' }
      : session.window === 'NOT_OPEN'
        ? { icon: <Circle className="h-4 w-4 text-journey-muted" aria-hidden="true" />, text: session.opens_at ? `Opens ${formatDateTime(session.opens_at)}` : 'Not open yet' }
        : { icon: <Circle className="h-4 w-4 text-journey-muted" aria-hidden="true" />, text: 'Closed' };
  return (
    <li className="flex items-start gap-2 py-1.5 text-left text-sm">
      <span className="mt-0.5 shrink-0">{status.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-semibold text-journey-text">{session.name}</span>
        <span className="block text-xs text-journey-muted">{status.text}</span>
      </span>
    </li>
  );
}

/** Your personal QR code, and your team's, for the organizers to scan at the venue, with where you stand in each session. */
export function CheckInCard({ slug }: { slug: string }) {
  const [state, setState] = useState<MyCheckIn | null>(null);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<CodeKind>('person');

  useEffect(() => {
    hackathonApi.myCheckIn(slug).then(setState).catch((err) => setMessage(apiErrorMessage(err)));
    const refresh = window.setInterval(() => hackathonApi.myCheckIn(slug).then(setState).catch(() => undefined), REFRESH_MS);
    return () => window.clearInterval(refresh);
  }, [slug]);

  const sessions = state?.sessions ?? [];
  const several = sessions.length > 1;
  const hasTeamCode = Boolean(state?.team_token);
  const shown: CodeKind = kind === 'team' && hasTeamCode ? 'team' : 'person';
  const copy = CODE_COPY[shown];

  return (
    <section className={`${PANEL} space-y-3 text-center`}>
      <h2 className={`${H2} justify-center`}><QrCode className="h-4 w-4" /> Event check-in</h2>
      {!state ? (
        <p className="text-sm text-journey-muted">{message || 'Loading…'}</p>
      ) : !several && state.checked_in ? (
        <div className="space-y-1 py-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden="true" />
          <p className="font-bold text-journey-text">You are checked in</p>
          <p className="text-xs text-journey-muted">{formatDateTime(state.checked_in_at)}</p>
        </div>
      ) : !state.token ? (
        <p className="py-4 text-sm text-journey-muted">{waitingMessage(state, sessions)}</p>
      ) : (
        <>
          {hasTeamCode && (
            <div role="tablist" aria-label="Which code to show" className="mx-auto flex w-fit gap-1 rounded-lg bg-journey-text/[0.06] p-1">
              {(['person', 'team'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  id={`check-in-tab-${option}`}
                  aria-selected={shown === option}
                  aria-controls="check-in-code-panel"
                  onClick={() => setKind(option)}
                  className={`min-h-11 rounded-md px-4 py-2 text-xs font-bold transition sm:min-h-0 ${shown === option ? 'bg-journey-accent text-journey-on-accent' : 'text-journey-muted hover:text-journey-text'}`}
                >
                  {CODE_COPY[option].tab}
                </button>
              ))}
            </div>
          )}
          <div id="check-in-code-panel" role={hasTeamCode ? 'tabpanel' : undefined} aria-labelledby={hasTeamCode ? `check-in-tab-${shown}` : undefined} className="space-y-3">
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG value={shown === 'team' ? state.team_token : state.token} size={192} level="M" role="img" title={copy.title} aria-label={`${copy.title}. ${shown === 'team' ? 'Show it to the volunteer with your team.' : 'Show it at the desk.'}`} />
            </div>
            <p className="text-xs text-journey-muted">{several ? copy.hint : 'Show this code at the entrance. It is personal, so do not share it.'}</p>
            {shown === 'team' && state.team && <p className="text-xs font-semibold text-journey-text">{state.team.name}</p>}
          </div>
        </>
      )}
      {state && several && (
        <ul aria-label="Check-in sessions" className="divide-y divide-journey-text/10 border-t border-journey-text/10 pt-1">
          {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
        </ul>
      )}
    </section>
  );
}
