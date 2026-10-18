import { clamp, easeOutCubic, lerp, smoothstep } from '../introMath';
import type { PlanetSpec } from '../solarSystem';

/* ------------------------------------------------------------------ */
/* The gathering: as the camera arrives from the galaxy, every        */
/* technology and club program streams in from the edges of space and  */
/* spirals down onto its orbit, technology eras first, each leaving a  */
/* light trail. It is a pure function of the journey's progress, so it */
/* plays forward and backward with the scroll.                        */
/* ------------------------------------------------------------------ */

export const ENTRANCE = {
  /* Journey progress at which the first world launches, the gap between launches, and one flight's length. */
  start: 0.046,
  stagger: 0.0028,
  span: 0.03,
} as const;

/* Distance of the spawn ring from the system, and how far the path swings round. */
const SPAWN_RADIUS = 210;
const SWIRL = 0.85;
const CONTROL_PULL = 0.55;

/* 0 = not yet launched, 1 = arrived. */
export function entranceProgress(index: number, journey: number) {
  return easeOutCubic(clamp((journey - ENTRANCE.start - index * ENTRANCE.stagger) / ENTRANCE.span, 0, 1));
}

/* Where the planet is part-way along its path to `target` (its position in the system). */
export function entrancePosition(
  spec: PlanetSpec,
  index: number,
  e: number,
  target: { x: number; y: number; z: number },
  out: { x: number; y: number; z: number },
) {
  // Spawn on a ring around the view, in the screen plane, so planets converge on the centre from every side.
  const a = spec.angle + index * 0.9;
  const radius = SPAWN_RADIUS + 22 * Math.sin(index * 2.3);
  const sx = Math.cos(a) * radius * 1.15;
  const sy = Math.sin(a) * radius * 0.6 + 14;
  const sz = target.z - 60 - 40 * (0.5 + 0.5 * Math.sin(index * 1.7));

  // The control point is the spawn offset, pulled in and swung round the target: a spiral in, not a straight line.
  const dx = (sx - target.x) * CONTROL_PULL;
  const dy = (sy - target.y) * CONTROL_PULL;
  const cx = target.x + dx * Math.cos(SWIRL) - dy * Math.sin(SWIRL);
  const cy = target.y + dx * Math.sin(SWIRL) + dy * Math.cos(SWIRL);
  const cz = lerp(sz, target.z, 0.5);

  const t = clamp(e, 0, 1);
  const u = 1 - t;
  out.x = u * u * sx + 2 * u * t * cx + t * t * target.x;
  out.y = u * u * sy + 2 * u * t * cy + t * t * target.y;
  out.z = u * u * sz + 2 * u * t * cz + t * t * target.z;
  return out;
}

/* Planets grow out of the distance as they launch. */
export const entranceScale = (e: number) => smoothstep(0, 0.35, e);
