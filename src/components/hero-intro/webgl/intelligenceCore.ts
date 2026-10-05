import * as THREE from 'three';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The SRKR intelligence core, built in layers from the outside in:   */
/*   dark glass shell -> brushed-metal ring with an emissive edge     */
/*   -> meridian brackets -> energy field -> embedded emblem -> light */
/* Render order matters: what sits inside the shell draws first, then */
/* the shell writes depth so orbits passing behind it are occluded.   */
/* ------------------------------------------------------------------ */

export const CORE_RADIUS = 1.2;
const ENERGY_RADIUS = 0.82;
const RING_RADIUS = 1.46;
const EMBLEM_SIZE = 1.05;
const EMBLEM_DEPTH = -0.3;
const GOLD = new THREE.Color('#FFA500');
const SOFT_WHITE = new THREE.Color('#F5F5F5');
const BEACON_SCALE = 3.4;
const RING_NOTCHES = 14;
const RING_SPIN = 0.06;
const EMBLEM_SWAY = 0.12;
const EMBLEM_FADE_NEAR = 1.0;
const EMBLEM_FADE_FAR = 2.2;

export const RENDER_ORDER = { energy: 1, emblem: 2, shell: 3, orbit: 4 } as const;

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/* Dark glass: mostly see-through, with a rim that catches light and one soft specular highlight. */
const shellFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform vec3 uRim;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float facing = abs(dot(n, vView));
    float rim = pow(1.0 - facing, 3.0);
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
    float spec = pow(max(dot(reflect(-lightDir, n), vView), 0.0), 60.0);
    vec3 color = mix(uTint, uRim, rim) + spec * uRim * 0.8;
    float alpha = (0.32 + rim * 0.55 + spec * 0.5) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/* Energy: brightest at its heart, with slow internal currents. Additive, so it reads as light. */
const energyFragment = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uWhite;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    float facing = abs(dot(normalize(vNormal), vView));
    float heart = pow(facing, 2.5);
    float current = 0.5 + 0.5 * sin(vLocal.y * 9.0 + uTime * 0.7 + sin(vLocal.x * 6.0 + uTime * 0.4) * 1.5);
    vec3 color = mix(uGold, uWhite, heart * heart);
    float alpha = (0.05 + heart * 0.42 + current * heart * 0.12) * uIntensity;
    gl_FragColor = vec4(color, alpha);
  }
`;

export interface CoreState {
  time: number;
  light: number;
  energy: number;
  beacon: number;
  cameraDistance: number;
}

export function createIntelligenceCore(options: {
  emblemTexture: THREE.Texture;
  glowTexture: THREE.Texture;
  environmentMap: THREE.Texture | null;
  quality: QualitySettings;
}) {
  const { emblemTexture, glowTexture, environmentMap, quality } = options;
  const group = new THREE.Group();
  const segments = quality.sphereSegments;

  const energyMaterial = new THREE.ShaderMaterial({
    vertexShader: fresnelVertex,
    fragmentShader: energyFragment,
    uniforms: { uGold: { value: GOLD }, uWhite: { value: SOFT_WHITE }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const energy = new THREE.Mesh(new THREE.SphereGeometry(ENERGY_RADIUS, segments, segments / 2), energyMaterial);
  energy.renderOrder = RENDER_ORDER.energy;
  group.add(energy);

  const emblemMaterial = new THREE.MeshBasicMaterial({
    map: emblemTexture,
    color: GOLD.clone().multiplyScalar(1.6),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const emblem = new THREE.Mesh(new THREE.PlaneGeometry(EMBLEM_SIZE, EMBLEM_SIZE), emblemMaterial);
  emblem.position.z = EMBLEM_DEPTH;
  emblem.renderOrder = RENDER_ORDER.emblem;
  group.add(emblem);

  const shellMaterial = new THREE.ShaderMaterial({
    vertexShader: fresnelVertex,
    fragmentShader: shellFragment,
    uniforms: {
      uTint: { value: new THREE.Color('#0b0b0c') },
      uRim: { value: SOFT_WHITE.clone().multiplyScalar(0.55) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(CORE_RADIUS, segments, segments / 2), shellMaterial);
  shell.renderOrder = RENDER_ORDER.shell;
  group.add(shell);

  /* Structure: a brushed-metal equatorial ring with a fine emissive edge, plus two meridian brackets. */
  const metal = new THREE.MeshStandardMaterial({
    color: '#3b352d',
    metalness: 0.9,
    roughness: 0.36,
    envMap: environmentMap,
    envMapIntensity: 0.55,
  });
  const matte = new THREE.MeshStandardMaterial({ color: '#141312', metalness: 0.6, roughness: 0.55, envMap: environmentMap, envMapIntensity: 0.2 });
  const structure = new THREE.Group();
  structure.rotation.x = Math.PI / 2 - 0.08;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 0.045, 16, quality.curveSegments), metal);
  structure.add(ring);
  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(RING_RADIUS + 0.047, 0.005, 6, quality.curveSegments),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.75, toneMapped: false }),
  );
  structure.add(edge);

  const notches = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.16, 0.1), metal, RING_NOTCHES);
  const notchMatrix = new THREE.Matrix4();
  for (let i = 0; i < RING_NOTCHES; i++) {
    const angle = (i / RING_NOTCHES) * Math.PI * 2;
    notchMatrix.makeRotationZ(angle).setPosition(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, 0);
    notches.setMatrixAt(i, notchMatrix);
  }
  structure.add(notches);
  group.add(structure);

  const bracketGeometry = new THREE.TorusGeometry(CORE_RADIUS + 0.12, 0.022, 10, Math.round(quality.curveSegments / 2), Math.PI * 0.8);
  [0.35, Math.PI + 0.35].forEach((yaw) => {
    const bracket = new THREE.Mesh(bracketGeometry, matte);
    bracket.rotation.set(0, yaw, Math.PI * 0.6);
    group.add(bracket);
  });

  const light = new THREE.PointLight('#FF8A1F', 0, 0, 2);
  group.add(light);

  /* The distant beacon - unaffected by fog, so it is the first thing seen in the dark. */
  const beacon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: '#FFC266',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  beacon.scale.setScalar(BEACON_SCALE);
  group.add(beacon);

  const update = (state: CoreState) => {
    energyMaterial.uniforms.uTime.value = state.time;
    energyMaterial.uniforms.uIntensity.value = state.energy;
    light.intensity = state.light;
    beacon.material.opacity = state.beacon;
    structure.rotation.z = state.time * RING_SPIN;
    emblem.rotation.y = Math.sin(state.time * 0.4) * EMBLEM_SWAY;
    // The emblem dissolves into the light once the camera is inside the shell.
    const emblemVisibility = THREE.MathUtils.smoothstep(state.cameraDistance, EMBLEM_FADE_NEAR, EMBLEM_FADE_FAR);
    emblemMaterial.opacity = emblemVisibility;
    emblem.visible = emblemVisibility > 0.01;
  };

  return { group, update };
}
