import type { Hackathon } from '@/lib/types';
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

/** The dates a participant needs in their calendar: the event itself and each deadline the organizers set. */
export function hackathonCalendarEvents(hackathon: Hackathon, pageUrl: string): CalendarEvent[] {
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
  return events;
}

export function buildIcs(events: CalendarEvent[]): string {
  const stamp = toIcsDate(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SRKR Coding Club//Hackathons//EN', 'CALSCALE:GREGORIAN'];
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

export function downloadHackathonCalendar(hackathon: Hackathon): void {
  const pageUrl = `${window.location.origin}/hackathons/${hackathon.slug}`;
  const ics = buildIcs(hackathonCalendarEvents(hackathon, pageUrl));
  saveBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), `${hackathon.slug}.ics`);
}
