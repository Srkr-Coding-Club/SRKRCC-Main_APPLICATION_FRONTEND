import type { ParticipantRound } from '@/lib/types';

const MINUTE_MS = 60_000;
const MINUTES_PER_DAY = 1440;

/** "2 days 3 hours" / "3 hours 5 min" / "12 minutes". Null once the moment has passed. */
export function timeUntil(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.max(1, Math.floor(ms / MINUTE_MS));
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / 60);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (days > 0) return `${plural(days, 'day')} ${plural(hours, 'hour')}`;
  if (hours > 0) return `${plural(hours, 'hour')} ${minutes % 60} min`;
  return plural(minutes, 'minute');
}

/** What to tell a participant about a round that has not finished: when it starts or when it ends. */
export function roundCountdown(round: Pick<ParticipantRound, 'effective_status' | 'starts_at' | 'ends_at'>, now: number): string | null {
  if (round.effective_status === 'UPCOMING') {
    const left = timeUntil(round.starts_at, now);
    return left ? `Starts in ${left}` : null;
  }
  if (round.effective_status === 'ACTIVE') {
    const left = timeUntil(round.ends_at, now);
    return left ? `Ends in ${left}` : null;
  }
  return null;
}
