/* Who gets the home intro. Reduced-motion, Save-Data, low-power touch */
/* devices and anyone who saw it in the last week get the plain hero.  */

const LOW_POWER_CORE_COUNT = 4;
/* Returning visitors - members checking forms and events - skip the intro for a week after seeing it. */
const SEEN_KEY = 'srkrcc_intro_seen_at';
const SEEN_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export const CINEMA_ATTR = 'data-intro-cinema';
export const CHROME_MANAGED_ATTR = 'data-intro-chrome';

function seenRecently() {
  try {
    const seenAt = Number(window.localStorage.getItem(SEEN_KEY));
    return seenAt > 0 && Date.now() - seenAt < SEEN_FOR_MS;
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // Storage blocked (private mode): the intro simply plays again next time.
  }
}

export function shouldPlayIntro() {
  if (seenRecently()) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  return !(isTouchDevice && (navigator.hardwareConcurrency ?? LOW_POWER_CORE_COUNT) <= LOW_POWER_CORE_COUNT);
}

/* The same rules as `shouldPlayIntro`, inlined into the root layout's   */
/* pre-paint script so the navbar and banner are already hidden on the   */
/* home page's first frame. Keep the two in sync.                        */
export const INTRO_CINEMA_SCRIPT = `try{var m=function(q){return window.matchMedia(q).matches},c=navigator.connection,s=Number(localStorage.getItem('${SEEN_KEY}'));if(location.pathname==='/'&&!(s>0&&Date.now()-s<${SEEN_FOR_MS})&&!m('(prefers-reduced-motion: reduce)')&&!(c&&c.saveData)&&!(m('(pointer: coarse)')&&(navigator.hardwareConcurrency||${LOW_POWER_CORE_COUNT})<=${LOW_POWER_CORE_COUNT})){document.documentElement.setAttribute('${CINEMA_ATTR}','')}}catch(e){}`;
