import * as THREE from 'three';
import { createLabelTexture, type LabelLine } from './textures';

/* ------------------------------------------------------------------ */
/* Six pieces of code that live in the world rather than float over   */
/* it: projections attached to the lab, discovered as the camera      */
/* passes. Each fades in at reading distance and out once passed.     */
/* ------------------------------------------------------------------ */

interface ArtifactSpec {
  lines: LabelLine[];
  position: [number, number, number];
  yaw: number;
  height: number;
}

const ARTIFACTS: ArtifactSpec[] = [
  {
    lines: [
      { text: '● signal acquired', tone: 'accent' },
      { text: 'source  srkr.core', tone: 'muted' },
    ],
    position: [-3.3, 2.5, 47],
    yaw: 0.35,
    height: 0.42,
  },
  {
    lines: [
      { text: '$ git pull origin main', tone: 'primary' },
      { text: '  already up to date', tone: 'muted' },
    ],
    position: [4.4, 1.5, 36.5],
    yaw: -0.45,
    height: 0.4,
  },
  {
    lines: [
      { text: 'build passing', tone: 'primary' },
      { text: '✓ all checks green', tone: 'accent' },
    ],
    position: [-4.7, -0.5, 27.5],
    yaw: 0.5,
    height: 0.4,
  },
  {
    lines: [
      { text: 'GET /events', tone: 'primary' },
      { text: '200 OK', tone: 'muted' },
    ],
    position: [3.7, 2.4, 19.5],
    yaw: -0.4,
    height: 0.36,
  },
  {
    lines: [{ text: 'learn() → build() → innovate()', tone: 'primary' }],
    position: [-2.9, 1.6, 10.5],
    yaw: 0.3,
    height: 0.2,
  },
  {
    lines: [{ text: 'core.status = online', tone: 'accent' }],
    position: [2.5, -0.95, 6.2],
    yaw: -0.35,
    height: 0.18,
  },
];

const ARTIFACT_SCALE = 1.7;
const READ_FAR = 24;
const READ_NEAR = 14;
const PASS_NEAR = 2.2;
const PASS_FAR = 4.5;

export function createDataArtifacts() {
  const group = new THREE.Group();
  const artifacts = ARTIFACTS.map((spec) => {
    const { texture, aspect } = createLabelTexture(spec.lines);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const height = spec.height * ARTIFACT_SCALE;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), material);
    mesh.position.set(...spec.position);
    mesh.rotation.y = spec.yaw;
    group.add(mesh);
    return { mesh, material };
  });

  const update = (cameraPosition: THREE.Vector3, presence: number) => {
    for (const { mesh, material } of artifacts) {
      const distance = mesh.position.distanceTo(cameraPosition);
      const ahead = mesh.position.z < cameraPosition.z;
      const legible = THREE.MathUtils.smoothstep(READ_FAR - distance, 0, READ_FAR - READ_NEAR);
      const notYetPassed = ahead ? THREE.MathUtils.smoothstep(distance, PASS_NEAR, PASS_FAR) : 0;
      material.opacity = legible * notYetPassed * presence;
      mesh.visible = material.opacity > 0.01;
    }
  };

  return { group, update };
}
