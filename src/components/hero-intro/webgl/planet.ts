import * as THREE from 'three';
import { smoothstep } from '../introMath';
import { planetPosition, type PlanetSpec } from '../solarSystem';
import { createEmblem } from './emblems';
import { createPlanetBody } from './planetBody';
import { entranceProgress, entrancePosition, entranceScale } from './entrance';
import { createTrail, trailStrength } from './trail';

/* ------------------------------------------------------------------ */
/* A stop in the system: its 3D object (emblems.ts), travelling round */
/* the Sun as the journey moves and as time passes, turned toward the viewer with a slow */
/* sway and a gentle float so its solid form reads from every angle.  */
/* ------------------------------------------------------------------ */

const GLOBE_SCALE = 1.3;
const EMBLEM_SCALE = 0.8;
const EMBLEM_LIFT = 1.7;
const SWAY = 0.32;
const FLOAT = 0.05;
const TRAIL_STRENGTH = 0.8;

export interface PlanetBody {
  group: THREE.Group;
  /* The light trail left during the opening gathering; lives in world space, so the scene adds it. */
  trail: THREE.Line;
  /* The 3D object, for anything that wants more of the same (the incoming stream clones it). */
  emblemObject: THREE.Object3D;
  /* `fade` (1 = in the system) shrinks the world away for the final dive into the Sun. */
  update: (time: number, progress: number, camera: THREE.Vector3, fade: number) => void;
}

export function createPlanet(spec: PlanetSpec, index: number, glowTexture: THREE.Texture): PlanetBody {
  const group = new THREE.Group();
  // `facing` turns to the camera; `sway` adds the slow turn and float.
  const facing = new THREE.Group();
  const sway = new THREE.Group();
  const emblem = createEmblem(spec.emblem);
  sway.add(emblem.object);
  // The technology's mark floats in front of its globe, turned to the viewer; the globe is a bigger, lit world behind it.
  sway.scale.setScalar(spec.radius * EMBLEM_SCALE);
  sway.position.z = spec.radius * EMBLEM_LIFT;
  facing.add(sway);
  const body = createPlanetBody(spec.emblem, index, glowTexture);
  // The three web shields are wide, so that world is a little larger to carry them.
  body.group.scale.setScalar(spec.radius * GLOBE_SCALE * (spec.emblem === 'web' ? 1.22 : 1));
  group.add(body.group, facing);

  const trail = createTrail();
  const base = { x: 0, y: 0, z: 0 };
  const flight = { x: 0, y: 0, z: 0 };

  const update = (time: number, progress: number, camera: THREE.Vector3, fade: number) => {
    // Every world sits on its own orbit from the start, and keeps circling the Sun.
    const orbit = planetPosition(spec, progress, time);
    base.x = orbit.x;
    base.y = orbit.y;
    base.z = orbit.z;

    // The opening gathering: fly in from the edge of space to where this world belongs.
    const entrance = entranceProgress(index, progress);
    if (entrance < 1) {
      entrancePosition(spec, index, entrance, base, flight);
      group.position.set(flight.x, flight.y, flight.z);
    } else {
      group.position.set(base.x, base.y, base.z);
    }
    group.scale.setScalar(entranceScale(entrance) * (0.15 + 0.85 * smoothstep(0, 0.6, fade)));

    // Light trail while flying in; gone once arrived.
    if (entrance < 1 && entrance > 0) trail.push(group.position, trailStrength(entrance, TRAIL_STRENGTH));
    else trail.hide();
    facing.lookAt(camera);
    sway.rotation.y = Math.sin(time * 0.45) * SWAY;
    sway.position.y = Math.sin(time * 0.8) * FLOAT * spec.radius;
    body.update(time);
    emblem.update(time);
  };

  return { group, trail: trail.line, emblemObject: emblem.object, update };
}
