import * as THREE from 'three';
import type { QualitySettings } from './quality';

/* ------------------------------------------------------------------ */
/* The computing laboratory around the camera path, in depth layers:  */
/*   foreground - a few dark fragments that slip past close by        */
/*   midground  - structural gates the camera flies through, and data */
/*                racks to either side with sparse status lights      */
/*   background - a floor that catches the core's light, and distant */
/*                monoliths that dissolve into fog                    */
/* Nearly everything is matte and dark: the core's light reveals it.  */
/* ------------------------------------------------------------------ */

const FLOOR_Y = -3.4;
const GOLD = '#FFA500';

/* Gates along the approach, closer together near the core so travel feels like it gathers pace. */
const GATES = [
  { z: 54, width: 11, height: 7.4, roll: 0.03, accent: false },
  { z: 46, width: 10.5, height: 7, roll: -0.04, accent: true },
  { z: 39, width: 10, height: 6.8, roll: 0.02, accent: false },
  { z: 32.5, width: 9.6, height: 6.6, roll: -0.05, accent: false },
  { z: 26.5, width: 9.2, height: 6.4, roll: 0.04, accent: true },
  { z: 21, width: 8.8, height: 6.2, roll: -0.02, accent: false },
  { z: 16.5, width: 8.4, height: 6, roll: 0.03, accent: true },
];
const GATE_BEAM = 0.11;
const GATE_CENTER_Y = 0.9;

const RACKS_PER_SIDE = 7;
const RACK_COLUMNS = 3;
const RACK_CELL = 0.34;
const RACK_GAP = 0.08;
const STATUS_LIGHT_SHARE = 0.09;

const MONOLITHS = 12;
const FRAGMENTS = [
  { position: [-2.4, 2.1, 51] as const, scale: 0.22 },
  { position: [2.9, -1.2, 43] as const, scale: 0.3 },
  { position: [-3.1, -0.6, 30] as const, scale: 0.18 },
  { position: [2.2, 2.6, 23.5] as const, scale: 0.16 },
  { position: [-1.9, -1.6, 14] as const, scale: 0.2 },
];

/* Deterministic pseudo-random, so the layout is identical on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createLaboratory(quality: QualitySettings) {
  const group = new THREE.Group();
  const random = seeded(20261006);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  const structureMaterial = new THREE.MeshStandardMaterial({ color: '#0e0e0f', roughness: 0.72, metalness: 0.45 });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, toneMapped: false });

  /* Gates: two posts and a lintel each, rolled slightly so the corridor feels built, not generated. */
  const gateBeams = new THREE.InstancedMesh(unitBox, structureMaterial, GATES.length * 3);
  const gateAccents = new THREE.InstancedMesh(unitBox, accentMaterial, GATES.filter((g) => g.accent).length);
  let accentIndex = 0;
  GATES.forEach((gate, i) => {
    const frame = new THREE.Matrix4().makeRotationZ(gate.roll).setPosition(0, GATE_CENTER_Y, gate.z);
    const halfW = gate.width / 2;
    const halfH = gate.height / 2;
    const parts: Array<[number, number, number, number]> = [
      [-halfW, 0, GATE_BEAM, gate.height],
      [halfW, 0, GATE_BEAM, gate.height],
      [0, halfH, gate.width + GATE_BEAM, GATE_BEAM],
    ];
    parts.forEach(([x, y, w, h], j) => {
      matrix.compose(position.set(x, y, 0), rotation.identity(), scale.set(w, h, GATE_BEAM * 2));
      gateBeams.setMatrixAt(i * 3 + j, matrix.premultiply(frame));
    });
    if (gate.accent) {
      matrix.compose(position.set(0, halfH - GATE_BEAM * 0.8, 0.06), rotation.identity(), scale.set(gate.width * 0.62, 0.012, 0.012));
      gateAccents.setMatrixAt(accentIndex++, matrix.premultiply(frame));
    }
  });
  group.add(gateBeams, gateAccents);

  /* Data racks: stacks of dark cells either side of the path, with a few status lights facing it. */
  const rackCells: THREE.Matrix4[] = [];
  const statusLights: THREE.Matrix4[] = [];
  for (const side of [-1, 1]) {
    for (let r = 0; r < RACKS_PER_SIDE; r++) {
      const z = 48 - r * 6 - random() * 2;
      const x = side * (7 + random() * 4.5);
      const rows = Math.max(2, quality.rackRows - Math.floor(random() * 3));
      for (let c = 0; c < RACK_COLUMNS; c++) {
        for (let row = 0; row < rows; row++) {
          const cx = x + side * c * (RACK_CELL + RACK_GAP);
          const cy = FLOOR_Y + RACK_CELL / 2 + row * (RACK_CELL + RACK_GAP);
          rackCells.push(new THREE.Matrix4().compose(position.set(cx, cy, z), rotation.identity(), scale.setScalar(RACK_CELL)));
          if (c === 0 && random() < STATUS_LIGHT_SHARE * 3) {
            statusLights.push(
              new THREE.Matrix4().compose(position.set(cx - side * (RACK_CELL / 2 + 0.01), cy, z), rotation.identity(), scale.set(0.01, 0.05, 0.14)),
            );
          }
        }
      }
    }
  }
  const racks = new THREE.InstancedMesh(unitBox, structureMaterial, rackCells.length);
  rackCells.forEach((m, i) => racks.setMatrixAt(i, m));
  const statusMaterial = new THREE.MeshBasicMaterial({ color: '#FFD8A8', transparent: true, opacity: 0, toneMapped: false });
  const status = new THREE.InstancedMesh(unitBox, statusMaterial, statusLights.length);
  statusLights.forEach((m, i) => status.setMatrixAt(i, m));
  group.add(racks, status);

  /* Floor: dark, faintly metallic, so the core's light pools on it and gives the space a ground. */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5, metalness: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y, 0);
  group.add(floor);

  /* Background monoliths beyond the core, mostly swallowed by fog. */
  const monoliths = new THREE.InstancedMesh(unitBox, structureMaterial, MONOLITHS);
  for (let i = 0; i < MONOLITHS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const height = 14 + random() * 18;
    matrix.compose(
      position.set(side * (14 + random() * 26), FLOOR_Y + height / 2, -8 - random() * 60),
      rotation.setFromEuler(euler.set(0, random() * Math.PI, 0)),
      scale.set(1.2 + random() * 1.4, height, 1.2 + random() * 1.4),
    );
    monoliths.setMatrixAt(i, matrix);
  }
  group.add(monoliths);

  /* Foreground fragments: occasional close objects that pass the lens and sell the depth. */
  const fragmentGeometry = new THREE.OctahedronGeometry(1, 0);
  const fragmentMaterial = new THREE.MeshStandardMaterial({ color: '#151413', roughness: 0.35, metalness: 0.7 });
  const fragments = FRAGMENTS.map(({ position: [x, y, z], scale: s }) => {
    const mesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
    mesh.position.set(x, y, z);
    mesh.scale.set(s, s * 1.8, s);
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, 0);
    group.add(mesh);
    return mesh;
  });

  const update = (dt: number, presence: number) => {
    accentMaterial.opacity = 0.55 * presence;
    statusMaterial.opacity = 0.7 * presence;
    for (const fragment of fragments) {
      fragment.rotation.y += dt * 0.12;
      fragment.rotation.x += dt * 0.05;
    }
  };

  const setDetailReduced = (reduced: boolean) => {
    status.visible = !reduced;
    monoliths.visible = !reduced;
  };

  return { group, update, setDetailReduced };
}
