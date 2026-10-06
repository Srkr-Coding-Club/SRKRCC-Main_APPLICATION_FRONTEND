import * as THREE from 'three';
import { SUN_RADIUS } from '../solarSystem';
import { NOISE_GLSL } from './noise';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The Sun: SRKR Coding Club. A churning photosphere - fine           */
/* granulation, slow supergranule cells, a few sunspots, bright       */
/* faculae and limb darkening - inside a soft corona. The club's logo */
/* is not a sticker on top: the shader projects it onto the face      */
/* toward the camera and burns it into the plasma as cooler, darker   */
/* gas (the way sunspots read), so it stays legible from every angle  */
/* and passing planets hide it naturally.                             */
/* ------------------------------------------------------------------ */

const CORONA_SCALE = SUN_RADIUS * 5.2;
const HALO_SCALE = SUN_RADIUS * 12;
const RAYS_SCALE = SUN_RADIUS * 6;
const RAYS_SPIN = 0.012;
/* Half-width of the logo image on the Sun's face, as a fraction of its radius. */
const LOGO_SPAN = 0.82;

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
  uniform sampler2D uLogo;
  uniform float uLogoSpan;
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

    // The club's mark, projected orthographically toward the viewer (sun at the origin), so it
    // reads undistorted from the camera. White in the image is plasma; ink is cooler, darker gas.
    vec3 c = normalize(cameraPosition);
    vec3 upRef = abs(c.y) > 0.98 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(upRef, c));
    vec3 up = cross(c, right);
    vec2 uv = vec2(dot(p, right), dot(p, up)) / uLogoSpan * 0.5 + 0.5;
    if (dot(p, c) > 0.0 && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      vec4 logo = texture2D(uLogo, uv);
      float ink = smoothstep(0.2, 0.75, (1.0 - dot(logo.rgb, vec3(0.299, 0.587, 0.114))) * logo.a);
      color = mix(color, color * vec3(0.3, 0.06, 0.04), ink * 0.92);
    }

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

export function createSun(options: { logoTexture: THREE.Texture; glowTexture: THREE.Texture; quality: QualitySettings }) {
  const { logoTexture, glowTexture, quality } = options;
  const group = new THREE.Group();

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uLogo: { value: logoTexture },
      uLogoSpan: { value: LOGO_SPAN },
    },
    toneMapped: false,
  });
  const segments = Math.max(quality.sphereSegments, 64);
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

  const light = new THREE.PointLight('#FFE2C0', 2.6, 0, 0);
  group.add(light);

  const update = (time: number, brightness: number) => {
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
