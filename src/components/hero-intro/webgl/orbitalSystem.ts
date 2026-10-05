import * as THREE from 'three';
import { RENDER_ORDER } from './intelligenceCore';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* Three orbits in world space with a clear hierarchy: a primary ring */
/* you notice, a secondary you sense, a tertiary you barely see. Each */
/* has its own tilt, radius, speed and carriers. They pass in front   */
/* of and behind the core, which occludes them via the depth buffer.  */
/* ------------------------------------------------------------------ */

interface OrbitSpec {
  radius: number;
  tube: number;
  tilt: [number, number, number];
  speed: number;
  color: string;
  opacity: number;
  carriers: number;
}

const ORBITS: OrbitSpec[] = [
  { radius: 2.35, tube: 0.011, tilt: [1.22, 0, 0.2], speed: 0.14, color: '#FFA500', opacity: 0.6, carriers: 2 },
  { radius: 3.3, tube: 0.008, tilt: [1.05, 0.7, 0], speed: -0.08, color: '#94A3B8', opacity: 0.28, carriers: 1 },
  { radius: 4.5, tube: 0.006, tilt: [1.4, -0.5, 0.1], speed: 0.05, color: '#64748B', opacity: 0.12, carriers: 0 },
];

const CARRIER_RADIUS = 0.045;

export function createOrbitalSystem(quality: QualitySettings) {
  const group = new THREE.Group();
  const carrierMaterial = new THREE.MeshStandardMaterial({ color: '#1a1917', emissive: '#F5F5F5', emissiveIntensity: 0.9, roughness: 0.4 });
  const carrierGeometry = new THREE.SphereGeometry(CARRIER_RADIUS, 12, 8);

  const spinners = ORBITS.map((spec) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...spec.tilt);
    const spinner = new THREE.Group();
    pivot.add(spinner);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius, spec.tube, 6, quality.curveSegments),
      new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: spec.opacity, depthWrite: false }),
    );
    ring.renderOrder = RENDER_ORDER.orbit;
    spinner.add(ring);

    for (let i = 0; i < spec.carriers; i++) {
      const carrier = new THREE.Mesh(carrierGeometry, carrierMaterial);
      const angle = (i / spec.carriers) * Math.PI * 2 + 0.6;
      carrier.position.set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0);
      spinner.add(carrier);
    }
    group.add(pivot);
    return { spinner, speed: spec.speed };
  });

  const update = (dt: number, speedScale: number) => {
    for (const { spinner, speed } of spinners) spinner.rotation.z += speed * speedScale * dt;
  };

  return { group, update };
}
