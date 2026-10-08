import { fetchApi } from '@/lib/api-client';
import type { Event, Hackathon, Problem } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Live data for the home page journey. Everything shown about a      */
/* program comes from the API; when a request fails or nothing        */
/* matches, the field is null and the page falls back to neutral      */
/* copy. Dates are formatted here, on the server, in the club's time  */
/* zone, so server and client render identical strings.               */
/* ------------------------------------------------------------------ */

const CLUB_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const AGENDA_LIMIT = 6;

export type RegistrationState = 'open' | 'upcoming' | 'closed' | 'none';

export interface AgendaItem {
  key: string;
  title: string;
  kind: string;
  dateLabel: string | null;
  dayLabel: string | null;
  monthLabel: string | null;
  timeLabel: string | null;
  venue: string | null;
  registration: RegistrationState;
  href: string;
  actionLabel: string;
}

export interface HackathonSummary {
  title: string;
  theme: string | null;
  description: string | null;
  dateLabel: string | null;
  teamSizeLabel: string | null;
  prizePool: string | null;
  registration: RegistrationState;
  href: string;
}

export interface LandingData {
  nextUp: AgendaItem | null;
  awareness: AgendaItem | null;
  cWorkshop: AgendaItem | null;
  dsa: AgendaItem | null;
  edgeCase: (AgendaItem & { daysAway: number | null }) | null;
  codeQuest: { title: string; difficulty: string; href: string } | null;
  hackOverflow: HackathonSummary | null;
  iconCoders: HackathonSummary | null;
  agenda: AgendaItem[];
}

const PROGRAM_PATTERNS = {
  awareness: /awareness|orientation/i,
  cWorkshop: /\bc\b.*workshop|workshop.*\bc\b|\bc programming\b/i,
  dsa: /\bdsa\b|data structures|algorithms/i,
  edgeCase: /edge\s?case/i,
  hackOverflow: /hack\s?overflow/i,
  iconCoders: /icon\s?coders/i,
};

async function settle<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

function formatParts(iso: string | null) {
  if (!iso) return { dateLabel: null, dayLabel: null, monthLabel: null, timeLabel: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { dateLabel: null, dayLabel: null, monthLabel: null, timeLabel: null };
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: CLUB_TIME_ZONE, ...options }).format(date);
  return {
    dateLabel: format({ weekday: 'short', day: 'numeric', month: 'short' }),
    dayLabel: format({ day: '2-digit' }),
    monthLabel: format({ month: 'short' }),
    timeLabel: format({ hour: 'numeric', minute: '2-digit' }),
  };
}

function registrationState(
  status: string | undefined,
  hasForm: boolean,
  opensAt: string | null | undefined,
  closesAt: string | null | undefined,
  now: number,
): RegistrationState {
  if (status === 'CLOSED') return 'closed';
  if (!hasForm) return 'none';
  if (opensAt && new Date(opensAt).getTime() > now) return 'upcoming';
  if (closesAt && new Date(closesAt).getTime() < now) return 'closed';
  return 'open';
}

/* Still relevant: hasn't ended (or has no date yet), and isn't hidden. */
function isCurrent(start: string | null, end: string | null, hidden: boolean | undefined, now: number) {
  if (hidden) return false;
  const finish = end ?? start;
  return !finish || new Date(finish).getTime() >= now;
}

/* Soonest first; events without a date yet go last. */
function byStart<T>(startOf: (item: T) => string | null) {
  return (a: T, b: T) => {
    const sa = startOf(a);
    const sb = startOf(b);
    if (!sa) return sb ? 1 : 0;
    if (!sb) return -1;
    return new Date(sa).getTime() - new Date(sb).getTime();
  };
}

function toAgendaItem(event: Event, now: number): AgendaItem {
  const registration = registrationState(event.status, Boolean(event.form_slug), event.registration_opens_at, event.registration_closes_at, now);
  return {
    key: `event-${event.id}`,
    title: event.title,
    kind: event.category || 'Event',
    ...formatParts(event.start_time),
    venue: event.venue || null,
    registration,
    href: registration === 'open' && event.form_slug ? `/forms/${event.form_slug}` : '/events',
    actionLabel: registration === 'open' ? 'Register' : 'Details',
  };
}

function toHackathonSummary(hackathon: Hackathon, now: number): HackathonSummary {
  const { dateLabel } = formatParts(hackathon.start_date);
  const { min_team_size: min, max_team_size: max } = hackathon;
  return {
    title: hackathon.title,
    theme: hackathon.theme || null,
    description: hackathon.description || null,
    dateLabel,
    teamSizeLabel: min && max ? (min === max ? `Teams of ${min}` : `Teams of ${min}–${max}`) : null,
    prizePool: hackathon.prize_pool || null,
    registration: registrationState(hackathon.status, Boolean(hackathon.form_slug), hackathon.registration_opens_at, hackathon.registration_closes_at, now),
    href: `/hackathons/${hackathon.slug}`,
  };
}

function hackathonAgendaItem(hackathon: Hackathon, now: number): AgendaItem {
  const summary = toHackathonSummary(hackathon, now);
  return {
    key: `hackathon-${hackathon.id}`,
    title: hackathon.title,
    kind: 'Hackathon',
    ...formatParts(hackathon.start_date),
    venue: null,
    registration: summary.registration,
    href: summary.href,
    actionLabel: 'Explore',
  };
}

export async function getLandingData(): Promise<LandingData> {
  const [events, hackathons, problems] = await Promise.all([
    settle(fetchApi<Event[]>('/events/')),
    settle(fetchApi<Hackathon[]>('/hackathons/')),
    settle(fetchApi<Problem[]>('/codequest/')),
  ]);
  const now = Date.now();

  const currentEvents = (events ?? [])
    .filter((event) => isCurrent(event.start_time, event.end_time, event.is_hidden, now))
    .sort(byStart((event) => event.start_time));
  const currentHackathons = (hackathons ?? [])
    .filter((hackathon) => isCurrent(hackathon.start_date, hackathon.end_date, hackathon.is_hidden, now))
    .sort(byStart((hackathon) => hackathon.start_date));

  const findEvent = (pattern: RegExp) => {
    const match = currentEvents.find((event) => pattern.test(`${event.title} ${event.category}`));
    return match ? toAgendaItem(match, now) : null;
  };
  const findHackathon = (pattern: RegExp) => {
    const match = currentHackathons.find((hackathon) => pattern.test(hackathon.title));
    return match ? toHackathonSummary(match, now) : null;
  };

  const edgeCaseEvent = currentEvents.find((event) => PROGRAM_PATTERNS.edgeCase.test(`${event.title} ${event.category}`));
  const latestProblem = [...(problems ?? [])]
    .filter((problem) => new Date(problem.scheduled_date).getTime() <= now)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))[0];

  const agenda = [
    ...currentEvents.map((event) => ({ start: event.start_time, item: toAgendaItem(event, now) })),
    ...currentHackathons.map((hackathon) => ({ start: hackathon.start_date, item: hackathonAgendaItem(hackathon, now) })),
  ]
    .sort(byStart((entry) => entry.start))
    .slice(0, AGENDA_LIMIT)
    .map((entry) => entry.item);

  return {
    nextUp: currentEvents[0] ? toAgendaItem(currentEvents[0], now) : null,
    awareness: findEvent(PROGRAM_PATTERNS.awareness),
    cWorkshop: findEvent(PROGRAM_PATTERNS.cWorkshop),
    dsa: findEvent(PROGRAM_PATTERNS.dsa),
    edgeCase: edgeCaseEvent
      ? {
          ...toAgendaItem(edgeCaseEvent, now),
          daysAway: edgeCaseEvent.start_time
            ? Math.max(0, Math.ceil((new Date(edgeCaseEvent.start_time).getTime() - now) / DAY_MS))
            : null,
        }
      : null,
    codeQuest: latestProblem
      ? { title: latestProblem.title, difficulty: latestProblem.difficulty.toLowerCase(), href: '/codequest' }
      : null,
    hackOverflow: findHackathon(PROGRAM_PATTERNS.hackOverflow),
    iconCoders: findHackathon(PROGRAM_PATTERNS.iconCoders),
    agenda,
  };
}
