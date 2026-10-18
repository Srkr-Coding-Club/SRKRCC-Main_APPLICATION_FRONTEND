import { clamp, createTrack, smoothstep, type TrackKeys } from '../introMath';
import { encounterAt, JOURNEY, LAUNCH, MILKY_WAY_CENTER, PLANETS, planetPosition, SUN_RADIUS } from '../solarSystem';

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

/* Neighbouring worlds can sit so close together that the camera barely moves between their encounters   */
/* while its gaze has to swing right round from one to the other - a dizzying spin on the spot. Between   */
/* such a pair, the camera pulls back and up for a wide shot of both, then moves in on the second.        */
const SPIN_LIMIT = 1.45; // radians between the two encounters' view directions (~83 degrees)
const NEAR_LIMIT = 28; // world units between the two encounter positions

function withTransitions(encounters: Pose[]) {
  const out: Pose[] = [];
  encounters.forEach((pose, i) => {
    out.push(pose);
    const next = encounters[i + 1];
    if (!next) return;
    const forward = (q: Pose) => {
      const f = [q.look[0] - q.position[0], q.look[1] - q.position[1], q.look[2] - q.position[2]];
      const length = Math.hypot(f[0], f[1], f[2]);
      return f.map((v) => v / length);
    };
    const fa = forward(pose);
    const fb = forward(next);
    const spin = Math.acos(clamp(fa[0] * fb[0] + fa[1] * fb[1] + fa[2] * fb[2], -1, 1));
    const apart = Math.hypot(pose.position[0] - next.position[0], pose.position[1] - next.position[1], pose.position[2] - next.position[2]);
    if (spin < SPIN_LIMIT && apart > NEAR_LIMIT) return;

    // A wide shot centred between the two worlds, taken from their sunward side.
    const p = (pose.p + next.p) / 2;
    const a = planetPosition(PLANETS[i], p);
    const b = planetPosition(PLANETS[i + 1], p);
    const centre = [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2];
    const gap = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const length = Math.hypot(centre[0], centre[2]);
    const toSun = [-centre[0] / length, -centre[2] / length];
    const pull = gap * 0.9 + 22;
    const lift = gap * 0.45 + 16;
    const middle = [(pose.position[0] + next.position[0]) / 2, (pose.position[2] + next.position[2]) / 2];
    // Of the two sides, take the one nearer the camera's own route, so the path bows rather than doubles back.
    const candidates = [1, -1].map((sign) => {
      const angle = sign * PHASE;
      const dir = [toSun[0] * Math.cos(angle) - toSun[1] * Math.sin(angle), toSun[1] * Math.cos(angle) + toSun[0] * Math.sin(angle)];
      return [centre[0] + dir[0] * pull, centre[1] + lift, centre[2] + dir[1] * pull] as [number, number, number];
    });
    const position = candidates.sort((u, v) => Math.hypot(u[0] - middle[0], u[2] - middle[1]) - Math.hypot(v[0] - middle[0], v[2] - middle[1]))[0];
    out.push({ p, position, look: [centre[0], centre[1], centre[2]] });
  });
  return out;
}

export function createJourneyPath(portrait: boolean) {
  const sunDistance = SUN_RADIUS * (portrait ? 7 : 5);
  const poses: Pose[] = [
    // The prologue: from far out among the galaxies, down into an arm of the Milky Way and in to the Sun.
    // Distances roughly halve at each step, so the zoom feels even rather than rushing at the end.
    { p: 0, position: [-1250, 2500, 3300], look: [MILKY_WAY_CENTER.x, 0, MILKY_WAY_CENTER.z] },
    { p: 0.02, position: [-760, 1300, 1900], look: [-500, 0, -300] },
    { p: 0.036, position: [-330, 560, 900], look: [-120, 0, -60] },
    { p: 0.052, position: [-90, 200, 420], look: [0, 0, 0] },
    // The whole system, seen from above and a little way off.
    { p: 0.066, position: [0, 92, 200], look: [0, 0, 0] },
    { p: 0.082, position: [0, 34, 170], look: [0, 0, 0] },
    // The Sun sits a little high in the frame, leaving room for its title below.
    { p: (JOURNEY.sunReveal.start + JOURNEY.sunReveal.end) / 2, position: [0, 4, sunDistance * 1.1], look: [0, -SUN_RADIUS * 0.3, 0] },
    ...withTransitions(PLANETS.map((_, i) => encounterPose(i, portrait))),
    { p: JOURNEY.outerSpace, position: [0, 120, 210], look: [0, 0, 0] },
    // Back at the Sun, held high in the frame so the closing words sit below it on dark space.
    { p: (JOURNEY.finalReveal.start + JOURNEY.finalReveal.end) / 2, position: [0, 6, sunDistance * 1.9], look: [0, -SUN_RADIUS * 1.6, 0] },
    { p: LAUNCH.shellCrossing, position: [0, 0, SUN_RADIUS * 1.6], look: [0, 0, 0] },
    { p: 1, position: [0, 0, SUN_RADIUS * 0.9], look: [0, 0, 0] },
  ];
  const build = () => {
    const track = (pick: (pose: Pose) => number) => createTrack(poses.map((pose) => [pose.p, pick(pose)] as const) as TrackKeys);
    return {
      position: [track((pose) => pose.position[0]), track((pose) => pose.position[1]), track((pose) => pose.position[2])],
      look: [track((pose) => pose.look[0]), track((pose) => pose.look[1]), track((pose) => pose.look[2])],
    };
  };

  /* Keep the flight clear of the worlds it is not visiting: wherever the spline cuts */
  /* too close to the Sun or a planet, add a waypoint pushed out to the clearance.   */
  let path = build();
  for (let pass = 0; pass < MAX_CLEARANCE_PASSES; pass++) {
    const breach = worstBreach(path.position);
    if (!breach) break;
    const at = path.position.map((track) => track(breach.p));
    const out = [at[0] - breach.center[0], at[1] - breach.center[1], at[2] - breach.center[2]];
    const scale = breach.clearance / Math.hypot(out[0], out[1], out[2]);
    poses.push({
      p: breach.p,
      position: [breach.center[0] + out[0] * scale, breach.center[1] + out[1] * scale, breach.center[2] + out[2] * scale],
      look: path.look.map((track) => track(breach.p)) as [number, number, number],
    });
    poses.sort((a, b) => a.p - b.p);
    path = build();
  }
  return path;
}

/* Fly-by clearance: planets in multiples of their radius, the Sun in multiples of its own. */
const PLANET_CLEARANCE = 15;
const SUN_CLEARANCE = 2.4;
const MAX_CLEARANCE_PASSES = 24;
const CLEARANCE_STEPS = 700;
/* Encounter poses are deliberate, and a waypoint squeezed in beside one makes the spline lurch, */
/* so only the transit between encounters is checked.                                          */
const ENCOUNTER_KEEP_OUT = 0.018;

function worstBreach(position: Array<(p: number) => number>) {
  let worst: { p: number; center: [number, number, number]; clearance: number; depth: number } | null = null;
  const consider = (p: number, center: [number, number, number], clearance: number, distance: number) => {
    const depth = clearance - distance;
    if (depth > 0.05 && (!worst || depth / clearance > worst.depth / worst.clearance)) worst = { p, center, clearance, depth };
  };
  for (let k = 0; k <= CLEARANCE_STEPS; k++) {
    const p = (k / CLEARANCE_STEPS) * JOURNEY.outerSpace;
    if (PLANETS.some((_, i) => Math.abs(p - encounterAt(i)) < ENCOUNTER_KEEP_OUT)) continue;
    const c = [position[0](p), position[1](p), position[2](p)];
    if (p > encounterAt(0) - JOURNEY.encounterStep * 0.5) {
      consider(p, [0, 0, 0], SUN_RADIUS * SUN_CLEARANCE, Math.hypot(c[0], c[1], c[2]));
    }
    PLANETS.forEach((planet) => {
      const q = planetPosition(planet, p);
      consider(p, [q.x, q.y, q.z], planet.radius * PLANET_CLEARANCE, Math.hypot(c[0] - q.x, c[1] - q.y, c[2] - q.z));
    });
  }
  return worst as { p: number; center: [number, number, number]; clearance: number; depth: number } | null;
}

/* How close the journey is to each planet's encounter: 0 far away, 1 at the encounter. */
export function planetProximity(progress: number, index: number) {
  const distance = Math.abs(progress - encounterAt(index));
  return 1 - smoothstep(0, JOURNEY.encounterStep * 0.75, distance);
}

/* Planets, orbits and dust step back for the void at the start and the final return to the Sun. */
export function systemPresence(progress: number) {
  return smoothstep(0.05, 0.095, progress) * (1 - smoothstep(LAUNCH.shellCrossing - 0.02, LAUNCH.shellCrossing, progress));
}

/* The Sun brightens as the journey returns to it. */
export function sunBrightness(progress: number) {
  return smoothstep(JOURNEY.outerSpace, JOURNEY.finalReveal.start, progress) + smoothstep(JOURNEY.sunReveal.start, JOURNEY.sunReveal.end, progress) * 0.3;
}
