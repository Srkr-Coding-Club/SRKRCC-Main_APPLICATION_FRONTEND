import type { HackathonTeam } from '@/lib/types';

/** One registration as the profile payload lists it. Event registrations carry the event's own details. */
export interface RegisteredEventItem {
  id: number;
  form_id?: number;
  form_slug?: string;
  title: string;
  track: string;
  date: string;
  status: string;
  badgeBg: string;
  attendance_enabled?: boolean;
  /** Set when the registration belongs to an event; a plain form has none. */
  event_slug?: string | null;
  event_ended?: boolean;
  event_started?: boolean;
  /** Whether the person can still cancel on their own, why not, and until when. Null for a plain form. */
  cancellation?: { allowed: boolean; reason: 'EVENT_STARTED' | 'CANCELLATION_LOCKED' | 'CANCELLATION_CLOSED' | null; closes_at: string | null } | null;
  certificates_released?: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

export type MyEventEntry =
  | { kind: 'event'; key: string; start: number | null; end: number | null; event: RegisteredEventItem }
  | { kind: 'hackathon'; key: string; start: number | null; end: number | null; team: HackathonTeam };

export interface OrganizedEvents {
  upcoming: MyEventEntry[];
  past: MyEventEntry[];
  /** Registrations for plain forms: they have no date, so they never join the timeline. */
  forms: RegisteredEventItem[];
}

const UNTIMED_EVENT_MS = 60 * 60 * 1000;
const ENDED_TEAM_STATUSES: HackathonTeam['status'][] = ['WITHDRAWN', 'DISQUALIFIED'];

const time = (iso?: string | null): number | null => {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
};

/** When an entry is over: its end, or an hour after its start when only that is known. Null for an undated entry. */
const endOf = (start: number | null, end: number | null, untimed = UNTIMED_EVENT_MS): number | null => end ?? (start === null ? null : start + untimed);

function eventEntry(event: RegisteredEventItem): MyEventEntry {
  const start = time(event.start_time);
  return { kind: 'event', key: `event-${event.id}`, start, end: endOf(start, time(event.end_time)), event };
}

function hackathonEntry(team: HackathonTeam): MyEventEntry {
  const start = time(team.hackathon_start);
  return { kind: 'hackathon', key: `team-${team.id}`, start, end: endOf(start, time(team.hackathon_end)), team };
}

const isPast = (entry: MyEventEntry, now: number): boolean => {
  if (entry.kind === 'hackathon' && ENDED_TEAM_STATUSES.includes(entry.team.status)) return true;
  if (entry.kind === 'event' && entry.event.event_ended) return true;
  return entry.end !== null && entry.end <= now;
};

/** Dated entries soonest first, undated ones after them. */
const byStartAscending = (a: MyEventEntry, b: MyEventEntry) => {
  const first = a.start ?? Infinity;
  const second = b.start ?? Infinity;
  return first === second ? 0 : first < second ? -1 : 1;
};
/** Most recently finished first. */
const byEndDescending = (a: MyEventEntry, b: MyEventEntry) => (b.end ?? b.start ?? 0) - (a.end ?? a.start ?? 0);

/** Splits everything the person signed up for into what is still ahead, what is over, and plain forms. */
export function organizeMyEvents(
  registrations: RegisteredEventItem[],
  teams: HackathonTeam[],
  now: number,
): OrganizedEvents {
  const forms = registrations.filter((item) => !item.event_slug);
  const entries = [
    ...registrations.filter((item) => item.event_slug).map(eventEntry),
    ...teams.map(hackathonEntry),
  ];
  return {
    upcoming: entries.filter((entry) => !isPast(entry, now)).sort(byStartAscending),
    past: entries.filter((entry) => isPast(entry, now)).sort(byEndDescending),
    forms,
  };
}
