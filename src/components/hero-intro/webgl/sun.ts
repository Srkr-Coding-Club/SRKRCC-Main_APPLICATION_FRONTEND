import * as THREE from 'three';
import { SUN_RADIUS } from '../solarSystem';
import { CLUB_LOGO_INK, CLUB_LOGO_RAYS, type LogoShape } from './clubLogo';

/* ------------------------------------------------------------------ */
/* The centre of the system: SRKR Coding Club, standing for the Sun    */
/* without rendering one. Just the club's mark - real 3D geometry,     */
/* extruded from its traced outlines: a lacquered maroon bulb and      */
/* brain with metal-orange rays - lit by the scene's own lights and    */
/* always turned to face the camera so it reads from any angle.        */
/* ------------------------------------------------------------------ */

/* Half-width of the logo at the system's centre, in Sun radii (kept so the  */
/* journey's framing - distances, "how close the camera gets" - is unchanged.*/
const LOGO_SPAN = 0.82;
const LOGO_DEPTH = 0.06;
/* The logo steps aside when the camera dives through the centre at the end of the journey. */
const LOGO_HIDE_DISTANCE = SUN_RADIUS * 1.9;

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

/* The Sun's glow: a white-hot core, a golden corona and a wide warm haze, all additive. */
const GLOW_LAYERS = [
  { color: '#FFF1D6', scale: 3.4, opacity: 0.95 },
  { color: '#FFB347', scale: 8.5, opacity: 0.5 },
  { color: '#FF7A00', scale: 20, opacity: 0.2 },
] as const;
/* The glow thins out as the camera closes on the Sun, so the logo stays clear. */
const GLOW_FADE_NEAR = SUN_RADIUS * 2.2;
const GLOW_FADE_FAR = SUN_RADIUS * 6;

export function createSun(glowTexture: THREE.Texture) {
  const group = new THREE.Group();

  // A single warm point light stands in for the Sun's glow, so the logo's
  // clearcoat and metal still catch a highlight without a visible sphere.
  const light = new THREE.PointLight('#FFE2C0', 1.5, 0, 0);
  group.add(light);

  const glows = GLOW_LAYERS.map((layer) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color: layer.color, transparent: true, opacity: layer.opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    sprite.scale.setScalar(SUN_RADIUS * layer.scale);
    group.add(sprite);
    return { sprite, layer };
  });

  const logo = createLogo();
  group.add(logo);

  const update = (time: number, brightness: number, camera: THREE.Vector3) => {
    // Centred at the system's origin, always turned to face the viewer.
    logo.lookAt(camera);
    logo.visible = camera.length() > LOGO_HIDE_DISTANCE;
    light.intensity = 1.3 + brightness * 0.5;

    // A slow, uneven pulse in the corona, like a star's surface activity.
    const near = THREE.MathUtils.smoothstep(camera.length(), GLOW_FADE_NEAR, GLOW_FADE_FAR);
    glows.forEach(({ sprite, layer }, i) => {
      const pulse = 1 + 0.045 * Math.sin(time * (0.7 + i * 0.37) + i * 2.1) + 0.02 * Math.sin(time * 1.9 + i);
      sprite.scale.setScalar(SUN_RADIUS * layer.scale * pulse);
      sprite.material.opacity = layer.opacity * near * (0.8 + brightness * 0.35);
    });
  };

  const dispose = () => {};

  return { group, update, dispose };
}
