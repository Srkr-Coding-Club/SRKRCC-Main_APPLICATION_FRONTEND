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

export function createSun() {
  const group = new THREE.Group();

  // A single warm point light stands in for the Sun's glow, so the logo's
  // clearcoat and metal still catch a highlight without a visible sphere.
  const light = new THREE.PointLight('#FFE2C0', 1.5, 0, 0);
  group.add(light);

  const logo = createLogo();
  group.add(logo);

  const update = (_time: number, brightness: number, camera: THREE.Vector3) => {
    // Centred at the system's origin, always turned to face the viewer.
    logo.lookAt(camera);
    logo.visible = camera.length() > LOGO_HIDE_DISTANCE;
    light.intensity = 1.3 + brightness * 0.5;
  };

  const dispose = () => {};

  return { group, update, dispose };
}
