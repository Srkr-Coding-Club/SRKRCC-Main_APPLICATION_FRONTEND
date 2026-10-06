import * as THREE from 'three';
import { planetPosition, type PlanetSpec } from '../solarSystem';
import { NOISE_GLSL } from './noise';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* A planet, rendered the way space photography sees one: a single    */
/* light (the Sun at the origin), a soft day/night terminator, a thin */
/* atmosphere that scatters light along the sunlit limb, and real     */
/* surface families - cratered rock, ocean worlds with ice caps,      */
/* clouds and city lights, banded gas giants with a great storm, hazy */
/* ice giants, and a lava world whose cracks glow. Each planet spins  */
/* on a tilted axis, its clouds drift faster than its surface, its    */
/* moons orbit it, and it travels round the Sun as the journey moves. */
/* ------------------------------------------------------------------ */

const SURFACE_STYLE: Record<PlanetSpec['surface'], number> = { rocky: 0, terran: 1, gas: 2, ice: 3, lava: 4 };
/* Spin (radians per second) by surface: giants turn fastest, rocky worlds slowest. */
const SPIN: Record<PlanetSpec['surface'], number> = { rocky: 0.05, terran: 0.09, gas: 0.16, ice: 0.12, lava: 0.07 };
const CLOUD_DRIFT = 0.035;
const CLOUD_ALTITUDE = 1.012;
const ATMOSPHERE_ALTITUDE = 1.06;
const MOON_COLOR = '#8E8A85';

const vertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform vec3 uAtmosphere;
  uniform float uAtmosphereStrength;
  uniform float uStyle;
  uniform float uSeed;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;
  ${NOISE_GLSL}
  void main() {
    vec3 p = normalize(vLocal);
    vec3 s = p + vec3(uSeed);
    vec3 n = normalize(vNormal);
    vec3 L = normalize(-vWorld);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndl = dot(n, L);
    vec3 albedo;
    float wet = 0.0;
    vec3 glow = vec3(0.0);

    if (uStyle < 0.5) {
      // Rocky: highlands and maria, craters with bright rims, fine regolith grain.
      float h = fbm(s * 2.6);
      float c1 = noise3(s * 7.0);
      float craters = smoothstep(0.64, 0.7, c1) * 0.6 + smoothstep(0.68, 0.72, noise3(s * 19.0)) * 0.4;
      float rims = smoothstep(0.6, 0.63, c1) - smoothstep(0.64, 0.66, c1);
      albedo = mix(uSecondary, uPrimary, smoothstep(0.32, 0.68, h));
      albedo = mix(albedo, uAccent, craters * 0.7);
      albedo += uPrimary * rims * 0.3;
      albedo *= 0.8 + fbm(s * 11.0) * 0.4;
    } else if (uStyle < 1.5) {
      // Ocean world: continents with mountain chains, deserts toward the equator, shallows, ice caps, city lights.
      float h = fbm(s * 2.2) * 0.75 + ridged(s * 5.0) * 0.25;
      float land = smoothstep(0.545, 0.565, h);
      float lat = abs(p.y);
      float dry = smoothstep(0.42, 0.7, fbm(s * 4.0 + 7.0)) * (1.0 - smoothstep(0.55, 0.8, lat));
      vec3 ground = mix(uPrimary, uAccent, dry);
      ground = mix(ground, ground * 0.65 + vec3(0.05), smoothstep(0.62, 0.72, h));
      vec3 sea = mix(uSecondary * 0.55, uSecondary * 1.3, smoothstep(0.38, 0.55, h));
      albedo = mix(sea, ground, land);
      float ice = smoothstep(0.86, 0.9, lat + (fbm(s * 6.0) - 0.5) * 0.12);
      albedo = mix(albedo, vec3(0.88, 0.91, 0.95), ice);
      wet = (1.0 - land) * (1.0 - ice);
      float cities = land * (1.0 - ice) * smoothstep(0.62, 0.8, noise3(s * 70.0)) * smoothstep(0.45, 0.65, fbm(s * 9.0 + 3.0));
      glow = vec3(1.0, 0.7, 0.38) * cities * 0.9 * (1.0 - smoothstep(-0.15, 0.05, ndl));
    } else if (uStyle < 2.5) {
      // Gas giant: turbulent latitude bands drifting with time, fine striations, one great storm.
      float swirl = fbm(vec3(p.x * 3.0, p.y * 10.0, p.z * 3.0) + vec3(uTime * 0.03, 0.0, 0.0) + uSeed);
      float y = p.y + (swirl - 0.5) * 0.12;
      float bands = sin(y * 22.0 + uSeed) * 0.5 + 0.5;
      float fine = sin(y * 70.0 + swirl * 4.0) * 0.5 + 0.5;
      albedo = mix(uSecondary, uPrimary, smoothstep(0.2, 0.8, bands));
      albedo = mix(albedo, uAccent, smoothstep(0.75, 0.95, fine) * 0.25);
      vec3 eye = normalize(vec3(0.55, -0.32, 0.77));
      float spot = 1.0 - smoothstep(0.1, 0.17, length((p - eye) * vec3(1.0, 2.0, 1.0)));
      albedo = mix(albedo, uAccent * (0.85 + fbm(p * 18.0 + uSeed) * 0.3), spot * 0.9);
    } else if (uStyle < 3.5) {
      // Ice giant: smooth methane haze with faint bands and bright high clouds.
      float haze = fbm(vec3(p.x * 2.0, p.y * 6.0, p.z * 2.0) + uSeed + vec3(uTime * 0.02, 0.0, 0.0));
      float y = p.y + (haze - 0.5) * 0.1;
      albedo = mix(uSecondary, uPrimary, smoothstep(-0.6, 0.6, sin(y * 7.0 + uSeed) * 0.4 + haze * 0.9 - 0.2));
      albedo = mix(albedo, uAccent, smoothstep(0.62, 0.8, fbm(s * 5.0 + vec3(uTime * 0.04, 0.0, 0.0))) * 0.45);
      wet = 0.25;
    } else {
      // Lava world: dark basalt crust split by glowing, slowly pulsing magma cracks.
      float h = fbm(s * 3.0);
      float crack = smoothstep(0.82, 0.97, ridged(s * 3.4));
      albedo = mix(uSecondary, uPrimary, smoothstep(0.3, 0.7, h)) * (1.0 - crack * 0.8);
      float pulse = 0.8 + 0.2 * sin(uTime * 1.4 + h * 10.0);
      glow = uAccent * (crack * 2.2 + smoothstep(0.7, 0.82, h) * 0.5) * pulse;
    }

    // One light: the Sun. A slightly softened terminator, specular glint on water, and the
    // atmosphere scattering sunlight along the lit limb.
    vec3 sunlight = vec3(1.0, 0.95, 0.88) * 1.35;
    float diffuse = clamp((ndl + 0.04) / 1.04, 0.0, 1.0);
    vec3 color = albedo * (diffuse * sunlight + 0.02);
    vec3 H = normalize(L + V);
    color += sunlight * wet * pow(max(dot(n, H), 0.0), 140.0) * 0.4 * step(0.0, ndl);
    float limb = pow(1.0 - max(dot(n, V), 0.0), 2.2);
    color += uAtmosphere * limb * uAtmosphereStrength * smoothstep(-0.3, 0.45, ndl);
    color += glow;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudFragment = /* glsl */ `
  uniform float uSeed;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;
  ${NOISE_GLSL}
  void main() {
    vec3 p = normalize(vLocal);
    // Domain-warped noise, stretched along latitude: weather systems and streaks, not blobs.
    vec3 q = vec3(p.x * 4.2, p.y * 7.0, p.z * 4.2) + vec3(uSeed);
    float c = fbm(q + fbm(q * 1.7 + 4.0) * 1.4);
    float cover = smoothstep(0.56, 0.74, c) * (0.55 + 0.45 * smoothstep(0.35, 0.65, fbm(p * 2.0 + uSeed)));
    float diffuse = clamp((dot(normalize(vNormal), normalize(-vWorld)) + 0.04) / 1.04, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.95) * (diffuse * 1.3 + 0.01), cover * 0.8);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* A thin shell just above the surface, seen from inside out: brightest at the planet's limb, */
/* fading to nothing at the shell's edge, and only where sunlight reaches it.                  */
const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uThickness;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float depth = smoothstep(0.0, uThickness, -dot(n, V));
    float lit = smoothstep(-0.25, 0.5, dot(n, normalize(-vWorld)));
    gl_FragColor = vec4(uColor * depth * lit * uIntensity, 1.0);
    #include <colorspace_fragment>
  }
`;

/* Rings: many fine bands with a dark division, faded at both edges, in the planet's shadow behind it. */
const ringVertex = /* glsl */ `
  varying vec2 vPlane;
  varying vec3 vWorld;
  void main() {
    vPlane = position.xy;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uCenter;
  uniform float uRadius;
  varying vec2 vPlane;
  varying vec3 vWorld;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    float t = clamp((length(vPlane) - uInner) / (uOuter - uInner), 0.0, 1.0);
    float bands = (0.45 + 0.55 * hash(floor(t * 40.0) + uSeed)) * (0.7 + 0.3 * hash(floor(t * 140.0) + uSeed * 3.0));
    float division = smoothstep(0.58, 0.6, t) * (1.0 - smoothstep(0.64, 0.66, t));
    float edges = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
    vec3 toSun = normalize(-vWorld);
    vec3 toCenter = uCenter - vWorld;
    float along = dot(toCenter, toSun);
    float shadow = along > 0.0 ? smoothstep(uRadius * 0.95, uRadius * 1.05, length(toCenter - toSun * along)) : 1.0;
    vec3 color = uColor * (0.12 + 0.95 * shadow) * (0.85 + bands * 0.3);
    gl_FragColor = vec4(color, bands * edges * (1.0 - division * 0.9) * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createPlanet(spec: PlanetSpec, index: number, quality: QualitySettings) {
  const group = new THREE.Group();
  const axis = new THREE.Group();
  axis.rotation.z = spec.tilt;
  group.add(axis);
  const segments = quality.sphereSegments;
  const r = spec.radius;
  const seed = index * 3.17;

  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: surfaceFragment,
    uniforms: {
      uPrimary: { value: new THREE.Color(spec.palette.primary) },
      uSecondary: { value: new THREE.Color(spec.palette.secondary) },
      uAccent: { value: new THREE.Color(spec.palette.accent) },
      uAtmosphere: { value: new THREE.Color(spec.palette.atmosphere) },
      uAtmosphereStrength: { value: spec.atmosphere },
      uStyle: { value: SURFACE_STYLE[spec.surface] },
      uSeed: { value: seed },
      uTime: { value: 0 },
    },
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(r, segments, segments / 2), surfaceMaterial);
  axis.add(surface);

  let clouds: THREE.Mesh | null = null;
  if (spec.clouds) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(r * CLOUD_ALTITUDE, segments, segments / 2),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: cloudFragment,
        uniforms: { uSeed: { value: seed + 11.0 } },
        transparent: true,
        depthWrite: false,
      }),
    );
    axis.add(clouds);
  }

  if (spec.atmosphere > 0.15) {
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uColor: { value: new THREE.Color(spec.palette.atmosphere) },
        uIntensity: { value: spec.atmosphere },
        // How far -dot(n, V) reaches at the planet's limb on a shell of this altitude.
        uThickness: { value: Math.sqrt(1 - 1 / (ATMOSPHERE_ALTITUDE * ATMOSPHERE_ALTITUDE)) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(r * ATMOSPHERE_ALTITUDE, segments, segments / 2), atmosphereMaterial));
  }

  let ringCenter: THREE.Vector3 | null = null;
  if (spec.ring) {
    const inner = r * spec.ring.inner;
    const outer = r * spec.ring.outer;
    ringCenter = new THREE.Vector3();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, quality.curveSegments, 1),
      new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: {
          uColor: { value: new THREE.Color(spec.ring.color) },
          uInner: { value: inner },
          uOuter: { value: outer },
          uSeed: { value: seed },
          uOpacity: { value: spec.ring.opacity },
          uCenter: { value: ringCenter },
          uRadius: { value: r },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    // In the planet's equatorial plane, so it shares the axial tilt.
    ring.rotation.x = -Math.PI / 2;
    axis.add(ring);
  }

  const moons: Array<{ pivot: THREE.Group; speed: number }> = [];
  if (spec.moons) {
    const moonMaterial = new THREE.MeshStandardMaterial({ color: MOON_COLOR, roughness: 1, metalness: 0 });
    for (let m = 0; m < spec.moons; m++) {
      const pivot = new THREE.Group();
      pivot.rotation.set(0.12 * (m + 1), m * 2.1, 0.08 * m);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(r * (0.13 + m * 0.03), 32, 24), moonMaterial);
      moon.position.x = r * (2.0 + m * 0.5);
      pivot.add(moon);
      group.add(pivot);
      moons.push({ pivot, speed: 0.18 / (m + 1) });
    }
  }

  const update = (dt: number, time: number, progress: number) => {
    const { x, y, z } = planetPosition(spec, progress);
    group.position.set(x, y, z);
    ringCenter?.set(x, y, z);
    surface.rotation.y += SPIN[spec.surface] * dt;
    if (clouds) clouds.rotation.y += (SPIN[spec.surface] + CLOUD_DRIFT) * dt;
    surfaceMaterial.uniforms.uTime.value = time;
    for (const moon of moons) moon.pivot.rotation.y += moon.speed * dt;
  };

  return { group, update };
}
