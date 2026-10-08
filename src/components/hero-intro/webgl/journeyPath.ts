import { createTrack, smoothstep, type TrackKeys } from '../introMath';
import { encounterAt, JOURNEY, LAUNCH, PLANETS, planetPosition, SUN_RADIUS } from '../solarSystem';

/* ------------------------------------------------------------------ */
/* The camera's flight through the system, built from the planets     */
/* themselves. At each encounter the camera stands on the planet's    */
/* day side, swung PHASE radians off the planet-Sun line and raised  */
/* ELEVATION above the plane, the way                                 */
/* space photography frames a world: the Sun is behind the viewer,    */
/* out of frame, so nothing sits behind the planet and it shows a     */
/* lit face with a soft terminator. The swing is chosen so sunlight   */
/* falls from the story panel's side, lighting the limb that faces    */
/* the text. A Catmull-Rom spline through the poses gives the curved  */
/* approach - pass close - depart motion between planets.             */
/* ------------------------------------------------------------------ */

/* Encounter framing, in multiples of the planet's radius. */
const STANDOFF = 7.6;
const LOOK_SHIFT = 1.9;
/* Sun-planet-camera angle at the encounter: ~60 degrees shows a gibbous, more-than-half-lit face. */
const PHASE = 1.05;
/* The camera looks down on the planet by this angle (radians), so the system's plane - and every  */
/* other planet in it - falls away above the frame instead of crowding the planet or the panel.    */
const ELEVATION = 0.7;

interface Pose {
  p: number;
  position: [number, number, number];
  look: [number, number, number];
}

function encounterPose(index: number, portrait: boolean): Pose {
  const planet = PLANETS[index];
  const p = encounterAt(index);
  const { x, y, z } = planetPosition(planet, p);
  const length = Math.hypot(x, z);
  const toSun = [-x / length, -z / length];
  // +1 when the panel is on the right of the screen (the planet holds the left); on portrait it picks the light's side.
  const panelSide = planet.side === 'left' ? 1 : -1;
  const r = planet.radius;
  const standoff = portrait ? STANDOFF * 1.2 : STANDOFF;

  // Of the two swings, take the one that puts the (off-screen) Sun on the panel's side.
  const sign = [1, -1].find((candidate) => {
    const a = candidate * PHASE;
    const dir = [toSun[0] * Math.cos(a) - toSun[1] * Math.sin(a), toSun[1] * Math.cos(a) + toSun[0] * Math.sin(a)];
    return Math.sign(dir[1] * toSun[0] - dir[0] * toSun[1]) === panelSide;
  })!;
  const a = sign * PHASE;
  const dir = [toSun[0] * Math.cos(a) - toSun[1] * Math.sin(a), toSun[1] * Math.cos(a) + toSun[0] * Math.sin(a)];
  // Looking back at the planet (forward = -dir), screen-right is (-forward.z, 0, forward.x) = (dir.z, 0, -dir.x).
  const right = [dir[1], -dir[0]];
  const shift = portrait ? 0 : LOOK_SHIFT * panelSide * r;
  return {
    p,
    position: [
      x + dir[0] * r * standoff * Math.cos(ELEVATION),
      y + r * standoff * Math.sin(ELEVATION),
      z + dir[1] * r * standoff * Math.cos(ELEVATION),
    ],
    // Looking past the planet toward the panel's side keeps the planet on its own side of the frame.
    look: [x + right[0] * shift, y + (portrait ? -r * 0.9 : 0), z + right[1] * shift],
  };
}

export function createJourneyPath(portrait: boolean) {
  const sunDistance = SUN_RADIUS * (portrait ? 7 : 5);
  const poses: Pose[] = [
    { p: 0, position: [0, 70, 300], look: [0, 0, 0] },
    { p: JOURNEY.openingLines[1].start, position: [0, 34, 170], look: [0, 0, 0] },
    // The Sun sits a little high in the frame, leaving room for its title below.
    { p: (JOURNEY.sunReveal.start + JOURNEY.sunReveal.end) / 2, position: [0, 4, sunDistance * 1.1], look: [0, -SUN_RADIUS * 0.3, 0] },
    ...PLANETS.map((_, i) => encounterPose(i, portrait)),
    { p: JOURNEY.outerSpace, position: [0, 120, 210], look: [0, 0, 0] },
    // Back at the Sun, held high in the frame so the closing words sit below it on dark space.
    { p: (JOURNEY.finalReveal.start + JOURNEY.finalReveal.end) / 2, position: [0, 6, sunDistance * 1.9], look: [0, -SUN_RADIUS * 1.6, 0] },
    { p: LAUNCH.shellCrossing, position: [0, 0, SUN_RADIUS * 1.6], look: [0, 0, 0] },
    { p: 1, position: [0, 0, SUN_RADIUS * 0.9], look: [0, 0, 0] },
  ];
  const track = (pick: (pose: Pose) => number) => createTrack(poses.map((pose) => [pose.p, pick(pose)] as const) as TrackKeys);
  return {
    position: [track((pose) => pose.position[0]), track((pose) => pose.position[1]), track((pose) => pose.position[2])],
    look: [track((pose) => pose.look[0]), track((pose) => pose.look[1]), track((pose) => pose.look[2])],
  };
}

/* How close the journey is to each planet's encounter: 0 far away, 1 at the encounter. */
export function planetProximity(progress: number, index: number) {
  const distance = Math.abs(progress - encounterAt(index));
  return 1 - smoothstep(0, JOURNEY.encounterStep * 0.75, distance);
}

/* Planets, orbits and dust step back for the void at the start and the final return to the Sun. */
export function systemPresence(progress: number) {
  return smoothstep(0.03, 0.12, progress) * (1 - smoothstep(LAUNCH.shellCrossing - 0.02, LAUNCH.shellCrossing, progress));
}

/* The Sun brightens as the journey returns to it. */
export function sunBrightness(progress: number) {
  return smoothstep(JOURNEY.outerSpace, JOURNEY.finalReveal.start, progress) + smoothstep(JOURNEY.sunReveal.start, JOURNEY.sunReveal.end, progress) * 0.3;
}
