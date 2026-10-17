import {
  Award,
  CalendarDays,
  ClipboardList,
  Code2,
  Flag,
  Lightbulb,
  Mic,
  Rocket,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type StageTone = 'ORANGE' | 'BLUE' | 'GREEN' | 'PURPLE' | 'RED' | 'SLATE';
export type StageIconKey = 'FLAG' | 'CODE' | 'MIC' | 'TROPHY' | 'CALENDAR' | 'USERS' | 'LIGHTBULB' | 'ROCKET' | 'CLIPBOARD' | 'AWARD';

/** Full class strings (Tailwind only keeps classes it can see written out). */
export const TONE_STYLES: Record<StageTone, { label: string; solid: string; soft: string; border: string; line: string; swatch: string }> = {
  ORANGE: { label: 'Orange', solid: 'bg-[#FF7A00] text-white', soft: 'bg-[#FF7A00]/10 text-[#C25A00] dark:text-[#FFB066]', border: 'border-[#FF7A00]/40', line: 'border-[#FF7A00]/50', swatch: 'bg-[#FF7A00]' },
  BLUE: { label: 'Blue', solid: 'bg-sky-600 text-white', soft: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', border: 'border-sky-500/40', line: 'border-sky-500/50', swatch: 'bg-sky-600' },
  GREEN: { label: 'Green', solid: 'bg-emerald-600 text-white', soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/40', line: 'border-emerald-500/50', swatch: 'bg-emerald-600' },
  PURPLE: { label: 'Purple', solid: 'bg-violet-600 text-white', soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', border: 'border-violet-500/40', line: 'border-violet-500/50', swatch: 'bg-violet-600' },
  RED: { label: 'Red', solid: 'bg-rose-600 text-white', soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', border: 'border-rose-500/40', line: 'border-rose-500/50', swatch: 'bg-rose-600' },
  SLATE: { label: 'Grey', solid: 'bg-slate-600 text-white', soft: 'bg-slate-500/10 text-slate-700 dark:text-slate-300', border: 'border-slate-500/40', line: 'border-slate-400/50', swatch: 'bg-slate-600' },
};

export const STAGE_ICONS: Record<StageIconKey, { label: string; icon: LucideIcon }> = {
  FLAG: { label: 'Flag', icon: Flag },
  CODE: { label: 'Code', icon: Code2 },
  MIC: { label: 'Presentation', icon: Mic },
  TROPHY: { label: 'Trophy', icon: Trophy },
  CALENDAR: { label: 'Calendar', icon: CalendarDays },
  USERS: { label: 'Team', icon: Users },
  LIGHTBULB: { label: 'Idea', icon: Lightbulb },
  ROCKET: { label: 'Launch', icon: Rocket },
  CLIPBOARD: { label: 'Submission', icon: ClipboardList },
  AWARD: { label: 'Award', icon: Award },
};

export const STAGE_TONE_KEYS = Object.keys(TONE_STYLES) as StageTone[];
export const STAGE_ICON_KEYS = Object.keys(STAGE_ICONS) as StageIconKey[];

export type StageStatus = 'unknown' | 'done' | 'live' | 'next' | 'upcoming' | 'unscheduled';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Where a stage is relative to `now` (null = not mounted yet, so server and client markup agree). */
export function stageStatus(stage: { starts_at: string | null; ends_at: string | null }, now: number | null): StageStatus {
  if (now === null) return 'unknown';
  const start = stage.starts_at ? new Date(stage.starts_at).getTime() : null;
  const end = stage.ends_at ? new Date(stage.ends_at).getTime() : null;
  if (start === null && end === null) return 'unscheduled';
  if (end !== null && now > end) return 'done';
  if (start !== null && now < start) return 'upcoming';
  if (start !== null && end === null) return now - start < DAY_MS ? 'live' : 'done';
  return 'live';
}

/** "in 3 days", "2 hours ago": a rough, friendly distance to an instant. */
export function relativeTo(target: number, now: number): string {
  const diffMs = target - now;
  const abs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60 * 60 * 1000) return formatter.format(Math.round(diffMs / 60000), 'minute');
  if (abs < DAY_MS) return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), 'hour');
  return formatter.format(Math.round(diffMs / DAY_MS), 'day');
}
