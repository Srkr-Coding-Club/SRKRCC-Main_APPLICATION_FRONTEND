import * as THREE from 'three';
import { planetPosition, type PlanetSpec } from '../solarSystem';
import { createEmblem } from './emblems';

/* ------------------------------------------------------------------ */
/* A stop in the system: its 3D object (emblems.ts), travelling round */
/* the Sun as the journey moves, turned toward the viewer with a slow */
/* sway and a gentle float so its solid form reads from every angle.  */
/* ------------------------------------------------------------------ */

const SWAY = 0.32;
const FLOAT = 0.05;

export interface PlanetBody {
  group: THREE.Group;
  update: (time: number, progress: number, camera: THREE.Vector3) => void;
}

export function createPlanet(spec: PlanetSpec): PlanetBody {
  const group = new THREE.Group();
  // `facing` turns to the camera; `sway` adds the slow turn and float.
  const facing = new THREE.Group();
  const sway = new THREE.Group();
  const emblem = createEmblem(spec.emblem);
  sway.add(emblem.object);
  sway.scale.setScalar(spec.radius);
  facing.add(sway);
  group.add(facing);

  const update = (time: number, progress: number, camera: THREE.Vector3) => {
    const { x, y, z } = planetPosition(spec, progress);
    group.position.set(x, y, z);
    facing.lookAt(camera);
    sway.rotation.y = Math.sin(time * 0.45) * SWAY;
    sway.position.y = Math.sin(time * 0.8) * FLOAT * spec.radius;
    emblem.update(time);
  };

  return { group, update };
}
