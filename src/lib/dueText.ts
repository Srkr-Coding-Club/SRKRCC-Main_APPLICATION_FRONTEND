export type DueTone = 'calm' | 'soon' | 'late';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Closer than this and the deadline is worth a warning colour. */
const SOON = 6 * HOUR;

/** "Due in 3 h 20 min", "Due in 2 days", "Overdue": how far a deadline is, and how urgent it is. */
export function describeDue(iso: string | null | undefined, now: number = Date.now()): { text: string; tone: DueTone } | null {
  if (!iso) return null;
  const left = new Date(iso).getTime() - now;
  if (Number.isNaN(left)) return null;
  if (left <= 0) return { text: 'The deadline has passed', tone: 'late' };
  if (left < HOUR) return { text: `Due in ${Math.max(1, Math.round(left / MINUTE))} min`, tone: 'soon' };
  if (left < DAY) {
    const hours = Math.floor(left / HOUR);
    const minutes = Math.round((left - hours * HOUR) / MINUTE);
    return { text: minutes ? `Due in ${hours} h ${minutes} min` : `Due in ${hours} h`, tone: left < SOON ? 'soon' : 'calm' };
  }
  const days = Math.floor(left / DAY);
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'calm' };
}
