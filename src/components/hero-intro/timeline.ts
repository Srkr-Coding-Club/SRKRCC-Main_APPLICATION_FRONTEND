import { createTrack } from './introMath';

/* ------------------------------------------------------------------ */
/* The intro's narrative, as functions of scroll progress (0-1). Both  */
/* the WebGL scene and the DOM layer read from here, so the world, the */
/* HUD and the page handoff stay in step.                              */
/* ------------------------------------------------------------------ */

export const PHASES = [
  { label: 'Awaken', status: 'Initializing', start: 0 },
  { label: 'Transit', status: 'Signal found', start: 0.25 },
  { label: 'Core', status: 'Core online', start: 0.55 },
  { label: 'Launch', status: 'Entering', start: 0.85 },
] as const;

export function phaseIndexAt(progress: number) {
  let index = 0;
  PHASES.forEach((phase, i) => {
    if (progress >= phase.start) index = i;
  });
  return index;
}

/* Beats inside Launch: the camera crosses the shell, light fills the frame, the page emerges. */
export const LAUNCH = {
  shellCrossing: 0.885,
  lightFull: 0.925,
  taglineIn: 0.9,
  taglineOut: 0.944,
  pageEmerges: 0.955,
} as const;

/* Camera path in world units; the core sits at the origin. */
export const cameraTrack = {
  x: createTrack([[0, 0], [0.12, -1.1], [0.3, 1.5], [0.45, -1.3], [0.55, -0.7], [0.7, 0.9], [0.85, 0.25], [0.9, 0], [1, 0]]),
  y: createTrack([[0, 1.6], [0.25, 1.05], [0.45, 0.45], [0.55, 0.55], [0.7, 0.35], [0.85, 0.12], [0.9, 0.02], [1, 0]]),
  z: createTrack([[0, 64], [0.25, 34], [0.4, 22], [0.55, 11], [0.7, 6.6], [0.85, 3.7], [0.9, 1.05], [0.94, 0.3], [1, 0.3]]),
};

/* How the world responds as the camera approaches. 1 = full presence. */
export const worldTrack = {
  /* Fog thins as the lab reveals itself, then thickens to quiet the surroundings near the core. */
  fogDensity: createTrack([[0, 0.046], [0.25, 0.032], [0.55, 0.03], [0.8, 0.042], [0.9, 0.065], [1, 0.065]]),
  /* Light from inside the core. */
  coreLight: createTrack([[0, 40], [0.25, 140], [0.55, 220], [0.8, 260], [0.9, 320], [1, 320]]),
  /* The distant point of light that first draws the eye, fading once the core itself is legible. */
  beacon: createTrack([[0, 1], [0.4, 0.75], [0.7, 0.35], [0.88, 0], [1, 0]]),
  /* Environment detail: lab accents, data lights, dust, artifacts. Recedes near the core. */
  environment: createTrack([[0, 0.55], [0.22, 1], [0.5, 1], [0.66, 0.4], [0.8, 0.12], [0.88, 0], [1, 0]]),
  /* Energy inside the core. */
  energy: createTrack([[0, 0.35], [0.55, 0.65], [0.8, 1], [0.9, 1.7], [1, 1.7]]),
  /* Orbit rotation speed - the system calms as the camera closes in. */
  orbitSpeed: createTrack([[0, 1], [0.55, 0.8], [0.8, 0.35], [0.9, 0.2], [1, 0.2]]),
};
