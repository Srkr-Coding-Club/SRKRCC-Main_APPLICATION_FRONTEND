import type { Hackathon, PublicStage } from '@/lib/types';

const IST = 'Asia/Kolkata';

export const HACKATHON_MODE_LABEL: Record<NonNullable<Hackathon['mode']>, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  HYBRID: 'Hybrid',
};

/** Day number and short month of an instant, in IST (for the timeline date badge). */
export function istDayMonth(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: date.toLocaleString('en-US', { day: 'numeric', timeZone: IST }),
    month: date.toLocaleString('en-US', { month: 'short', timeZone: IST }),
  };
}

export interface DateRow {
  key: string;
  label: string;
  at: string;
}

/** Every date worth showing in "Dates & Deadlines", oldest first. */
export function buildDateRows(hackathon: Hackathon, stages: PublicStage[]): DateRow[] {
  const rows: DateRow[] = [];
  if (hackathon.registration_opens_at) rows.push({ key: 'reg-open', label: 'Registration opens', at: hackathon.registration_opens_at });
  if (hackathon.registration_closes_at) rows.push({ key: 'reg-close', label: 'Registration closes', at: hackathon.registration_closes_at });
  rows.push({ key: 'start', label: 'Hackathon starts', at: hackathon.start_date });
  stages.forEach((stage) => {
    if (stage.starts_at) rows.push({ key: `stage-${stage.id}`, label: `${stage.title} begins`, at: stage.starts_at });
  });
  rows.push({ key: 'end', label: 'Hackathon ends', at: hackathon.end_date });
  return rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
