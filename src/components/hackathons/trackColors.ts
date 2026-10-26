/**
 * One accent colour per track, so a card's track can be read from its stripe before its text.
 * Classes are written out in full (never built from a hue name) so Tailwind keeps them.
 * Every text pair is at least 4.5:1 on its tint in both themes; orange is left out because it already means "act".
 */
export interface TrackColor {
  /** The solid stripe on a card's edge and the dot in chips. */
  solid: string;
  /** Text and tinted background for the code badge and chips. */
  badge: string;
  /** Border and glow when a card of this track is hovered or focused. */
  hover: string;
  /** Selected state of the track filter chip. */
  active: string;
}

export const TRACK_COLORS: TrackColor[] = [
  {
    solid: 'bg-sky-500',
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
    hover: 'hover:border-sky-500/60 focus-within:border-sky-500/60 dark:hover:shadow-sky-500/10',
    active: 'border-sky-500 bg-sky-500/15 text-sky-900 dark:text-sky-200',
  },
  {
    solid: 'bg-emerald-500',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
    hover: 'hover:border-emerald-500/60 focus-within:border-emerald-500/60 dark:hover:shadow-emerald-500/10',
    active: 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200',
  },
  {
    solid: 'bg-violet-500',
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300',
    hover: 'hover:border-violet-500/60 focus-within:border-violet-500/60 dark:hover:shadow-violet-500/10',
    active: 'border-violet-500 bg-violet-500/15 text-violet-900 dark:text-violet-200',
  },
  {
    solid: 'bg-rose-500',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300',
    hover: 'hover:border-rose-500/60 focus-within:border-rose-500/60 dark:hover:shadow-rose-500/10',
    active: 'border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200',
  },
  {
    solid: 'bg-amber-500',
    badge: 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300',
    hover: 'hover:border-amber-500/60 focus-within:border-amber-500/60 dark:hover:shadow-amber-500/10',
    active: 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-200',
  },
  {
    solid: 'bg-teal-500',
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300',
    hover: 'hover:border-teal-500/60 focus-within:border-teal-500/60 dark:hover:shadow-teal-500/10',
    active: 'border-teal-500 bg-teal-500/15 text-teal-900 dark:text-teal-200',
  },
  {
    solid: 'bg-fuchsia-500',
    badge: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300',
    hover: 'hover:border-fuchsia-500/60 focus-within:border-fuchsia-500/60 dark:hover:shadow-fuchsia-500/10',
    active: 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-200',
  },
  {
    solid: 'bg-indigo-500',
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300',
    hover: 'hover:border-indigo-500/60 focus-within:border-indigo-500/60 dark:hover:shadow-indigo-500/10',
    active: 'border-indigo-500 bg-indigo-500/15 text-indigo-900 dark:text-indigo-200',
  },
];

/** The colour of the track at `index` in the hackathon's ordered track list; stable while filtering. */
export const trackColorAt = (index: number): TrackColor => TRACK_COLORS[Math.max(index, 0) % TRACK_COLORS.length];
