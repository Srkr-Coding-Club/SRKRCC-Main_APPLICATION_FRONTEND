import * as THREE from 'three';
import { smoothstep } from '../introMath';
import { PLANETS } from '../solarSystem';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* Everything around the planets, in depth layers:                    */
/*   far   - a star sphere and a few faint distant galaxies           */
/*   mid   - the orbit paths, one hairline per planet                 */
/*   near  - drifting dust through the system, the closest layer      */
/* Stars ignore fog and depth so they read as infinitely far.         */
/* ------------------------------------------------------------------ */

const STAR_DISTANCE = { min: 520, max: 900 };
const GALAXIES = [
  { position: [-520, 160, -640], scale: 260, color: '#5E7FB8', opacity: 0.14 },
  { position: [610, -120, -420], scale: 200, color: '#8C7BB0', opacity: 0.1 },
  { position: [120, 300, 680], scale: 180, color: '#4E8FA6', opacity: 0.09 },
] as const;
const BAND_SHARE = 0.45;
const BAND_WIDTH = 0.12;
const BAND_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0.4, 0.3));
const ORBIT_SEGMENTS = 256;

/* Standard normal sample (Box-Muller). */
function gaussian() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}
const ORBIT_OPACITY = 0.07;
const ORBIT_ACTIVE_OPACITY = 0.35;
const DUST_RADIUS = 110;
const DUST_DRIFT = 0.004;

export function createStarfield(quality: QualitySettings, glowTexture: THREE.Texture) {
  const group = new THREE.Group();
  const positions = new Float32Array(quality.starCount * 3);
  const colors = new Float32Array(quality.starCount * 3);
  const tint = new THREE.Color();
  const star = new THREE.Vector3();
  for (let i = 0; i < quality.starCount; i++) {
    // Part of the sky is a galactic band: stars crowded about a tilted great circle, like the Milky Way.
    const inBand = Math.random() < BAND_SHARE;
    const u = inBand ? gaussian() * BAND_WIDTH : Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const r = STAR_DISTANCE.min + Math.random() * (STAR_DISTANCE.max - STAR_DISTANCE.min);
    const s = Math.sqrt(1 - Math.min(u * u, 1));
    star.set(Math.cos(theta) * s, Math.max(-1, Math.min(1, u)), Math.sin(theta) * s);
    if (inBand) star.applyQuaternion(BAND_TILT);
    positions.set([star.x * r, star.y * r, star.z * r], i * 3);
    // Mostly white-silver, a few cool blue and warm stars.
    const pick = Math.random();
    tint.set(pick < 0.12 ? '#9FC3FF' : pick < 0.18 ? '#FFD9A8' : '#E8ECF4').multiplyScalar(0.25 + Math.random() * Math.random() * 0.75);
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }),
  );
  group.add(stars);

  for (const galaxy of GALAXIES) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: galaxy.color,
        transparent: true,
        opacity: galaxy.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    const [gx, gy, gz] = galaxy.position;
    sprite.position.set(gx, gy, gz);
    sprite.scale.set(galaxy.scale * 1.6, galaxy.scale, 1);
    group.add(sprite);
  }

  return { group, stars };
}

export function createOrbits() {
  const group = new THREE.Group();
  const materials = PLANETS.map((planet) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * planet.orbit, planet.lift, Math.sin(a) * planet.orbit));
    }
    const material = new THREE.LineBasicMaterial({ color: '#94A3B8', transparent: true, opacity: ORBIT_OPACITY, depthWrite: false });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    return material;
  });

  /* Each orbit warms as its planet is visited, and fades right out at the encounter itself so the */
  /* line never cuts across the planet filling the frame.                                         */
  const warm = new THREE.Color('#FFA35C');
  const cool = new THREE.Color('#94A3B8');
  const update = (proximities: number[], presence: number) => {
    materials.forEach((material, i) => {
      const p = proximities[i];
      const visit = Math.sin(p * Math.PI);
      material.opacity = (ORBIT_OPACITY + (ORBIT_ACTIVE_OPACITY - ORBIT_OPACITY) * visit) * (1 - smoothstep(0.75, 1, p)) * presence;
      material.color.copy(cool).lerp(warm, p);
    });
  };

  return { group, update };
}

export function createDust(quality: QualitySettings) {
  const count = quality.dustCount;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * DUST_RADIUS;
    const a = Math.random() * Math.PI * 2;
    positions.set([Math.cos(a) * r, (Math.random() - 0.5) * 14, Math.sin(a) * r], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#C9D4E3', size: 0.09, transparent: true, opacity: 0.45, depthWrite: false });
  const points = new THREE.Points(geometry, material);

  const update = (dt: number, presence: number) => {
    points.rotation.y += DUST_DRIFT * dt;
    material.opacity = 0.45 * presence;
  };

  return { points, update };
}
