import * as THREE from 'three';
import { smoothstep } from '../introMath';
import { createTrail, trailStrength } from './trail';

/* ------------------------------------------------------------------ */
/* The endless stream into the system: after the opening gathering,    */
/* more technologies and club programs keep flying in from the edges   */
/* of space, spiralling down and dissolving into the Sun, one after    */
/* another, for as long as the visitor is still far away. The stream   */
/* thins out and stops as the camera closes on the Sun.                */
/*                                                                     */
/* Every traveller is a clone of one of the planet emblems (geometry   */
/* and materials are shared), so the stream costs almost nothing.      */
/* All of it is a pure function of time, so it never needs resetting.  */
/* ------------------------------------------------------------------ */

const COUNT = 8;
const FIRST_LAUNCH_S = 0.3;
const LAUNCH_GAP_S = 0.26;
const MIN_FLIGHT_S = 3.4;
const FLIGHT_SPREAD_S = 1.6;
const SPAWN_RADIUS = 150;
const SPAWN_SPREAD = 90;
const SWIRL = 0.9;
const CONTROL_PULL = 0.55;
const TRAIL_PEAK = 0.7;
/* Presence fades out between these journey progress values (as the camera nears the Sun). */
const FADE_START = 0.05;
const FADE_END = 0.105;

/* Deterministic pseudo-random in [0, 1) from two integers. */
function hash(a: number, b: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const streamPresence = (progress: number) => 1 - smoothstep(FADE_START, FADE_END, progress);

interface Traveller {
  holder: THREE.Group;
  trail: ReturnType<typeof createTrail>;
  flightSeconds: number;
  launchAt: number;
  cycle: number;
  size: number;
}

export function createStream(templates: THREE.Object3D[]) {
  const group = new THREE.Group();
  const travellers: Traveller[] = [];

  for (let i = 0; i < COUNT; i++) {
    const holder = new THREE.Group();
    const model = templates[i % templates.length].clone(true);
    holder.add(model);
    holder.visible = false;
    const trail = createTrail();
    group.add(holder, trail.line);
    travellers.push({
      holder,
      trail,
      flightSeconds: MIN_FLIGHT_S + hash(i, 1) * FLIGHT_SPREAD_S,
      launchAt: FIRST_LAUNCH_S + i * LAUNCH_GAP_S,
      cycle: -1,
      size: 0.9 + hash(i, 2) * 0.6,
    });
  }

  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const head = new THREE.Vector3();

  const update = (time: number, progress: number, camera: THREE.Vector3) => {
    const presence = streamPresence(progress);
    group.visible = presence > 0.002;
    if (!group.visible) return;

    travellers.forEach((t, i) => {
      const elapsed = time - t.launchAt;
      if (elapsed < 0) return;
      const cycle = Math.floor(elapsed / t.flightSeconds);
      const u = elapsed / t.flightSeconds - cycle;
      if (cycle !== t.cycle) {
        t.cycle = cycle;
        t.trail.hide();
      }

      // A fresh route every lap: where it enters from, and where in the Sun's glow it ends.
      const a = hash(i, cycle * 3 + 5) * Math.PI * 2;
      const radius = SPAWN_RADIUS + hash(i, cycle * 3 + 6) * SPAWN_SPREAD;
      from.set(Math.cos(a) * radius * 1.15, Math.sin(a) * radius * 0.6 + 10, -20 - hash(i, cycle * 3 + 7) * 90);
      const b = hash(i, cycle * 3 + 8) * Math.PI * 2;
      const reach = 3 + hash(i, cycle * 3 + 9) * 6;
      to.set(Math.cos(b) * reach, Math.sin(b) * reach * 0.6, 0);

      // Quadratic Bezier with its control point swung round the destination: a spiral in.
      const dx = (from.x - to.x) * CONTROL_PULL;
      const dy = (from.y - to.y) * CONTROL_PULL;
      const cx = to.x + dx * Math.cos(SWIRL) - dy * Math.sin(SWIRL);
      const cy = to.y + dx * Math.sin(SWIRL) + dy * Math.cos(SWIRL);
      const cz = (from.z + to.z) / 2;
      // Falling toward the Sun: slow to start, quickening as it goes.
      const e = Math.pow(u, 1.7);
      const k = 1 - e;
      head.set(
        k * k * from.x + 2 * k * e * cx + e * e * to.x,
        k * k * from.y + 2 * k * e * cy + e * e * to.y,
        k * k * from.z + 2 * k * e * cz + e * e * to.z,
      );

      t.holder.position.copy(head);
      t.holder.lookAt(camera);
      const grow = smoothstep(0, 0.18, u) * (1 - 0.85 * smoothstep(0.78, 1, u));
      t.holder.scale.setScalar(t.size * grow * presence);
      t.holder.visible = grow * presence > 0.01;

      const trailBrightness = trailStrength(u * 0.9, TRAIL_PEAK) * smoothstep(0, 0.12, u) * presence;
      if (trailBrightness > 0.01) t.trail.push(head, trailBrightness);
      else t.trail.hide();
    });
  };

  return { group, update };
}
