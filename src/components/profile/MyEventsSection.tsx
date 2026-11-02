'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HackathonTeam, HackathonTeamInvite } from '@/lib/types';
import { hackathonApi } from '@/lib/api/hackathons';
import { organizeMyEvents, type MyEventEntry, type RegisteredEventItem } from '@/lib/myEvents';
import { HackathonInviteRow, HackathonTeamCard } from '@/components/hackathons/MyHackathonCards';
import { EventTicket } from './EventTicket';
import { focusRing } from './styles';

type Tab = 'upcoming' | 'past';

interface MyEventsSectionProps {
  registrations: RegisteredEventItem[];
  cancellingId: number | null;
  onShowQr: (event: RegisteredEventItem) => void;
  onRate: (event: RegisteredEventItem) => void;
  onCancel: (event: RegisteredEventItem) => void;
  /** Shown when the person has signed up for nothing at all. */
  emptyState: React.ReactNode;
}

/** Everything the person signed up for in one place: events and hackathon teams split into Upcoming and Past, then plain forms. */
export function MyEventsSection({ registrations, cancellingId, onShowQr, onRate, onCancel, emptyState }: MyEventsSectionProps) {
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [invites, setInvites] = useState<HackathonTeamInvite[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    hackathonApi.myInvites().then(setInvites).catch(() => setInvites([]));
    hackathonApi.myTeams().then(setTeams).catch(() => setTeams([])).finally(() => setTeamsLoaded(true));
  }, []);

  const { upcoming, past, forms } = useMemo(() => organizeMyEvents(registrations, teams, Date.now()), [registrations, teams]);
  const shown: Tab = tab ?? (upcoming.length === 0 && past.length > 0 ? 'past' : 'upcoming');
  const list = shown === 'upcoming' ? upcoming : past;
  const total = upcoming.length + past.length + forms.length;

  const renderEntry = (entry: MyEventEntry) => entry.kind === 'event'
    ? <EventTicket key={entry.key} evt={entry.event} onShowQr={() => onShowQr(entry.event)} onRate={() => onRate(entry.event)} onCancel={() => onCancel(entry.event)} cancelling={cancellingId === entry.event.id} />
    : <HackathonTeamCard key={entry.key} team={entry.team} />;

  const tabButton = (value: Tab, label: string, count: number) => (
    <button
      key={value}
      type="button"
      role="tab"
      id={`my-events-tab-${value}`}
      aria-selected={shown === value}
      aria-controls="my-events-panel"
      tabIndex={shown === value ? 0 : -1}
      onClick={() => setTab(value)}
      className={`min-h-11 rounded-full px-4 py-2 text-xs font-bold transition sm:min-h-9 ${focusRing} ${shown === value ? 'bg-journey-accent text-journey-on-accent' : 'text-journey-muted hover:text-journey-text'}`}
    >
      {label} <span className="opacity-80">{count}</span>
    </button>
  );

  const onTabKeys = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setTab(shown === 'upcoming' ? 'past' : 'upcoming');
  };

  return (
    <section aria-labelledby="events-title" className="space-y-6 sm:space-y-7">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="events-title"
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 font-display text-[clamp(1.2rem,5vw,1.5rem)] font-semibold tracking-tight text-journey-text sm:text-2xl"
        >
          <span className="min-w-0 [font-family:var(--font-display)]">My Events</span>
          <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-journey-accent/10 px-1.5 text-[11px] font-bold text-journey-accent">{total}</span>
        </h2>
        <Link href="/forms" className="inline-flex flex-shrink-0 items-center gap-1 self-end text-xs font-bold text-journey-accent transition hover:gap-2 sm:self-auto">
          Forms Center <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {invites.length > 0 && (
        <div className="space-y-3" aria-label="Team invitations">
          {invites.map((invite) => <HackathonInviteRow key={invite.id} invite={invite} />)}
        </div>
      )}

      {total === 0 && teamsLoaded ? emptyState : (
        <>
          {upcoming.length + past.length > 0 && (
            <div role="tablist" aria-label="Upcoming or past" onKeyDown={onTabKeys} className="flex w-fit gap-1 rounded-full bg-journey-text/[0.06] p-1">
              {tabButton('upcoming', 'Upcoming', upcoming.length)}
              {tabButton('past', 'Past', past.length)}
            </div>
          )}

          {upcoming.length + past.length > 0 && (
            <div id="my-events-panel" role="tabpanel" aria-labelledby={`my-events-tab-${shown}`} className="space-y-3 sm:space-y-4">
              {list.length > 0
                ? list.map(renderEntry)
                : <p className="py-4 text-sm text-journey-muted">{shown === 'upcoming' ? 'Nothing coming up. Browse events to find your next one.' : 'Nothing here yet. Events you attended will collect here.'}</p>}
            </div>
          )}

          {forms.length > 0 && (
            <div className="space-y-3 sm:space-y-4" aria-label="Form registrations">
              <h3 className="text-sm font-bold text-journey-text">Forms <span className="font-normal text-journey-muted">· {forms.length}</span></h3>
              {forms.map((form) => (
                <EventTicket key={`form-${form.id}`} evt={form} onShowQr={() => onShowQr(form)} onRate={() => onRate(form)} onCancel={() => onCancel(form)} cancelling={cancellingId === form.id} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
