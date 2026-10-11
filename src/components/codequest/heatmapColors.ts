/** Shared intensity colour scale for the heatmap and activity calendar.
 * Level 0 is intentionally faint so empty days recede into the panel. */
export const HEATMAP_INTENSITY_CLASSES: string[] = [
  'bg-slate-100 dark:bg-slate-800/60',
  'bg-orange-200 dark:bg-orange-950',
  'bg-orange-300 dark:bg-orange-800',
  'bg-[#FF7A00] dark:bg-[#FF7A00]',
  'bg-[#8B2E3B] dark:bg-[#FFA500]',
];

export function intensityClass(level: number): string {
  return HEATMAP_INTENSITY_CLASSES[level] ?? HEATMAP_INTENSITY_CLASSES[0];
}
