import type { Layout } from './formConditional';

/**
 * Page navigation over a computed layout. Pages are numbered from 0; a page that routing skips is
 * never shown, so "next" and "back" step over it and the progress count leaves it out.
 */

export function reachablePages(layout: Layout): number[] {
  return layout.pages.map((_, index) => index).filter((index) => !layout.skippedPages.has(index));
}

export function nextReachable(layout: Layout, current: number): number | null {
  return reachablePages(layout).find((index) => index > current) ?? null;
}

export function previousReachable(layout: Layout, current: number): number | null {
  const earlier = reachablePages(layout).filter((index) => index < current);
  return earlier.length ? earlier[earlier.length - 1] : null;
}

/** The page to actually show for a wanted one: itself when reachable, else the next one that is, else the last. */
export function settlePage(layout: Layout, wanted: number): number {
  const reachable = reachablePages(layout);
  if (!reachable.length) return 0;
  return reachable.find((index) => index >= wanted) ?? reachable[reachable.length - 1];
}

/** question id -> index of the page it sits on */
export function pageIndexByField(layout: Layout): Map<string, number> {
  const map = new Map<string, number>();
  layout.pages.forEach((page, index) => page.forEach((id) => map.set(id, index)));
  return map;
}

export function pageProgress(layout: Layout, current: number): { number: number; total: number } {
  const reachable = reachablePages(layout);
  return { number: Math.max(reachable.indexOf(current), 0) + 1, total: Math.max(reachable.length, 1) };
}
