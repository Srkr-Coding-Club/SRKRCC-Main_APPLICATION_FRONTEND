import type { Event, Hackathon, ParticipantRound } from '@/lib/types';
import { saveBlob } from '@/lib/dataManagement';

interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

const POINT_IN_TIME_MS = 30 * 60 * 1000;
const UNTIMED_EVENT_MS = 60 * 60 * 1000;

/** The part of a round a calendar entry needs. */
export type RoundSchedule = Pick<ParticipantRound, 'id' | 'order' | 'name' | 'starts_at' | 'ends_at'>;

const pad = (value: number) => String(value).padStart(2, '0');

const toIcsDate = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** RFC 5545 text escaping. */
const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function parse(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The dates a participant needs in their calendar: the event itself, each deadline the organizers set and each dated round. */
export function hackathonCalendarEvents(hackathon: Hackathon, pageUrl: string, rounds: RoundSchedule[] = []): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const location = [hackathon.venue, hackathon.mode === 'ONLINE' ? 'Online' : ''].filter(Boolean).join(', ') || undefined;
  const start = parse(hackathon.start_date);
  const end = parse(hackathon.end_date);
  if (start && end) {
    events.push({ uid: `${hackathon.slug}-event`, title: hackathon.title, start, end, location, description: `${hackathon.theme}\n${pageUrl}` });
  }
  const deadlines: [string, string, string | null | undefined][] = [
    ['reg-opens', 'Registration opens', hackathon.registration_opens_at],
    ['reg-closes', 'Team registration closes', hackathon.registration_closes_at],
    ['submission-opens', 'Submissions open', hackathon.submission_opens_at],
    ['submission-deadline', 'Submission deadline', hackathon.submission_deadline],
  ];
  for (const [key, label, iso] of deadlines) {
    const moment = parse(iso);
    if (moment) events.push({ uid: `${hackathon.slug}-${key}`, title: `${hackathon.title}: ${label}`, start: moment, end: new Date(moment.getTime() + POINT_IN_TIME_MS), description: pageUrl });
  }
  for (const round of rounds) {
    const start = parse(round.starts_at) ?? parse(round.ends_at);
    if (!start) continue;
    const end = parse(round.ends_at) ?? new Date(start.getTime() + POINT_IN_TIME_MS);
    events.push({ uid: `${hackathon.slug}-round-${round.id}`, title: `${hackathon.title}: Round ${round.order}, ${round.name}`, start, end: end > start ? end : new Date(start.getTime() + POINT_IN_TIME_MS), location, description: pageUrl });
  }
  return events;
}

/** A regular event as one calendar entry; empty until the organizers set its date. */
export function eventCalendarEvents(event: Pick<Event, 'id' | 'slug' | 'title' | 'venue' | 'category' | 'start_time' | 'end_time'>, pageUrl: string): CalendarEvent[] {
  const start = parse(event.start_time);
  if (!start) return [];
  const end = parse(event.end_time);
  return [{
    uid: `event-${event.slug || event.id}`,
    title: event.title,
    start,
    end: end && end > start ? end : new Date(start.getTime() + UNTIMED_EVENT_MS),
    location: event.venue || undefined,
    description: `${event.category}
${pageUrl}`,
  }];
}

export function buildIcs(events: CalendarEvent[]): string {
  const stamp = toIcsDate(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SRKR Coding Club//Events//EN', 'CALSCALE:GREGORIAN'];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@srkrcc`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(event.start)}`,
      `DTEND:${toIcsDate(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function saveIcs(events: CalendarEvent[], name: string): void {
  saveBlob(new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' }), `${name}.ics`);
}

export function downloadHackathonCalendar(hackathon: Hackathon, rounds: RoundSchedule[] = []): void {
  const pageUrl = `${window.location.origin}/hackathons/${hackathon.slug}`;
  saveIcs(hackathonCalendarEvents(hackathon, pageUrl, rounds), hackathon.slug);
}

export function downloadEventCalendar(event: Parameters<typeof eventCalendarEvents>[0]): void {
  const pageUrl = `${window.location.origin}/events/${event.slug}`;
  saveIcs(eventCalendarEvents(event, pageUrl), event.slug);
}
