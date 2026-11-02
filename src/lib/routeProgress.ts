import type { useRouter } from 'next/navigation';

type Router = ReturnType<typeof useRouter>;

/** The event the top progress line (RouteProgress) listens for. */
export const ROUTE_PROGRESS_START = 'srkrcc:route-progress-start';

export function startRouteProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ROUTE_PROGRESS_START));
}

/** router.push that also starts the progress line, for navigations a component starts itself (a link click already does). */
export function pushWithProgress(router: Router, href: string, options?: Parameters<Router['push']>[1]) {
  startRouteProgress();
  if (options) router.push(href, options);
  else router.push(href);
}

export function replaceWithProgress(router: Router, href: string, options?: Parameters<Router['replace']>[1]) {
  startRouteProgress();
  if (options) router.replace(href, options);
  else router.replace(href);
}
