/**
 * The theme lives on <html> as the `dark` class and in storage under `theme`. A blocking script in the layout sets it
 * before the first paint; everything that shows or changes it (the round toggle, the Light/Dark buttons, the lamp) reads
 * and writes it through here so they cannot disagree.
 */
export const THEME_KEY = 'theme';

export const isDarkTheme = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/** Where on the screen a change spreads out from (the lamp's bulb). */
export interface ThemeOrigin { x: number; y: number }

type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type WithViewTransition = Document & { startViewTransition?: (update: () => void) => ViewTransition };

let changing = false;
/** True while a change is spreading across the page; a second one waits rather than fighting it. */
export const isThemeChanging = () => changing;

export const REVEAL_MS = 520;

/**
 * Switch the theme. With an `origin`, a browser that supports view transitions shows the new theme spreading out from that
 * point as a circle; every other case (no support, "reduce motion", no origin, one already running) switches at once.
 * The class and the stored choice are written either way, so nothing depends on the animation finishing.
 */
export function setTheme(dark: boolean, origin?: ThemeOrigin) {
  const apply = () => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage blocked (private mode): the choice just will not persist.
    }
  };
  const doc = document as WithViewTransition;
  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!origin || reduced || changing || typeof doc.startViewTransition !== 'function') {
    apply();
    return;
  }
  changing = true;
  const transition = doc.startViewTransition(apply);
  const { x, y } = origin;
  transition.ready
    .then(() => {
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
  transition.finished.catch(() => undefined).finally(() => { changing = false; });
}
