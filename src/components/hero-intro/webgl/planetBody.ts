import * as THREE from 'three';
import type { Emblem } from '../solarSystem';

/* ------------------------------------------------------------------ */
/* The globe behind each technology: a procedural planet lit by the   */
/* Sun at the origin - banded, cloud-streaked surface, a soft         */
/* terminator and a bright atmosphere rim on the day side - with a    */
/* faint halo. The emblem floats in front of it as the planet's mark. */
/* ------------------------------------------------------------------ */

interface Palette {
  deep: string;
  light: string;
  haze: string;
}

/* Each world takes the colours of the technology it stands for. */
const PALETTES: Record<Emblem, Palette> = {
  c: { deep: '#142A5C', light: '#4C86D8', haze: '#7FB2FF' },
  web: { deep: '#5A2412', light: '#E0743A', haze: '#FFB27A' },
  java: { deep: '#3A1B1B', light: '#B8483E', haze: '#FF9A86' },
  tree: { deep: '#0B3A3C', light: '#2FA8A0', haze: '#7FE6DA' },
  bulb: { deep: '#4A3510', light: '#E8B24A', haze: '#FFE08A' },
  laptop: { deep: '#1E2636', light: '#6C7C99', haze: '#B7C6E4' },
  rocket: { deep: '#4A1620', light: '#D2493F', haze: '#FF9E8F' },
  trophy: { deep: '#4A3A0C', light: '#D9A93B', haze: '#FFE27A' },
  brackets: { deep: '#4D2108', light: '#F0802A', haze: '#FFC08A' },
  calendar: { deep: '#3A3A4A', light: '#C9BFA8', haze: '#F4EBD6' },
  podium: { deep: '#3E2410', light: '#B87A3E', haze: '#F0B982' },
  flag: { deep: '#202432', light: '#8A93A8', haze: '#D5DCEC' },
};

const VERTEX = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocal;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vLocal = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uLight;
uniform vec3 uHaze;
uniform float uSeed;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vLocal;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

void main() {
  vec3 n = normalize(vNormalW);
  vec3 toSun = normalize(-vPosW);
  vec3 view = normalize(cameraPosition - vPosW);
  vec3 p = vLocal * 2.2 + uSeed;

  float bands = sin(vLocal.y * 7.0 + fbm(p * 1.4) * 3.5 + uSeed) * 0.5 + 0.5;
  float clouds = fbm(p * 2.6 + vec3(uTime * 0.02, 0.0, 0.0));
  vec3 albedo = mix(uDeep, uLight, clamp(bands * 0.65 + clouds * 0.5, 0.0, 1.0));

  float lit = dot(n, toSun);
  float diffuse = smoothstep(-0.12, 0.9, lit);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);

  vec3 color = albedo * (0.07 + diffuse * 1.1);
  color += uHaze * rim * (0.2 + 1.0 * smoothstep(-0.3, 0.6, lit));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createPlanetBody(kind: Emblem, index: number, glowTexture: THREE.Texture) {
  const palette = PALETTES[kind];
  const group = new THREE.Group();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uDeep: { value: new THREE.Color(palette.deep) },
      uLight: { value: new THREE.Color(palette.light) },
      uHaze: { value: new THREE.Color(palette.haze) },
      uSeed: { value: index * 7.31 },
      uTime: { value: 0 },
    },
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), material);
  group.add(globe);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: palette.haze,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.scale.setScalar(3.6);
  group.add(halo);

  /* The globe turns slowly on a tilted axis, each at its own pace. */
  globe.rotation.z = 0.25 + (index % 4) * 0.1;
  const spin = 0.04 + (index % 5) * 0.012;
  const update = (time: number) => {
    globe.rotation.y = time * spin;
    material.uniforms.uTime.value = time;
  };

  return { group, update };
}
