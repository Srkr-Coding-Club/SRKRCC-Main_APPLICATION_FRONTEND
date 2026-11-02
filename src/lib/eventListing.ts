import type { Event } from '@/lib/types';
import { isSafeHref } from '@/lib/urlSafety';

/** Event times are shown in Indian Standard Time, a fixed zone, so the server and the browser print the same thing. */
const TIME_ZONE = 'Asia/Kolkata';
const DAY = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' });
const DAY_WITH_YEAR = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });

/** An event with this share of its seats left or fewer is "filling fast". */
const FILLING_FAST_SHARE = 0.15;

export const TO_BE_ANNOUNCED = 'To be announced';

const valid = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "Mon, Aug 24", or "To be announced" while the event has no date. */
export function formatEventDay(iso?: string | null): string {
  const date = valid(iso);
  return date ? DAY.format(date) : TO_BE_ANNOUNCED;
}

/** "Aug 24, 2026": a date with its year, for lines where the year matters. */
export function formatEventDayWithYear(iso?: string | null): string {
  const date = valid(iso);
  return date ? DAY_WITH_YEAR.format(date) : TO_BE_ANNOUNCED;
}

/** "10:48 AM" in IST; an empty string when there is no time. */
export function formatEventTime(iso?: string | null): string {
  const date = valid(iso);
  return date ? TIME.format(date) : '';
}

/** "10:48 AM - 1:48 PM", just the start when there is no end, or "To be announced". */
export function formatEventTimeRange(start?: string | null, end?: string | null): string {
  const from = formatEventTime(start);
  if (!from) return TO_BE_ANNOUNCED;
  const to = formatEventTime(end);
  return to ? `${from} - ${to}` : from;
}

/** The poster, only if its address is safe to put in the page; otherwise none. */
export function eventPoster(event: Pick<Event, 'poster_image'>): string | null {
  return event.poster_image && isSafeHref(event.poster_image) ? event.poster_image : null;
}

/** "1 seat", "100 seats". */
export const seatsLabel = (count: number): string => `${count} ${count === 1 ? 'seat' : 'seats'}`;

export function seatsLeft(event: Pick<Event, 'capacity' | 'registration_count'>): number {
  return Math.max(0, event.capacity - (event.registration_count ?? 0));
}

export type EventAvailabilityKind = 'PAST' | 'CLOSED' | 'FULL' | 'NOT_YET_OPEN' | 'ENDED' | 'OPEN';

/** An event with a start but no end is taken to last this long. */
const UNTIMED_EVENT_MS = 60 * 60 * 1000;

export type ListingPhase = 'LIVE' | 'UPCOMING' | 'PAST';

/**
 * Where something with a start and an end is on the calendar: under way, still ahead, or over. A thing with no date yet is
 * ahead; one with only a start lasts an hour. One rule for the events and hackathons listings.
 */
export function listingPhase(start: string | null | undefined, end: string | null | undefined, now: Date = new Date()): ListingPhase {
  const from = valid(start);
  if (!from) return 'UPCOMING';
  const to = valid(end) ?? new Date(from.getTime() + UNTIMED_EVENT_MS);
  if (to <= now) return 'PAST';
  return from <= now ? 'LIVE' : 'UPCOMING';
}

export interface PhasedListing<T> { live: T[]; upcoming: T[]; past: T[] }

/** Splits a list into what is on now, what is coming (soonest first, undated last) and what is over (latest first). */
export function splitByPhase<T>(items: T[], range: (item: T) => { start?: string | null; end?: string | null }, now: Date = new Date()): PhasedListing<T> {
  const result: PhasedListing<T> = { live: [], upcoming: [], past: [] };
  const startOf = (item: T) => valid(range(item).start)?.getTime() ?? Infinity;
  const endOf = (item: T) => valid(range(item).end)?.getTime() ?? valid(range(item).start)?.getTime() ?? 0;
  for (const item of items) {
    const { start, end } = range(item);
    const phase = listingPhase(start, end, now);
    result[phase.toLowerCase() as 'live' | 'upcoming' | 'past'].push(item);
  }
  const soonest = (a: T, b: T) => (startOf(a) === startOf(b) ? 0 : startOf(a) < startOf(b) ? -1 : 1);
  result.live.sort(soonest);
  result.upcoming.sort(soonest);
  result.past.sort((a, b) => endOf(b) - endOf(a));
  return result;
}

export interface EventAvailability {
  kind: EventAvailabilityKind;
  /** Short label for a chip over the poster. */
  label: string;
  /** Chip colours and dot, in the same family as the hackathon cards. */
  className: string;
  dot: string;
  /** Whether a person can register right now. */
  canRegister: boolean;
  fillingFast: boolean;
}

/** Whether people can register for an event right now, and how to say so. One answer for the card and the page. */
export function eventAvailability(
  event: Pick<Event, 'status' | 'capacity' | 'registration_count' | 'registration_opens_at' | 'registration_closes_at'> & { start_time?: string | null; end_time?: string | null },
  now: Date = new Date(),
): EventAvailability {
  const left = seatsLeft(event);
  const opensAt = valid(event.registration_opens_at);
  const closesAt = valid(event.registration_closes_at);
  const make = (kind: EventAvailabilityKind, label: string, className: string, dot: string, canRegister = false): EventAvailability => ({
    kind, label, className, dot, canRegister,
    fillingFast: canRegister && event.capacity > 0 && left / event.capacity <= FILLING_FAST_SHARE,
  });

  if (listingPhase(event.start_time, event.end_time, now) === 'PAST') return make('PAST', 'Event ended', 'bg-slate-700 text-white', 'bg-white');
  if (event.status === 'CLOSED') return make('CLOSED', 'Closed', 'bg-slate-700 text-white', 'bg-white');
  if (event.capacity > 0 && left === 0) return make('FULL', 'Event full', 'bg-slate-700 text-white', 'bg-white');
  if (opensAt && opensAt > now) return make('NOT_YET_OPEN', 'Opens soon', 'bg-amber-400 text-slate-900', 'bg-slate-900');
  if (closesAt && closesAt <= now) return make('ENDED', 'Registration closed', 'bg-slate-700 text-white', 'bg-white');
  return make('OPEN', 'Registration open', 'bg-emerald-700 text-white', 'bg-white', true);
}

/** The registration window in a few words: when it opens, when it closes, or nothing when the organizers set no dates. */
export function registrationWindowLine(
  event: Pick<Event, 'registration_opens_at' | 'registration_closes_at'>,
  now: Date = new Date(),
): string | null {
  const opensAt = valid(event.registration_opens_at);
  const closesAt = valid(event.registration_closes_at);
  if (opensAt && opensAt > now) return `Registration opens ${DAY_WITH_YEAR.format(opensAt)}, ${TIME.format(opensAt)}`;
  if (closesAt && closesAt > now) return `Registration closes ${DAY_WITH_YEAR.format(closesAt)}, ${TIME.format(closesAt)}`;
  return null;
}
