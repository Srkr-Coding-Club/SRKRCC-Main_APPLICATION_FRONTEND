import * as THREE from 'three';
import { smoothstep } from '../introMath';
import { MILKY_WAY_CENTER as CENTER } from '../solarSystem';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The prologue: the journey opens among galaxies. Our own Milky Way   */
/* hangs in front of the viewer - a bright bulge, spiral arms of       */
/* thousands of stars, pink star-forming knots - with other galaxies   */
/* of different kinds scattered behind it. Scrolling dives toward a    */
/* point in one of the Milky Way's arms; that point, marked by a       */
/* pulsing beacon, is the Sun (the system's origin).                   */
/*                                                                     */
/* Stars are GPU points with a capped on-screen size, so they stay     */
/* crisp from afar and never swell into blobs up close. The whole      */
/* layer fades out once the camera is inside our solar system.         */
/* ------------------------------------------------------------------ */

type Kind = 'spiral' | 'barred' | 'elliptical' | 'irregular';

interface GalaxySpec {
  kind: Kind;
  position: [number, number, number];
  radius: number;
  arms: number;
  twist: number;
  /* Tilt of the disc out of the horizontal, and its spin about the vertical (radians). */
  tilt: number;
  spin: number;
  core: string;
  rim: string;
  /* Share of the quality budget; the Milky Way gets the most. */
  share: number;
  /* Rotation, radians per second at the rim (the core turns up to 2.2 times faster). */
  turn: number;
}

/* The Milky Way's centre, and the Sun's place in it. The Sun is the origin, 1300 units out in an arm. */
const MILKY_WAY_CENTER = new THREE.Vector3(CENTER.x, CENTER.y, CENTER.z);
const SUN_ORBIT_RADIUS = Math.hypot(MILKY_WAY_CENTER.x, MILKY_WAY_CENTER.z);
const MILKY_WAY_RADIUS = 2400;
const MILKY_WAY_ARMS = 4;
const MILKY_WAY_TWIST = 5.0;
const MILKY_WAY_TILT = 0.38;

const GALAXIES: GalaxySpec[] = [
  { kind: 'spiral', position: [MILKY_WAY_CENTER.x, 0, MILKY_WAY_CENTER.z], radius: MILKY_WAY_RADIUS, arms: MILKY_WAY_ARMS, twist: MILKY_WAY_TWIST, tilt: MILKY_WAY_TILT, spin: 0, core: '#FFD9A0', rim: '#9DBBFF', share: 1.7, turn: 0.011 },
  { kind: 'spiral', position: [3600, 700, -6200], radius: 2300, arms: 2, twist: 5.6, tilt: 1.0, spin: 0.6, core: '#FFE2B8', rim: '#B9A6FF', share: 0.5, turn: 0.007 },
  { kind: 'barred', position: [-4300, -500, -4800], radius: 1700, arms: 2, twist: 4.6, tilt: 0.8, spin: -0.5, core: '#FFC98A', rim: '#7FE0D6', share: 0.45, turn: 0.008 },
  { kind: 'elliptical', position: [5200, -900, -2400], radius: 1100, arms: 0, twist: 0, tilt: 0.3, spin: 0.2, core: '#FFB878', rim: '#FF9A5C', share: 0.3, turn: 0 },
  { kind: 'spiral', position: [-1800, 1900, -9200], radius: 1500, arms: 3, twist: 4.2, tilt: 1.25, spin: 1.1, core: '#FFE9C8', rim: '#8FC6FF', share: 0.35, turn: 0.006 },
  { kind: 'spiral', position: [1700, 2300, -8200], radius: 1000, arms: 2, twist: 5.8, tilt: 0.5, spin: -1.0, core: '#FFD2A0', rim: '#FFB0D6', share: 0.25, turn: 0.006 },
  // Two small irregular companions of the Milky Way, like the Magellanic Clouds.
  { kind: 'irregular', position: [-3150, -380, -2300], radius: 430, arms: 0, twist: 0, tilt: 0, spin: 0, core: '#DCE8FF', rim: '#9CC4FF', share: 0.12, turn: 0 },
  { kind: 'irregular', position: [-2150, 420, -3150], radius: 330, arms: 0, twist: 0, tilt: 0, spin: 0, core: '#FFE3F0', rim: '#FFA8D0', share: 0.09, turn: 0 },
];

/* Particles per unit of the star budget: a galaxy of share 1 gets starCount * this. */
const STARS_PER_BUDGET = 9;

/* Seeded generator so every visit draws the same sky. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

/* Direction of the Sun from the Milky Way's centre, in the disc's own frame. */
const SUN_ANGLE = Math.atan2(-MILKY_WAY_CENTER.z, -MILKY_WAY_CENTER.x);

/* The arms' starting angle: the Milky Way's first arm passes through the Sun; a bar runs along 0 so arms spring from its ends. */
function armPhase(spec: GalaxySpec, index: number) {
  if (index === 0) return SUN_ANGLE - armWinding(SUN_ORBIT_RADIUS, spec.radius, spec.twist);
  if (spec.kind === 'barred') return 0;
  return rng(500 + index)() * Math.PI * 2;
}

/* How far round a spiral arm has wound at radius r: tight near the core, opening out. */
const armWinding = (r: number, R: number, twist: number) => (twist * Math.log(1 + r / (0.12 * R))) / Math.log(1 + 1 / 0.12);

function buildStars(spec: GalaxySpec, count: number, seed: number, phase: number) {
  const random = rng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const R = spec.radius;
  const core = new THREE.Color(spec.core);
  const rim = new THREE.Color(spec.rim);
  const white = new THREE.Color('#F4F7FF');
  const pink = new THREE.Color('#FF7FBF');
  const old = new THREE.Color('#FFC987');
  const color = new THREE.Color();
  const scale = R / MILKY_WAY_RADIUS;
  const disc = R * 0.3; // exponential scale length of the disc

  // Irregular galaxies are a few lumpy clouds rather than a disc.
  const lumps = Array.from({ length: 6 }, () => ({
    x: gaussian(random) * R * 0.35,
    y: gaussian(random) * R * 0.12,
    z: gaussian(random) * R * 0.35,
    s: R * (0.1 + random() * 0.16),
  }));

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;
    let t: number; // 0 = core, 1 = rim, for colour
    let knot = false;
    let haze = false;
    let field = false;

    const roll = random();
    if (spec.kind === 'irregular') {
      const lump = lumps[Math.floor(random() * lumps.length)];
      x = lump.x + gaussian(random) * lump.s;
      y = lump.y + gaussian(random) * lump.s * 0.6;
      z = lump.z + gaussian(random) * lump.s;
      t = Math.min(1, Math.hypot(x, z) / R);
      knot = random() < 0.08;
      haze = random() < 0.3;
    } else if (spec.kind === 'elliptical') {
      // A smooth, old, glowing ball, flattened a little and brightest in the middle.
      const rad = R * 0.5 * Math.pow(random(), 1.6);
      const u = random() * 2 - 1;
      const phi = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      x = Math.cos(phi) * ring * rad * 1.3;
      y = u * rad * 0.8;
      z = Math.sin(phi) * ring * rad * 0.95;
      t = Math.min(1, rad / (R * 0.5));
      haze = random() < 0.25;
    } else if (roll < 0.13) {
      // The bulge: old yellow stars packed round the core.
      const sigma = R * 0.075;
      x = gaussian(random) * sigma;
      y = gaussian(random) * sigma * 0.65;
      z = gaussian(random) * sigma;
      t = Math.min(1, Math.hypot(x, y, z) / (R * 0.45));
      haze = random() < 0.25;
    } else if (roll < 0.17) {
      // A thin halo of old stars round the whole galaxy.
      x = gaussian(random) * R * 0.42;
      y = gaussian(random) * R * 0.2;
      z = gaussian(random) * R * 0.42;
      t = 0.55;
      field = true;
    } else if (spec.kind === 'barred' && roll < 0.3) {
      // The bar: a straight band of stars through the core.
      const along = (random() * 2 - 1) * R * 0.42;
      x = along;
      z = gaussian(random) * R * 0.04;
      y = gaussian(random) * R * 0.022;
      t = Math.abs(along) / (R * 0.5);
    } else {
      // Exponential disc: dense and bright toward the middle, thinning outward.
      const r = Math.min(R, -disc * Math.log(1 - random() * (1 - Math.exp(-R / disc))));
      const onArm = random() < 0.72;
      const arm = Math.floor(random() * Math.max(1, spec.arms));
      const base = spec.kind === 'barred' ? Math.PI * arm : (arm * Math.PI * 2) / Math.max(1, spec.arms);
      const wound = armWinding(r, R, spec.twist);
      // Arm stars hug the arm's crest; the rest fill the gaps between arms, dimmer and older.
      const scatter = onArm ? 0.05 + 0.1 * (r / R) : Math.PI;
      const angle = phase + base + wound + gaussian(random) * scatter;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      y = gaussian(random) * R * (0.008 + 0.022 * (1 - r / R));
      t = r / R;
      field = !onArm;
      knot = onArm && random() < 0.05 && r > R * 0.2;
      haze = onArm && random() < 0.12;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Old stars glow yellow in the core, young ones blue-white along the arms, with pink star-forming knots.
    if (t < 0.45) color.copy(core).lerp(white, t / 0.45);
    else color.copy(white).lerp(rim, (t - 0.45) / 0.55);
    if (field) color.lerp(old, 0.45);
    if (knot) color.lerp(pink, 0.85);
    let brightness = (knot ? 1.15 : 0.3) + random() * random() * 0.95;
    if (field) brightness *= 0.5;
    if (haze) brightness *= 0.16;
    color.multiplyScalar(brightness * (0.7 + 0.6 * (1 - t)));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Mostly pinpoints, a few bright giants, and big soft discs for the unresolved haze of starlight.
    const pointSize = haze ? 22 + random() * 16 : 4.5 + random() * random() * random() * 24 + (knot ? 10 : 0);
    sizes[i] = pointSize * scale;
  }
  return { positions, colors, sizes };
}

const VERTEX = /* glsl */ `
attribute vec3 color;
attribute float size;
uniform float uOpacity;
uniform float uPixelScale;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uPixelScale / max(-mv.z, 1.0), 1.0, 7.0);
  vColor = color * uOpacity;
}`;

/* Galaxy stars turn about the disc's axis, faster near the core than at the rim (so the galaxy */
/* visibly rotates without its arms winding up), and the brighter ones twinkle.                  */
const STAR_VERTEX = /* glsl */ `
attribute vec3 color;
attribute float size;
uniform float uOpacity;
uniform float uPixelScale;
uniform float uSpin;
uniform float uRadius;
uniform float uTime;
varying vec3 vColor;
void main() {
  float r = length(position.xz) / uRadius;
  float a = uSpin * (1.0 + 1.2 * exp(-r / 0.25));
  float c = cos(a);
  float s = sin(a);
  vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uPixelScale / max(-mv.z, 1.0), 1.0, 7.0);
  float seed = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float twinkle = 0.82 + 0.18 * sin(uTime * (1.2 + seed * 3.0) + seed * 40.0);
  vColor = color * uOpacity * twinkle;
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a, a);
}`;

/* The glow of a galaxy as light and shadow: spiral arms feathered with noise, a bright bulge or bar,  */
/* clumps of star formation, and dark dust lanes on the inner edge of each arm. Light is added and   */
/* dust darkens what is behind (premultiplied alpha), so lanes read against the bulge and the sky.  */
const DISC_VERTEX = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DISC_FRAGMENT = /* glsl */ `
varying vec2 vP;
uniform float uSpin;
uniform float uOpacity;
uniform float uArms;
uniform float uTwist;
uniform float uPhase;
uniform float uSeed;
uniform float uKind;
uniform vec3 uCore;
uniform vec3 uRim;
uniform sampler2D uNoise;

float winding(float r) {
  return uTwist * log(1.0 + r / 0.12) / log(1.0 + 1.0 / 0.12);
}
float spinAt(float r) {
  return uSpin * (1.0 + 1.2 * exp(-r / 0.25));
}

void main() {
  vec2 p = vP;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(-p.y, p.x);
  float edge = smoothstep(1.0, 0.8, r);
  vec3 body = mix(uCore, uRim, smoothstep(0.05, 0.8, r));
  vec3 light = vec3(0.0);
  float dust = 0.0;

  if (uKind > 1.5 && uKind < 2.5) {
    // Elliptical: a smooth, old, glowing ball with a faint mottling.
    float ball = exp(-pow(r / 0.3, 1.1));
    float mott = 0.85 + 0.3 * texture2D(uNoise, p * 0.85 + uSeed * 0.013).a;
    light = mix(uCore, uRim, smoothstep(0.0, 0.7, r)) * ball * mott * 1.15;
  } else if (uKind > 2.5) {
    // Irregular: lumpy clouds of young stars.
    float lump = pow(texture2D(uNoise, p * 0.4 + uSeed * 0.013).r, 2.4) * 2.2;
    float knots = pow(texture2D(uNoise, p * 1.1 + 0.3 - uSeed * 0.017).g, 3.5) * 2.0;
    light = (mix(uRim, uCore, 0.35) * lump + vec3(1.0, 0.5, 0.78) * knots * 0.6) * smoothstep(1.0, 0.25, r);
  } else {
    float s = a - uPhase - winding(r) - spinAt(r);
    // Noise is sampled in the galaxy's own turning frame (never in raw angle, which would leave a seam).
    float sp = spinAt(r);
    vec2 pr = vec2(p.x * cos(sp) - p.y * sin(sp), p.x * sin(sp) + p.y * cos(sp));
    float warp = (texture2D(uNoise, pr * 0.75 + uSeed * 0.011).r - 0.5) * 0.85 * smoothstep(0.08, 0.5, r);
    float arm = pow(0.5 + 0.5 * cos(uArms * (s + warp)), 2.4);
    float disc = exp(-r / 0.3) * (0.22 + 0.95 * arm) * edge;
    float bulge = exp(-pow(r / 0.11, 0.9));

    // The bar of a barred galaxy, along the disc's own x axis, turning with the core.
    float bar = 0.0;
    if (uKind > 0.5 && uKind < 1.5) {
      float ba = spinAt(0.15);
      vec2 d = vec2(cos(ba), -sin(ba));
      float along = dot(p, d);
      float across = dot(p, vec2(-d.y, d.x));
      bar = exp(-pow(abs(along) / 0.42, 4.0)) * exp(-pow(across / 0.065, 2.0));
    }

    // Clumps of star formation strung along the arms.
    float clump = pow(texture2D(uNoise, pr * 1.9 + 0.37 + uSeed * 0.013).g, 3.0) * arm * smoothstep(0.1, 0.3, r) * smoothstep(1.0, 0.5, r);
    light = body * disc * 0.95 + uCore * bulge * 1.25 + vec3(1.0, 0.42, 0.72) * clump * 0.9 + uCore * bar * 1.1;

    // Dust lanes hug the inner edge of each arm and thicken toward the bulge.
    float lane = pow(0.5 + 0.5 * cos(uArms * (s + warp + 0.5)), 5.0);
    dust = lane * smoothstep(0.05, 0.2, r) * exp(-r / 0.5) * (0.35 + 0.65 * texture2D(uNoise, pr * 2.0 + 0.71 + uSeed * 0.009).b) * edge;
  }

  gl_FragColor = vec4(light * uOpacity, clamp(dust * 0.7, 0.0, 0.8) * uOpacity);
}`;

/* A ring and dot: "you are here". */
function createBeaconTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.strokeStyle = 'rgba(255,190,110,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,190,1)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* The layer fades out as the camera comes inside our solar system. */
export const galaxyPresence = (progress: number) => 1 - smoothstep(0.06, 0.11, progress);

/* Hundreds of faint, far-off smudges: the deep field behind everything else. */
function buildDeepField(count: number) {
  const random = rng(77);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const tint = new THREE.Color();
  const palette = ['#FFD9A8', '#FFE9D0', '#BBD2FF', '#E4D2FF', '#FFC0A0'];
  for (let i = 0; i < count; i++) {
    const radius = 11000 + random() * 8000;
    const u = random() * 2 - 1;
    const phi = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    positions[i * 3] = MILKY_WAY_CENTER.x + Math.cos(phi) * ring * radius;
    positions[i * 3 + 1] = u * radius * 0.7;
    positions[i * 3 + 2] = MILKY_WAY_CENTER.z + Math.sin(phi) * ring * radius;
    tint.set(palette[Math.floor(random() * palette.length)]).multiplyScalar(0.14 + random() * random() * 0.5);
    colors.set([tint.r, tint.g, tint.b], i * 3);
    sizes[i] = 60 + random() * random() * 180;
  }
  return { positions, colors, sizes };
}

export function createGalaxies(quality: QualitySettings, glowTexture: THREE.Texture, noise: THREE.Texture) {
  const group = new THREE.Group();
  const opacityUniform = { value: 1 };
  const pixelScale = { value: 900 };
  const discs: Array<{ body: THREE.Object3D; uniforms: { uOpacity: { value: number } }; star: { uSpin: { value: number }; uTime: { value: number } }; turn: number }> = [];
  const worldCenter = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const drawn: Array<{ geometry: THREE.BufferGeometry; count: number }> = [];
  const worldNormal = new THREE.Vector3();
  const sprites: THREE.Sprite[] = [];

  GALAXIES.forEach((spec, index) => {
    const count = Math.round(quality.starCount * STARS_PER_BUDGET * spec.share * quality.galaxyDetail);
    const phase = armPhase(spec, index);
    const { positions, colors, sizes } = buildStars(spec, count, 1000 + index * 97, phase);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const starUniforms = { uOpacity: opacityUniform, uPixelScale: pixelScale, uSpin: { value: 0 }, uRadius: { value: spec.radius }, uTime: { value: 0 } };
    const material = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    drawn.push({ geometry, count });

    // The luminous disc under the stars: lying in the disc's plane, premultiplied so dust can darken.
    const kind = { spiral: 0, barred: 1, elliptical: 2, irregular: 3 }[spec.kind];
    const discUniforms = {
      uSpin: starUniforms.uSpin,
      uOpacity: { value: 1 },
      uArms: { value: Math.max(1, spec.arms) },
      uTwist: { value: spec.twist },
      uPhase: { value: phase },
      uSeed: { value: index * 13.7 },
      uKind: { value: kind },
      uCore: { value: new THREE.Color(spec.core) },
      uRim: { value: new THREE.Color(spec.rim) },
      uNoise: { value: noise },
    };
    const discMaterial = new THREE.ShaderMaterial({
      vertexShader: DISC_VERTEX,
      fragmentShader: DISC_FRAGMENT,
      uniforms: discUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 2.04), discMaterial);
    disc.rotation.x = -Math.PI / 2;
    disc.frustumCulled = false;
    disc.renderOrder = -1;
    // The plane's own coordinates are in disc radii, so the shader needs no scale.
    disc.scale.setScalar(spec.radius);
    discs.push({ body: null as unknown as THREE.Object3D, uniforms: discUniforms, star: starUniforms, turn: spec.turn });
    const record = discs[discs.length - 1];

    // Disc geometry is built flat; `body` tilts it (about the axis toward the Sun for the Milky Way, so the Sun stays in the disc).
    const body = new THREE.Group();
    record.body = body;
    body.add(disc, points);
    const glow = (color: string, scale: number, opacity: number) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
      );
      sprite.scale.setScalar(spec.radius * scale);
      sprite.userData.base = opacity;
      sprites.push(sprite);
      body.add(sprite);
    };
    glow(spec.core, spec.kind === 'elliptical' ? 1.5 : 0.55, 0.5);
    glow(spec.rim, 2.3, 0.1);

    const holder = new THREE.Group();
    holder.position.set(...spec.position);
    if (index === 0) {
      const axis = new THREE.Vector3(-MILKY_WAY_CENTER.x, 0, -MILKY_WAY_CENTER.z).normalize();
      body.quaternion.setFromAxisAngle(axis, spec.tilt);
    } else {
      body.rotation.set(spec.tilt, 0, 0);
      holder.rotation.y = spec.spin;
    }
    holder.add(body);
    group.add(holder);
  });

  {
    const field = buildDeepField(Math.round(quality.starCount * 0.5));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(field.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(field.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(field.sizes, 1));
    const points = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { uOpacity: opacityUniform, uPixelScale: pixelScale },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    points.frustumCulled = false;
    group.add(points);
  }

  // The beacon marks the Sun while it is still a speck among the stars.
  const beacon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createBeaconTexture(), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }),
  );
  beacon.renderOrder = 10;
  group.add(beacon);

  /* `reveal` (0-1) is the universe's birth: the galaxies fly out from the Big Bang's centre and brighten. */
  const update = (time: number, progress: number, camera: THREE.Vector3, viewportHeight: number, fov: number, reveal = 1) => {
    const presence = galaxyPresence(progress) * reveal;
    group.visible = presence > 0.003;
    if (!group.visible) return;
    opacityUniform.value = presence;
    const grown = 0.1 + 0.9 * (1 - Math.pow(1 - reveal, 3));
    group.scale.setScalar(grown);
    group.position.set(MILKY_WAY_CENTER.x * (1 - grown), 0, MILKY_WAY_CENTER.z * (1 - grown));
    // Pixels per world unit at distance 1, so point sizes are in world units.
    pixelScale.value = (viewportHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    sprites.forEach((sprite) => (sprite.material.opacity = sprite.userData.base * presence));
    // The stars turn (trailing their arms, faster near the core); twinkle runs on the same clock. A disc
    // you are close to the plane of fades, so flying into the galaxy never smears a glowing sheet across the view.
    discs.forEach((entry) => {
      entry.star.uSpin.value = -time * entry.turn;
      entry.star.uTime.value = time;
      entry.body.updateWorldMatrix(true, false);
      worldCenter.setFromMatrixPosition(entry.body.matrixWorld);
      worldNormal.set(0, 1, 0).transformDirection(entry.body.matrixWorld);
      const height = Math.abs(worldNormal.dot(toCamera.copy(worldCenter).sub(camera)));
      entry.uniforms.uOpacity.value = presence * smoothstep(140, 650, height);
    });

    // Constant on-screen size, a slow pulse, gone as the camera arrives at the Sun.
    const distance = camera.length();
    const arrive = 1 - smoothstep(0.035, 0.06, progress);
    const pulse = 1 + 0.18 * Math.sin(time * 2.4);
    beacon.scale.setScalar(distance * 0.05 * pulse);
    beacon.material.opacity = 0.9 * arrive * presence * smoothstep(0.9, 1, reveal);
  };

  /* Draw only a share of the stars (they are stored in random order, so any prefix is a fair sample). */
  const setDetail = (share: number) => drawn.forEach(({ geometry, count }) => geometry.setDrawRange(0, Math.floor(count * share)));

  return { group, update, setDetail };
}
