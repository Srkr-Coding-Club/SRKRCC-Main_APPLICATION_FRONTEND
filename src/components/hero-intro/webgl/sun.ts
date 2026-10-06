import * as THREE from 'three';
import { SUN_RADIUS } from '../solarSystem';
import { CLUB_LOGO_INK, CLUB_LOGO_RAYS, type LogoShape } from './clubLogo';
import { NOISE_GLSL } from './noise';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The Sun: SRKR Coding Club. A churning photosphere - fine           */
/* granulation, slow supergranule cells, a few sunspots, bright       */
/* faculae and limb darkening - inside a soft corona. The club's logo */
/* is real 3D geometry, extruded from its traced outlines: a lacquered*/
/* maroon bulb and brain with metal-orange rays, standing just off    */
/* the face toward the camera so it reads, with depth, from any angle.*/
/* ------------------------------------------------------------------ */

const CORONA_SCALE = SUN_RADIUS * 5.2;
const HALO_SCALE = SUN_RADIUS * 12;
const RAYS_SCALE = SUN_RADIUS * 6;
const RAYS_SPIN = 0.012;
/* Half-width of the logo on the Sun's face, and how far it stands off the surface, in Sun radii. */
const LOGO_SPAN = 0.82;
const LOGO_STANDOFF = 1.03;
const LOGO_DEPTH = 0.06;
/* The logo steps aside when the camera dives into the Sun at the end of the journey. */
const LOGO_HIDE_DISTANCE = SUN_RADIUS * 1.9;

const vertex = /* glsl */ `
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

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  ${NOISE_GLSL}
  void main() {
    vec3 p = normalize(vLocal);
    float cells = fbm(p * 3.0 + vec3(uTime * 0.02, -uTime * 0.015, uTime * 0.01));
    float granules = noise3(p * 60.0 + vec3(uTime * 0.25)) * 0.6 + noise3(p * 120.0 - vec3(uTime * 0.3)) * 0.4;
    float heat = clamp(cells * 0.85 + granules * 0.25 + 0.08, 0.0, 1.0);
    vec3 deep = vec3(0.62, 0.16, 0.03);
    vec3 mid = vec3(1.0, 0.5, 0.06);
    vec3 hot = vec3(1.0, 0.86, 0.55);
    vec3 color = mix(deep, mid, smoothstep(0.25, 0.55, heat));
    color = mix(color, hot, smoothstep(0.55, 0.85, heat));

    // A few small sunspots - a dark umbra in a softer penumbra - drifting slowly.
    float spotField = noise3(p * 9.0 + vec3(17.0, uTime * 0.01, 3.0));
    color *= 1.0 - smoothstep(0.82, 0.87, spotField) * 0.25 - smoothstep(0.88, 0.92, spotField) * 0.2;
    // Faculae: bright patches near the limb.
    float mu = max(dot(normalize(vNormal), vView), 0.0);
    color += vec3(1.0, 0.7, 0.35) * smoothstep(0.62, 0.75, fbm(p * 6.0 + 9.0)) * (1.0 - mu) * 0.35;

    // Limb darkening: the edge is cooler and dimmer than the centre.
    color *= mix(vec3(0.55, 0.32, 0.2), vec3(1.0), pow(mu, 0.45));
    gl_FragColor = vec4(color * uIntensity, 1.0);
  }
`;

function createRayTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    ctx.translate(c, c);
    for (let i = 0; i < 36; i++) {
      const length = c * (0.55 + ((i * 37) % 11) / 22);
      const gradient = ctx.createLinearGradient(0, 0, length, 0);
      gradient.addColorStop(0, 'rgba(255,200,140,0.5)');
      gradient.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, -1.2);
      ctx.lineTo(length, 0);
      ctx.lineTo(0, 1.2);
      ctx.fill();
      ctx.rotate((Math.PI * 2) / 36);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* Extrudes traced outlines (holes included) into one bevelled geometry. */
function logoGeometry(shapes: LogoShape[]) {
  const toShape = ({ outer, holes }: LogoShape) => {
    const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes = holes.map((hole) => new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
    return shape;
  };
  return new THREE.ExtrudeGeometry(shapes.map(toShape), {
    depth: LOGO_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.006,
    bevelSegments: 3,
    curveSegments: 4,
  });
}

function createLogo() {
  const logo = new THREE.Group();
  logo.add(
    new THREE.Mesh(
      logoGeometry(CLUB_LOGO_INK),
      new THREE.MeshPhysicalMaterial({ color: '#7A1C2A', roughness: 0.3, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#3A0A10', emissiveIntensity: 0.6 }),
    ),
    new THREE.Mesh(
      logoGeometry(CLUB_LOGO_RAYS),
      new THREE.MeshPhysicalMaterial({ color: '#FFB347', roughness: 0.25, metalness: 0.7, emissive: '#C46200', emissiveIntensity: 1.4 }),
    ),
  );
  logo.scale.setScalar(SUN_RADIUS * LOGO_SPAN);
  return logo;
}

export function createSun(options: { glowTexture: THREE.Texture; quality: QualitySettings }) {
  const { glowTexture, quality } = options;
  const group = new THREE.Group();

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
    },
    toneMapped: false,
  });
  const segments = quality.sphereSegments;
  group.add(new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, segments, segments / 2), material));

  const glow = (color: string, scale: number, opacity: number) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    sprite.scale.setScalar(scale);
    group.add(sprite);
    return sprite;
  };
  const corona = glow('#FF8A1F', CORONA_SCALE, 0.65);
  const halo = glow('#FFA500', HALO_SCALE, 0.2);

  const rayTexture = createRayTexture();
  const rays = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: rayTexture, color: '#FFB46B', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  rays.scale.setScalar(RAYS_SCALE);
  group.add(rays);

  const light = new THREE.PointLight('#FFE2C0', 1.5, 0, 0);
  group.add(light);

  const logo = createLogo();
  group.add(logo);
  const toCamera = new THREE.Vector3();

  const update = (time: number, brightness: number, camera: THREE.Vector3) => {
    // Keep the logo on the face toward the viewer, standing just off the surface.
    toCamera.copy(camera).normalize();
    logo.position.copy(toCamera).multiplyScalar(SUN_RADIUS * LOGO_STANDOFF);
    logo.lookAt(camera);
    logo.visible = camera.length() > LOGO_HIDE_DISTANCE;
    material.uniforms.uTime.value = time;
    material.uniforms.uIntensity.value = 1.1 + brightness * 0.3;
    const pulse = 1 + Math.sin(time * 0.8) * 0.02;
    corona.scale.setScalar(CORONA_SCALE * pulse * (0.9 + brightness * 0.2));
    halo.material.opacity = 0.15 + brightness * 0.12;
    rays.material.rotation = time * RAYS_SPIN;
  };

  const dispose = () => rayTexture.dispose();

  return { group, update, dispose };
}
