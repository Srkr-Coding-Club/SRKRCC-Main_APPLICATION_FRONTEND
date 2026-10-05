import * as THREE from 'three';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* Atmospheric dust: sparse, small, mostly soft white, thinning with  */
/* distance through the fog. Never the subject - it gives the air     */
/* volume and makes camera motion perceptible.                        */
/* ------------------------------------------------------------------ */

const DRIFT_SPEED = 0.006;
const BASE_OPACITY = 0.5;

export function createAtmosphere(quality: QualitySettings) {
  const count = quality.dustCount;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Denser close to the camera path, thinning outward.
    const spread = Math.pow(Math.random(), 1.6);
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * (1.5 + spread * 26);
    positions[i * 3 + 1] = -3 + Math.random() * 14;
    positions[i * 3 + 2] = -30 + Math.random() * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: '#E2E8F0',
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);

  const update = (dt: number, presence: number) => {
    points.rotation.y += DRIFT_SPEED * dt;
    material.opacity = BASE_OPACITY * presence;
  };

  return { points, update };
}
