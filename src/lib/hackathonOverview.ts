import type { Hackathon, PaymentRow } from '@/lib/types';

/** The page speaks Indian Standard Time, like every other hackathon page. */
export const TIME_ZONE = 'Asia/Kolkata';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Closer than this is "soon" (amber); closer than URGENT is red. */
const SOON_MS = 2 * DAY;
const URGENT_MS = 6 * HOUR;
/** A payment waiting longer than this is flagged to the organizers. */
export const PAYMENT_WAIT_MS = DAY;
const PACE_DAYS = 7;
const MIN_DAYS_OF_DATA = 3;

export interface Milestone { key: string; label: string; at: Date }

type Dates = Pick<Hackathon, 'registration_opens_at' | 'registration_closes_at' | 'idea_opens_at' | 'idea_deadline' | 'submission_opens_at' | 'submission_deadline' | 'check_in_opens_at' | 'check_in_closes_at' | 'start_date' | 'end_date'>;

/** Every dated moment the organizers care about, earliest first. Missing dates are simply absent. */
export function milestones(hackathon: Partial<Dates>): Milestone[] {
  const list: [string, string, string | null | undefined][] = [
    ['registration_opens', 'Registration opens', hackathon.registration_opens_at], ['registration_closes', 'Registration closes', hackathon.registration_closes_at],
    ['idea_opens', 'Ideas open', hackathon.idea_opens_at], ['idea_deadline', 'Ideas are due', hackathon.idea_deadline],
    ['submission_opens', 'Projects open', hackathon.submission_opens_at], ['submission_deadline', 'Projects are due', hackathon.submission_deadline],
    ['check_in_opens', 'Check-in opens', hackathon.check_in_opens_at], ['check_in_closes', 'Check-in closes', hackathon.check_in_closes_at],
    ['start', 'The event starts', hackathon.start_date], ['end', 'The event ends', hackathon.end_date],
  ];
  return list
    .filter((entry): entry is [string, string, string] => Boolean(entry[2]) && !Number.isNaN(new Date(entry[2] as string).getTime()))
    .map(([key, label, at]) => ({ key, label, at: new Date(at) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export const upcoming = (list: Milestone[], now: Date, limit = 3) => list.filter((item) => item.at.getTime() > now.getTime()).slice(0, limit);
export const lastPassed = (list: Milestone[], now: Date) => [...list].reverse().find((item) => item.at.getTime() <= now.getTime()) ?? null;

export type Urgency = 'calm' | 'soon' | 'urgent';

/** "in 2 days", "in 5 hours", "in 12 minutes" (or "2 days ago" once it has passed), and how urgent it is. */
export function countdown(at: Date, now: Date): { text: string; urgency: Urgency; past: boolean } {
  const diff = at.getTime() - now.getTime();
  const past = diff <= 0;
  const span = Math.abs(diff);
  const unit = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;
  let text: string;
  if (span >= DAY) text = unit(Math.floor(span / DAY), 'day');
  else if (span >= HOUR) text = unit(Math.floor(span / HOUR), 'hour');
  else text = span < MINUTE ? 'less than a minute' : unit(Math.floor(span / MINUTE), 'minute');
  return { text: past ? `${text} ago` : `in ${text}`, urgency: past ? 'calm' : diff <= URGENT_MS ? 'urgent' : diff <= SOON_MS ? 'soon' : 'calm', past };
}

/** "6 Nov, 2:03 pm IST". */
export function istText(date: Date): string {
  const text = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${text} IST`;
}

/** "Just now", "2 minutes ago". */
export function agoText(then: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
}

/** Event day, for the dashboard: from half a day before the event (or check-in) opens until half a day after it ends. */
export function isEventDay(hackathon: Partial<Dates>, now: Date): boolean {
  const times = [hackathon.start_date, hackathon.check_in_opens_at].filter(Boolean).map((value) => new Date(value as string).getTime());
  const ends = [hackathon.end_date, hackathon.check_in_closes_at].filter(Boolean).map((value) => new Date(value as string).getTime());
  if (times.length === 0 || ends.length === 0) return false;
  return now.getTime() >= Math.min(...times) - 12 * HOUR && now.getTime() <= Math.max(...ends) + 12 * HOUR;
}

// ---- Registration trend ---------------------------------------------------------------------------------------------

export interface DayCount { date: string; count: number }
export interface TrendPoint { date: string; count: number; total: number }

/** Running total per day, in date order (days with no joins are not in the data, so the line steps on the days that had some). */
export function cumulative(days: DayCount[]): TrendPoint[] {
  let total = 0;
  return [...days].sort((a, b) => a.date.localeCompare(b.date)).map((day) => { total += day.count; return { date: day.date, count: day.count, total }; });
}

export interface Projection {
  /** People joining a team per day over the last week. */
  perDay: number;
  /** Where the count will be at the close (or at the end of the event when nothing closes). */
  projected: number;
  /** When the limit is reached at this pace; null when it is not reached before the close, or there is no limit. */
  fullOn: Date | null;
  state: 'full' | 'fills' | 'short' | 'open';
}

/**
 * Where registration is heading at the last week's pace. Null when there is too little to go on (under three days of
 * activity), nothing is happening, or there is nothing left to project to.
 */
export function projection({ days, total, limit, endsAt, now }: { days: DayCount[]; total: number; limit: number | null; endsAt: Date | null; now: Date }): Projection | null {
  if (limit && total >= limit) return { perDay: 0, projected: total, fullOn: null, state: 'full' };
  const dated = days.filter((day) => day.count > 0).map((day) => new Date(`${day.date}T00:00:00Z`).getTime());
  if (dated.length === 0 || (now.getTime() - Math.min(...dated)) / DAY < MIN_DAYS_OF_DATA) return null;
  const since = now.getTime() - PACE_DAYS * DAY;
  const recent = days.filter((day) => new Date(`${day.date}T00:00:00Z`).getTime() >= since - DAY).reduce((sum, day) => sum + day.count, 0);
  const perDay = recent / PACE_DAYS;
  if (perDay <= 0 || !endsAt || endsAt.getTime() <= now.getTime()) return null;
  const daysLeft = (endsAt.getTime() - now.getTime()) / DAY;
  const projected = Math.round(total + perDay * daysLeft);
  if (!limit) return { perDay, projected, fullOn: null, state: 'open' };
  const fullOn = new Date(now.getTime() + ((limit - total) / perDay) * DAY);
  return fullOn.getTime() <= endsAt.getTime() ? { perDay, projected: limit, fullOn, state: 'fills' } : { perDay, projected, fullOn: null, state: 'short' };
}

// ---- Money ----------------------------------------------------------------------------------------------------------

export interface MoneyLine { count: number; amount: number }
export interface MoneySummary { verified: MoneyLine; waiting: MoneyLine; rejected: MoneyLine; toSettle: MoneyLine; longWaiting: number }

const DROPPED = new Set(['WITHDRAWN', 'DISQUALIFIED', 'DELETED']);

/** Fees at a glance. "To settle" is money that still has to go back: rejected payments and verified ones of teams that dropped out. */
export function moneySummary(rows: Pick<PaymentRow, 'status' | 'amount' | 'team_status' | 'submitted_at'>[], now: Date): MoneySummary {
  const empty = (): MoneyLine => ({ count: 0, amount: 0 });
  const sum = { verified: empty(), waiting: empty(), rejected: empty(), toSettle: empty(), longWaiting: 0 };
  const add = (line: MoneyLine, amount: number) => { line.count += 1; line.amount += Number(amount) || 0; };
  for (const row of rows) {
    const dropped = DROPPED.has(row.team_status as string);
    if (row.status === 'VERIFIED') add(sum.verified, row.amount);
    else if (row.status === 'PENDING') {
      add(sum.waiting, row.amount);
      if (now.getTime() - new Date(row.submitted_at).getTime() > PAYMENT_WAIT_MS) sum.longWaiting += 1;
    } else add(sum.rejected, row.amount);
    if (row.status === 'REJECTED' || (dropped && row.status !== 'PENDING')) add(sum.toSettle, row.amount);
  }
  return sum;
}

export const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

// ---- Problem statement balance ---------------------------------------------------------------------------------------

export interface StatementLike { id: number; domain?: string; teams: number; max_teams: number | null }
export interface DomainBalance { domain: string; total: number; picked: number; untouched: number; full: number; teams: number }

export const NO_DOMAIN = 'No domain';

/** Statements grouped by domain: where teams crowd, and where nobody has looked. Domains with the most untouched statements come first. */
export function problemBalance(statements: StatementLike[]): DomainBalance[] {
  const groups = new Map<string, DomainBalance>();
  for (const statement of statements) {
    const domain = statement.domain?.trim() || NO_DOMAIN;
    const group = groups.get(domain) ?? { domain, total: 0, picked: 0, untouched: 0, full: 0, teams: 0 };
    group.total += 1;
    group.teams += statement.teams;
    if (statement.teams > 0) group.picked += 1; else group.untouched += 1;
    if (statement.max_teams !== null && statement.teams >= statement.max_teams) group.full += 1;
    groups.set(domain, group);
  }
  return [...groups.values()].sort((a, b) => b.untouched - a.untouched || b.total - a.total || a.domain.localeCompare(b.domain));
}

// ---- Shareable status message ---------------------------------------------------------------------------------------

export interface StatusInput {
  title: string;
  now: Date;
  registeredTeams: number;
  formingTeams: number;
  participants: number;
  maxParticipants: number | null;
  placedTeams: number | null;
  maxTeams: number | null;
  checkedIn: number | null;
  next: { label: string; at: Date } | null;
  money: MoneySummary | null;
  ideasToReview: number | null;
  attention: string[];
}

/** A short plain-text status for the club's chat. WhatsApp-style *bold*; every line is a fact the page already shows. */
export function statusMessage(input: StatusInput): string {
  const stamp = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(input.now);
  const lines = [`*${input.title}: status on ${stamp} IST*`];
  const places = input.maxTeams != null && input.placedTeams != null ? ` (${input.placedTeams} of ${input.maxTeams} team places taken)` : '';
  lines.push(`Teams: ${input.registeredTeams} registered, ${input.formingTeams} still forming${places}`);
  lines.push(`People: ${input.participants} in teams${input.maxParticipants ? ` (limit ${input.maxParticipants})` : ''}`);
  if (input.next) lines.push(`Next: ${input.next.label} ${countdown(input.next.at, input.now).text} (${istText(input.next.at)})`);
  if (input.money && input.money.verified.count + input.money.waiting.count + input.money.rejected.count > 0) {
    const { verified, waiting, rejected } = input.money;
    lines.push(`Fees: ${rupees(verified.amount)} verified from ${verified.count} ${verified.count === 1 ? 'team' : 'teams'}, ${waiting.count} waiting for a check${rejected.count ? `, ${rejected.count} rejected` : ''}`);
  }
  if (input.ideasToReview) lines.push(`Ideas: ${input.ideasToReview} waiting for a review`);
  if (input.checkedIn != null) lines.push(`Checked in: ${input.checkedIn} of ${input.participants}`);
  if (input.attention.length > 0) lines.push('', '*Needs attention*', ...input.attention.map((item) => `- ${item}`));
  return lines.join('\n');
}

// ---- Pipeline -------------------------------------------------------------------------------------------------------

export interface FunnelStep { key: string; label: string; count: number }
export interface PipelineStep extends FunnelStep {
  /** Share of the registered teams still in at this step (0 to 100). */
  share: number;
  /** Teams lost since the step before, and what share of that step that is. Null for the first step. */
  lost: { count: number; percent: number } | null;
}

/** Steps that only mean something when their module is on. */
const NEEDS_FEATURE: Record<string, string> = { ideas: 'ideas', ideas_approved: 'ideas', submitted: 'submissions', scored: 'judging' };

/**
 * Where teams fall away, from "registered" onwards. People and unregistered teams are left out (a person is not a team), as
 * are the steps of a module that is off. Later steps can be larger than earlier ones (a team shortlisted twice is counted
 * once, an idea can be accepted late): that shows as no loss, never as a negative one.
 */
export function pipeline(funnel: FunnelStep[], features: Partial<Record<string, boolean>>): PipelineStep[] {
  const from = funnel.findIndex((step) => step.key === 'registered');
  if (from < 0) return [];
  const shown = funnel.slice(from).filter((step) => !NEEDS_FEATURE[step.key] || features[NEEDS_FEATURE[step.key]]);
  const start = Math.max(shown[0]?.count ?? 0, 1);
  // Steps after the last one anybody reached are not "lost" yet: that stage simply has not happened.
  const reached = shown.reduce((last, step, index) => (step.count > 0 ? index : last), 0);
  return shown.map((step, index) => {
    const before = index <= reached ? shown[index - 1] : undefined;
    const lostCount = before ? Math.max(before.count - step.count, 0) : 0;
    return {
      ...step,
      share: Math.min(100, Math.round((step.count / start) * 100)),
      lost: before ? { count: lostCount, percent: before.count > 0 ? Math.round((lostCount / before.count) * 100) : 0 } : null,
    };
  });
}

// ---- Stage ----------------------------------------------------------------------------------------------------------

export type StageKey = 'registration' | 'ideas' | 'rounds' | 'event' | 'results';
export const STAGES: { key: StageKey; label: string }[] = [
  { key: 'registration', label: 'Registration' }, { key: 'ideas', label: 'Ideas' }, { key: 'rounds', label: 'Selection' },
  { key: 'event', label: 'Event day' }, { key: 'results', label: 'Results' },
];

type StageDates = Partial<Dates>;

/** Which stage the hackathon is in right now, from its dates. The first one that applies wins: results, event day, registration, ideas, selection. */
export function currentStage(hackathon: StageDates & { features?: Partial<Record<string, boolean>> }, now: Date): StageKey {
  const at = (value?: string | null) => (value ? new Date(value).getTime() : null);
  const end = at(hackathon.end_date);
  if (end !== null && now.getTime() > end + 12 * HOUR) return 'results';
  if (isEventDay(hackathon, now)) return 'event';
  const closes = at(hackathon.registration_closes_at);
  if (closes === null || now.getTime() <= closes) return 'registration';
  const ideaDue = at(hackathon.idea_deadline);
  if (hackathon.features?.ideas && ideaDue !== null && now.getTime() <= ideaDue) return 'ideas';
  return 'rounds';
}

/** The stages worth showing: the ideas stage only when ideas are on. */
export const visibleStages = (features: Partial<Record<string, boolean>> | undefined) => STAGES.filter((stage) => stage.key !== 'ideas' || features?.ideas);

export type BlockKey = 'eventday' | 'forming' | 'trend' | 'pipeline' | 'details';

/** What the organizer needs first changes with the stage: sign-ups while registering, the funnel while selecting, arrivals on the day. */
export const BLOCK_ORDER: Record<StageKey, BlockKey[]> = {
  registration: ['forming', 'trend', 'details', 'pipeline', 'eventday'],
  ideas: ['forming', 'pipeline', 'trend', 'details', 'eventday'],
  rounds: ['pipeline', 'details', 'forming', 'trend', 'eventday'],
  event: ['eventday', 'pipeline', 'details', 'forming', 'trend'],
  results: ['pipeline', 'details', 'trend', 'forming', 'eventday'],
};
