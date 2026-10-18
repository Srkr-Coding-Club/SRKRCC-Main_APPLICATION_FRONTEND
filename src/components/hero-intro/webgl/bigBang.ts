import * as THREE from 'three';
import { smoothstep } from '../introMath';
import { MILKY_WAY_CENTER } from '../solarSystem';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The first seconds of the intro: the Big Bang.                       */
/*                                                                     */
/*   0.0 - 1.9s  a single point of light in the dark, brightening and  */
/*               trembling as it gathers itself                        */
/*   1.9s        ignition: a white-out flash, a shock shell racing out, */
/*               the camera jolting                                    */
/*   1.9 - 9s    a million-degree fireball of matter hurled outward in  */
/*               streams and filaments, cooling from white to gold to   */
/*               red to ember as it spreads                            */
/*   3.6 - 10.5s the galaxies condense out of the cooling matter and   */
/*               fly apart to where they will hang (see galaxies.ts)   */
/*                                                                     */
/* Everything is a pure function of time (and of scroll, which skips  */
/* the show), and the particles move entirely on the GPU.             */
/* ------------------------------------------------------------------ */

export const BANG = {
  ignite: 1.9,
  expand: 7.5,
  galaxiesFrom: 3.6,
  galaxiesTo: 10.5,
  end: 11,
} as const;

/* Scrolling skips the show: it fades out as the journey begins. */
const skipped = (journey: number) => smoothstep(0.002, 0.012, journey);

/* The galaxies' birth, 0 (a point) to 1 (in place). Scrolling completes it at once. */
export function bangReveal(time: number, journey: number) {
  return Math.max(smoothstep(BANG.galaxiesFrom, BANG.galaxiesTo, time), skipped(journey));
}

/* How much of the first scene the camera still gives to the Big Bang: it starts well back and eases in. */
export function bangDolly(time: number, journey: number) {
  return (1 - smoothstep(0.3, BANG.galaxiesTo, time)) * (1 - skipped(journey));
}

/* A short, decaying jolt at the moment of ignition (world units; added to the camera). */
export function bangShake(time: number, out: THREE.Vector3) {
  const t = time - BANG.ignite;
  const strength = t > 0 ? Math.exp(-3.2 * t) * 55 : 0;
  return out.set(Math.sin(t * 47) * strength, Math.sin(t * 39 + 1) * strength * 0.8, 0);
}

const MAX_RADIUS = 7200;
const PLASMA_SIZE = 16000;
const FILAMENTS = 56;

function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

const VERTEX = /* glsl */ `
attribute vec3 dir;
attribute float speed;
attribute float seed;
attribute float size;
uniform float uT;
uniform float uOpacity;
uniform float uPixelScale;
uniform float uMaxR;
uniform vec3 uCenter;
varying vec3 vColor;
void main() {
  float t = max(uT, 0.0);
  float spread = 1.0 - pow(1.0 - clamp(t / ${BANG.expand.toFixed(1)}, 0.0, 1.0), 3.0);
  float swirl = 0.55 * spread * speed;
  float c = cos(swirl);
  float s = sin(swirl);
  vec3 d = vec3(dir.x * c - dir.z * s, dir.y, dir.x * s + dir.z * c);
  vec3 pos = uCenter + d * uMaxR * speed * spread;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Temperature: white-hot, then gold, orange, red, and finally ember.
  float heat = clamp(t / 7.0, 0.0, 1.0);
  vec3 col = mix(vec3(1.0, 0.98, 0.92), vec3(1.0, 0.76, 0.40), smoothstep(0.0, 0.22, heat));
  col = mix(col, vec3(0.97, 0.36, 0.15), smoothstep(0.18, 0.55, heat));
  col = mix(col, vec3(0.45, 0.10, 0.12), smoothstep(0.5, 1.0, heat));
  float fade = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.62, 1.0, heat));
  vColor = col * (0.3 + 0.7 * seed) * fade * uOpacity;
  float grow = 1.0 + (1.0 - spread) * 2.2;
  gl_PointSize = clamp(size * grow * uPixelScale / max(-mv.z, 1.0), 1.4, 7.0);
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, a);
}`;

/* The fireball itself: turbulent plasma drawn as light on a camera-facing quad. Domain-warped noise gives   */
/* it billowing, filamented structure; its colour follows temperature (white-hot core, gold, orange, red,   */
/* ember) and falls as it expands; a ragged shock front races ahead; a dim red afterglow outlasts it.       */
const PLASMA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const PLASMA_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform float uT;
uniform float uOpacity;
uniform sampler2D uNoise;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float t = max(uT, 0.0);
  float grow = 1.0 - pow(1.0 - clamp(t / 6.5, 0.0, 1.0), 2.6);
  float rf = 0.05 + 0.82 * grow;

  // Turbulence, drifting outward, warped by itself for billows and filaments.
  vec2 q = vec2(texture2D(uNoise, p * 0.3 + vec2(0.0, -t * 0.0225)).r, texture2D(uNoise, p * 0.3 + vec2(0.65, 0.16) + t * 0.015).g);
  float n = texture2D(uNoise, p * 0.4 + 0.4 * q - t * 0.0125).b;
  // Tendrils: sampled round a circle in the texture, so there is no seam where the angle wraps.
  vec2 radial = normalize(p + 1e-5);
  float tendril = texture2D(uNoise, radial * 0.25 + vec2(r * 0.25 - t * 0.05, 0.4)).a;
  float d = r / (rf * (0.78 + 0.5 * n + 0.25 * tendril));
  float body = smoothstep(1.0, 0.1, d);
  float core = pow(max(1.0 - d, 0.0), 2.2);

  // Temperature to colour; the whole ball cools with time.
  float heat = clamp(core * 1.5 + (n - 0.35) * 0.9 + 1.0 - t * 0.3, 0.0, 1.6);
  vec3 col = mix(vec3(0.35, 0.06, 0.04), vec3(0.95, 0.28, 0.10), smoothstep(0.1, 0.5, heat));
  col = mix(col, vec3(1.0, 0.66, 0.28), smoothstep(0.45, 0.9, heat));
  col = mix(col, vec3(1.0, 0.96, 0.88), smoothstep(0.85, 1.35, heat));
  float ridge = pow(1.0 - abs(2.0 * n - 1.0), 5.0);
  float intensity = body * (0.35 + 0.9 * core + 0.7 * ridge);

  // The shock front: a thin, ragged shell racing ahead of the fireball.
  float rs = 0.1 + 0.9 * (1.0 - pow(1.0 - clamp(t / 8.0, 0.0, 1.0), 2.0));
  float shell = exp(-pow((r - rs) / (0.025 + 0.02 * n), 2.0)) * (0.4 + 0.9 * tendril) * (1.0 - smoothstep(0.5, 8.0, t)) * step(0.0, uT);

  // The dim red afterglow that lingers as the fireball goes out.
  float after = smoothstep(2.5, 6.0, t) * (1.0 - smoothstep(7.0, 10.5, t)) * smoothstep(1.1, 0.0, r) * (0.25 + 0.5 * n);

  vec3 rgb = col * intensity * 0.78 * (1.0 - smoothstep(3.0, 7.0, t)) + vec3(1.0, 0.78, 0.55) * shell * 0.9 + vec3(0.55, 0.10, 0.06) * after * 0.8;
  rgb *= smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.9, r);
  gl_FragColor = vec4(rgb * uOpacity, 1.0);
}`;

export function createBigBang(quality: QualitySettings, glowTexture: THREE.Texture, noise: THREE.Texture) {
  const group = new THREE.Group();
  const center = new THREE.Vector3(MILKY_WAY_CENTER.x, MILKY_WAY_CENTER.y, MILKY_WAY_CENTER.z);

  /* --- The expanding matter ------------------------------------------ */
  const count = quality.bangParticles;
  const rand = random(4242);
  const dirs = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const axes = Array.from({ length: FILAMENTS }, () => {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    return new THREE.Vector3(Math.cos(phi) * ring, u, Math.sin(phi) * ring);
  });
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    if (rand() < 0.66) {
      // Streams: matter flung out along a filament, the way the cosmic web will later trace it.
      v.copy(axes[Math.floor(rand() * FILAMENTS)]).add(new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(0.11)).normalize();
      speeds[i] = 0.3 + Math.pow(rand(), 0.7) * 0.7;
    } else {
      // The rest billows out in every direction.
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      v.set(Math.cos(phi) * ring, u, Math.sin(phi) * ring);
      speeds[i] = 0.08 + Math.pow(rand(), 1.4) * 0.8;
    }
    dirs.set([v.x, v.y, v.z], i * 3);
    seeds[i] = rand();
    sizes[i] = 5 + rand() * rand() * rand() * 22;
  }
  const geometry = new THREE.BufferGeometry();
  // `position` is required by three; the shader derives the real position from `dir`.
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('dir', new THREE.BufferAttribute(dirs, 3));
  geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const uniforms = {
    uT: { value: -1 },
    uOpacity: { value: 1 },
    uPixelScale: { value: 900 },
    uMaxR: { value: MAX_RADIUS },
    uCenter: { value: center },
  };
  const matter = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  matter.frustumCulled = false;
  group.add(matter);

  /* --- Light: the point, the flash, the shock shells ------------------- */
  const sprite = (map: THREE.Texture, color: string) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.copy(center);
    s.renderOrder = 5;
    group.add(s);
    return s;
  };
  const point = sprite(glowTexture, '#FFF4E0');
  const flash = sprite(glowTexture, '#FFFFFF');

  const plasmaUniforms = { uT: { value: -1 }, uOpacity: { value: 1 }, uNoise: { value: noise } };
  const plasma = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ vertexShader: PLASMA_VERTEX, fragmentShader: PLASMA_FRAGMENT, uniforms: plasmaUniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }),
  );
  plasma.scale.setScalar(PLASMA_SIZE);
  plasma.position.copy(center);
  plasma.renderOrder = 4;
  plasma.frustumCulled = false;
  group.add(plasma);

  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  const update = (time: number, journey: number, viewportHeight: number, fov: number, camera: THREE.Camera) => {
    const presence = (time < BANG.end ? 1 : 0) * (1 - skipped(journey));
    group.visible = presence > 0.003;
    if (!group.visible) return;
    const t = time - BANG.ignite;
    uniforms.uT.value = t;
    plasmaUniforms.uT.value = t;
    plasmaUniforms.uOpacity.value = presence;
    plasma.quaternion.copy(camera.quaternion);
    uniforms.uOpacity.value = presence;
    uniforms.uPixelScale.value = (viewportHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);

    // Before ignition: a point of light gathering itself, trembling as it tightens.
    const gather = smoothstep(0.15, BANG.ignite, time);
    const tremble = 1 + 0.12 * Math.sin(time * 31) * gather;
    point.scale.setScalar((140 - 70 * gather) * tremble);
    point.material.opacity = (time < BANG.ignite ? 0.2 + 0.8 * gather : Math.max(0, 1 - t * 6)) * presence;

    // The flash: a white-out that blooms and burns off.
    const bloom = ease(t / 2.4);
    flash.scale.setScalar(500 + 6200 * bloom);
    flash.material.opacity = (t < 0 ? 0 : smoothstep(0, 0.06, t) * (1 - smoothstep(0.1, 2.2, t))) * presence;
  };

  const setDetail = (share: number) => geometry.setDrawRange(0, Math.floor(count * share));

  return { group, update, setDetail };
}
