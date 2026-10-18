import { clamp, lerp, smoothstep } from './introMath';
import { encounterAt, JOURNEY, PLANETS } from './solarSystem';
import { createJourneyPath } from './webgl/journeyPath';

/* ------------------------------------------------------------------ */
/* Scroll pacing. The journey's progress (p) is what the camera, the  */
/* planets and the story are timed in; this module decides how much   */
/* scroll each stretch of it costs.                                   */
/*                                                                    */
/*  - Dwell: every encounter is a slow zone, so the camera eases to   */
/*    a near-stop beside the planet and the panel can be read.        */
/*  - Even pace: outer orbits are farther apart, so the legs leading  */
/*    to them cost more scroll. Without this the camera crosses the   */
/*    outer system ~10x faster than the inner one.                    */
/*                                                                    */
/* Scroll cost per unit of progress is a density; its running total   */
/* is tabulated once, giving `toJourney` (scroll -> p) and `toScroll` */
/* (p -> scroll) as monotonic inverses of each other.                 */
/* ------------------------------------------------------------------ */

const DWELL_BOOST = 2;
/* Later encounters are crossed faster by the spline, so they dwell longer to match. */
const DWELL_PER_PLANET = 0.25;
const DWELL_WIDTH = 0.009;
const REFERENCE_SPEED = 1300;
const PACE_MIN = 0.3;
const PACE_MAX = 3;
const SAMPLES = 2400;
const PROLOGUE_BOOST = 1.5;
const PROLOGUE_HOLD = 0.06;
const PROLOGUE_END = 0.095;

/* Camera speed along the journey (world units per unit of progress), from the landscape path. */
function buildDensity() {
  const { position } = createJourneyPath(false);
  const speedAt = (p: number) => {
    const e = 1e-4;
    const lo = Math.max(0, p - e);
    const hi = Math.min(1, p + e);
    const d = position.map((track) => track(hi) - track(lo));
    return Math.hypot(d[0], d[1], d[2]) / (hi - lo);
  };
  const first = encounterAt(0);
  const last = encounterAt(PLANETS.length - 1);

  return (p: number) => {
    /* Tour the planets at an even speed in the world: costly where the camera would race, cheap where it crawls. */
    const weight = smoothstep(first - 0.07, first - 0.01, p) * (1 - smoothstep(JOURNEY.outerSpace - 0.03, JOURNEY.outerSpace + 0.01, p));
    const pace = lerp(1, clamp(speedAt(p) / REFERENCE_SPEED, PACE_MIN, PACE_MAX), weight);
    const i = clamp(Math.round((p - first) / JOURNEY.encounterStep), 0, PLANETS.length - 1);
    const offset = (p - encounterAt(i)) / DWELL_WIDTH;
    // The prologue (galaxies down to the system) is a journey of its own, so it gets generous scroll.
    const prologue = PROLOGUE_BOOST * (1 - smoothstep(PROLOGUE_HOLD, PROLOGUE_END, p));
    return pace + prologue + (DWELL_BOOST + DWELL_PER_PLANET * i) * Math.exp(-offset * offset);
  };
}

function buildPacing() {
  const density = buildDensity();
  const cost = new Float64Array(SAMPLES + 1);
  for (let k = 1; k <= SAMPLES; k++) {
    cost[k] = cost[k - 1] + (density((k - 1) / SAMPLES) + density(k / SAMPLES)) / 2 / SAMPLES;
  }
  const total = cost[SAMPLES];

  /* Before pacing, scroll length was 11 viewports for cost 1; keep the same scroll per unit of cost. */
  const toScroll = (p: number) => {
    const x = clamp(p, 0, 1) * SAMPLES;
    const k = Math.min(SAMPLES - 1, Math.floor(x));
    return lerp(cost[k], cost[k + 1], x - k) / total;
  };
  const toJourney = (s: number) => {
    const target = clamp(s, 0, 1) * total;
    let lo = 0;
    let hi = SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cost[mid] <= target) lo = mid;
      else hi = mid;
    }
    const span = cost[hi] - cost[lo];
    return (lo + (span > 0 ? (target - cost[lo]) / span : 0)) / SAMPLES;
  };
  return { toScroll, toJourney, scrollScale: total };
}

const pacing = buildPacing();

/* Scroll progress (0-1 over the pinned distance) -> journey progress. */
export const scrollToJourney = pacing.toJourney;
/* Journey progress -> scroll progress. */
export const journeyToScroll = pacing.toScroll;
/* Total scroll cost relative to the old uniform pacing (1); multiplies the pinned distance. */
export const SCROLL_SCALE = pacing.scrollScale;
