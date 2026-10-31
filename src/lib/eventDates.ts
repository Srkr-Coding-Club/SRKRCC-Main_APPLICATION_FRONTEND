const TIME_ZONE = 'Asia/Kolkata';
const DAY = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const DAY_MONTH = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, month: 'short', year: 'numeric' });
const DAY_ONLY = new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, day: 'numeric' });
const KEY = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "30 Nov 2026", in Indian Standard Time like every other hackathon date (a fixed zone, so server and browser agree). */
export const formatShortDate = (value: string | Date) => DAY.format(new Date(value));

/**
 * "18 Dec 2026" for a one-day event, "18-19 Dec 2026" inside a month, "30 Nov - 2 Dec 2026" across months, and both full
 * dates across years. Missing or broken dates give an empty string, so a caller can leave the line out.
 */
export function formatEventDates(start?: string | null, end?: string | null): string {
  const from = start ? new Date(start) : null;
  const to = end ? new Date(end) : null;
  if (!from || Number.isNaN(from.getTime())) return '';
  if (!to || Number.isNaN(to.getTime()) || KEY.format(from) === KEY.format(to)) return DAY.format(from);
  const [fromYear, fromMonth] = KEY.format(from).split('-');
  const [toYear, toMonth] = KEY.format(to).split('-');
  if (fromYear !== toYear) return `${DAY.format(from)} - ${DAY.format(to)}`;
  if (fromMonth !== toMonth) return `${DAY_MONTH.format(from)} - ${DAY.format(to)}`;
  return `${DAY_ONLY.format(from)}-${DAY_ONLY.format(to)} ${MONTH_YEAR.format(to)}`;
}

/** The registration line on a hackathon card: when it closes, when it opens, or that it is over. Never says how many teams there are. */
export function registrationLine({ closed, open, opensAt, closesAt, now = new Date() }: { closed: boolean; open: boolean; opensAt?: string | null; closesAt?: string | null; now?: Date }): string {
  if (closed) return 'Registration closed';
  if (open) return closesAt ? `Registration closes ${formatShortDate(closesAt)}` : 'Registration is open';
  if (opensAt && new Date(opensAt) > now) return `Registration opens ${formatShortDate(opensAt)}`;
  return 'Registration closed';
}
