/* ------------------------------------------------------------------ */
/* Adaptive quality. A tier is picked from the device up front, then  */
/* the frame monitor steps detail down if the frame rate sags.        */
/* ------------------------------------------------------------------ */

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualitySettings {
  tier: QualityTier;
  maxPixelRatio: number;
  antialias: boolean;
  starCount: number;
  dustCount: number;
  curveSegments: number;
  sphereSegments: number;
}

const SETTINGS: Record<QualityTier, Omit<QualitySettings, 'tier'>> = {
  high: { maxPixelRatio: 2, antialias: true, starCount: 2400, dustCount: 900, curveSegments: 160, sphereSegments: 64 },
  medium: { maxPixelRatio: 1.5, antialias: true, starCount: 1600, dustCount: 500, curveSegments: 120, sphereSegments: 48 },
  low: { maxPixelRatio: 1, antialias: false, starCount: 900, dustCount: 220, curveSegments: 80, sphereSegments: 32 },
};

const PHONE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1180;
const CAPABLE_CORE_COUNT = 8;

export function detectQuality(): QualitySettings {
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  let tier: QualityTier = 'high';
  if (width < PHONE_MAX_WIDTH) tier = cores >= CAPABLE_CORE_COUNT ? 'medium' : 'low';
  else if (touch && width < TABLET_MAX_WIDTH) tier = 'medium';
  else if (cores < CAPABLE_CORE_COUNT / 2 + 1) tier = 'medium';

  return { tier, ...SETTINGS[tier] };
}

const SAMPLE_FRAMES = 90;
const MIN_HEALTHY_FPS = 42;
const PIXEL_RATIO_STEP = 0.8;
const MIN_PIXEL_RATIO = 0.65;

/* Watches frame times; each sustained dip triggers the next downgrade. */
export function createFrameMonitor(onDowngrade: (step: number) => boolean) {
  let frames = 0;
  let elapsed = 0;
  let step = 0;
  let exhausted = false;

  return {
    sample(dt: number) {
      if (exhausted) return;
      frames++;
      elapsed += dt;
      if (frames < SAMPLE_FRAMES) return;
      const fps = frames / elapsed;
      frames = 0;
      elapsed = 0;
      if (fps < MIN_HEALTHY_FPS) exhausted = !onDowngrade(++step);
    },
  };
}

export function nextPixelRatio(current: number) {
  return Math.max(MIN_PIXEL_RATIO, current * PIXEL_RATIO_STEP);
}
