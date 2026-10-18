import * as THREE from 'three';
import { smoothstep } from '../introMath';

/* A comet-style light trail: a short history of positions, brightest at the head. */
/* It lives in world space, so whoever owns it adds `line` to the scene.           */

const POINTS = 36;
const COLOR = new THREE.Color('#FFB35C');

export function createTrail() {
  const positions = new Float32Array(POINTS * 3);
  const colors = new Float32Array(POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  line.frustumCulled = false;
  line.visible = false;
  let primed = false;

  return {
    line,
    /* Record the head position and redraw; `strength` (0-1) scales the brightness. */
    push(head: THREE.Vector3, strength: number) {
      if (!primed) {
        for (let k = 0; k < POINTS; k++) head.toArray(positions, k * 3);
        primed = true;
      }
      positions.copyWithin(3, 0, (POINTS - 1) * 3);
      head.toArray(positions, 0);
      for (let k = 0; k < POINTS; k++) {
        const along = 1 - k / (POINTS - 1);
        const level = along * along * strength;
        colors[k * 3] = COLOR.r * level;
        colors[k * 3 + 1] = COLOR.g * level;
        colors[k * 3 + 2] = COLOR.b * level;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      line.visible = true;
    },
    /* Stop drawing, and start the history afresh the next time. */
    hide() {
      line.visible = false;
      primed = false;
    },
  };
}

/* Brightness of a trail over a flight (0 launch, 1 arrival): full, then gone as the world arrives. */
export const trailStrength = (flight: number, peak: number) => peak * (1 - smoothstep(0.7, 1, flight));
