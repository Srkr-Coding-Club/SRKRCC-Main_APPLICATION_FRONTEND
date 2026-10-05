import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clamp, easeOutCubic, smoothDamp, type DampState } from '../introMath';
import { cameraTrack, worldTrack } from '../timeline';
import { createAtmosphere } from './atmosphere';
import { createDataArtifacts } from './dataArtifacts';
import { createIntelligenceCore } from './intelligenceCore';
import { createLaboratory } from './laboratory';
import { createOrbitalSystem } from './orbitalSystem';
import { createFrameMonitor, nextPixelRatio, type QualitySettings } from './quality';
import { createGlowTexture, loadTexture } from './textures';

/* ------------------------------------------------------------------ */
/* The intro's WebGL world and its render loop.                       */
/*                                                                    */
/* Input never drives the camera directly:                            */
/*   scroll -> target progress -> damped progress (inertia)           */
/*          -> camera pose from timeline tracks -> damped camera      */
/* so fast scrolling accelerates the camera, slowing settles it, and  */
/* reversing turns it round without a jolt. The pointer only nudges   */
/* where the camera looks (a few degrees), never the world.           */
/* ------------------------------------------------------------------ */

const BACKGROUND = '#0D0E15';
const FOV_LANDSCAPE = 40;
const FOV_PORTRAIT = 56;
const PORTRAIT_ASPECT = 0.8;
const PORTRAIT_PATH_SCALE = 0.5;
const NEAR = 0.03;
const FAR = 160;

const PROGRESS_SMOOTH_TIME = 0.55;
const CAMERA_SMOOTH_TIME = 0.18;
const LOOK_YAW_MAX = THREE.MathUtils.degToRad(3);
const LOOK_PITCH_MAX = THREE.MathUtils.degToRad(2);
const LOOK_SMOOTH_TIME = 0.35;
const BANK_PER_UNIT_DRIFT = 0.18;
const BANK_MAX = THREE.MathUtils.degToRad(3);
const MAX_FRAME_SECONDS = 1 / 20;

/* Awakening: on load, the dark resolves and the camera drifts in a little before any scroll. */
const AWAKEN_SECONDS = 2.6;
const AWAKEN_DRIFT_SECONDS = 9;
const AWAKEN_DRIFT_DISTANCE = 5;

export interface IntroScene {
  setTargetProgress: (progress: number) => void;
  jumpTo: (progress: number) => void;
  setLook: (x: number, y: number) => void;
  setActive: (active: boolean) => void;
  destroy: () => void;
}

export interface IntroSceneOptions {
  quality: QualitySettings;
  onLoadProgress: (fraction: number) => void;
  onFrame: (progress: number) => void;
}

export async function createIntroScene(canvas: HTMLCanvasElement, options: IntroSceneOptions): Promise<IntroScene> {
  const { quality, onLoadProgress, onFrame } = options;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(BACKGROUND);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BACKGROUND, worldTrack.fogDensity(0));
  const camera = new THREE.PerspectiveCamera(FOV_LANDSCAPE, 1, NEAR, FAR);

  onLoadProgress(0.15);
  const [emblemTexture] = await Promise.all([
    loadTexture('/logo-mark.png'),
    document.fonts?.load('500 26px "JetBrains Mono"').catch(() => undefined),
  ]);
  onLoadProgress(0.6);

  let environmentMap: THREE.Texture | null = null;
  let pmrem: THREE.PMREMGenerator | null = null;
  if (quality.reflections) {
    pmrem = new THREE.PMREMGenerator(renderer);
    environmentMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  }
  const glowTexture = createGlowTexture();

  const core = createIntelligenceCore({ emblemTexture, glowTexture, environmentMap, quality });
  const orbits = createOrbitalSystem(quality);
  const lab = createLaboratory(quality);
  const artifacts = createDataArtifacts();
  const atmosphere = createAtmosphere(quality);
  scene.add(core.group, orbits.group, lab.group, artifacts.group, atmosphere.points);

  scene.add(new THREE.AmbientLight('#1b1814', 0.35));
  const rim = new THREE.DirectionalLight('#D8D2C8', 0.28);
  rim.position.set(-6, 10, -14);
  scene.add(rim);
  onLoadProgress(0.9);

  /* --- Camera rig ------------------------------------------------- */
  const progress: DampState = { value: 0, velocity: 0 };
  let targetProgress = 0;
  const camX: DampState = { value: 0, velocity: 0 };
  const camY: DampState = { value: 0, velocity: 0 };
  const camZ: DampState = { value: 0, velocity: 0 };
  const yaw: DampState = { value: 0, velocity: 0 };
  const pitch: DampState = { value: 0, velocity: 0 };
  let lookX = 0;
  let lookY = 0;
  let pathScale = 1;
  const lookTarget = new THREE.Vector3();
  const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const lookQuaternion = new THREE.Quaternion();

  const pose = new THREE.Vector3();
  const poseAt = (p: number, elapsed: number) => {
    const drift = AWAKEN_DRIFT_DISTANCE * (1 - easeOutCubic(elapsed / AWAKEN_DRIFT_SECONDS));
    return pose.set(cameraTrack.x(p) * pathScale, cameraTrack.y(p), cameraTrack.z(p) + drift);
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < PORTRAIT_ASPECT ? FOV_PORTRAIT : FOV_LANDSCAPE;
    pathScale = aspect < PORTRAIT_ASPECT ? PORTRAIT_PATH_SCALE : 1;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const snapCamera = (p: number) => {
    poseAt(p, elapsed);
    camX.value = pose.x;
    camY.value = pose.y;
    camZ.value = pose.z;
    camX.velocity = camY.velocity = camZ.velocity = 0;
  };

  /* --- Adaptive quality ------------------------------------------- */
  const monitor = createFrameMonitor((step) => {
    if (step === 1 || step === 3) {
      pixelRatio = nextPixelRatio(pixelRatio);
      renderer.setPixelRatio(pixelRatio);
      resize();
      return true;
    }
    if (step === 2) {
      lab.setDetailReduced(true);
      atmosphere.points.visible = false;
      return true;
    }
    return false;
  });

  /* --- Render loop ------------------------------------------------ */
  const clock = new THREE.Clock(false);
  let frameId = 0;
  let elapsed = 0;
  snapCamera(0);

  const frame = () => {
    const dt = Math.min(clock.getDelta(), MAX_FRAME_SECONDS);
    elapsed += dt;
    monitor.sample(dt);

    const p = smoothDamp(progress, targetProgress, PROGRESS_SMOOTH_TIME, dt);
    poseAt(p, elapsed);
    const prevX = camX.value;
    camera.position.set(
      smoothDamp(camX, pose.x, CAMERA_SMOOTH_TIME, dt),
      smoothDamp(camY, pose.y, CAMERA_SMOOTH_TIME, dt),
      Math.max(0.2, smoothDamp(camZ, pose.z, CAMERA_SMOOTH_TIME, dt)),
    );

    // Look at the core, bank gently into lateral drift, then add the pointer's small glance.
    lookTarget.set(camera.position.x * 0.25, camera.position.y * 0.15, 0);
    camera.lookAt(lookTarget);
    const drift = dt > 0 ? (camX.value - prevX) / dt : 0;
    lookEuler.set(
      smoothDamp(pitch, lookY * LOOK_PITCH_MAX, LOOK_SMOOTH_TIME, dt),
      smoothDamp(yaw, -lookX * LOOK_YAW_MAX, LOOK_SMOOTH_TIME, dt),
      clamp(-drift * BANK_PER_UNIT_DRIFT, -BANK_MAX, BANK_MAX),
    );
    camera.quaternion.multiply(lookQuaternion.setFromEuler(lookEuler));

    const presence = worldTrack.environment(p);
    const awaken = easeOutCubic(elapsed / AWAKEN_SECONDS);
    renderer.toneMappingExposure = awaken;
    (scene.fog as THREE.FogExp2).density = worldTrack.fogDensity(p);

    core.update({
      time: elapsed,
      light: worldTrack.coreLight(p) * awaken,
      energy: worldTrack.energy(p),
      // The beacon leads the awakening: it is visible before the exposure comes up.
      beacon: worldTrack.beacon(p) * Math.min(1, elapsed / (AWAKEN_SECONDS * 0.5)),
      cameraDistance: camera.position.length(),
    });
    orbits.update(dt, worldTrack.orbitSpeed(p));
    lab.update(dt, presence);
    artifacts.update(camera.position, presence);
    atmosphere.update(dt, presence);

    renderer.render(scene, camera);
    // Schedule first, so onFrame may stop the loop (setActive(false) cancels this request).
    frameId = requestAnimationFrame(frame);
    onFrame(p);
  };

  const setActive = (active: boolean) => {
    if (active && !frameId) {
      clock.start();
      frameId = requestAnimationFrame(frame);
    } else if (!active && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      clock.stop();
    }
  };

  onLoadProgress(1);

  return {
    setTargetProgress: (value) => {
      targetProgress = clamp(value, 0, 1);
    },
    jumpTo: (value) => {
      targetProgress = clamp(value, 0, 1);
      progress.value = targetProgress;
      progress.velocity = 0;
      snapCamera(targetProgress);
      onFrame(targetProgress);
    },
    setLook: (x, y) => {
      lookX = clamp(x, -1, 1);
      lookY = clamp(y, -1, 1);
    },
    setActive,
    destroy: () => {
      setActive(false);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        materials.forEach((material) => material.dispose());
      });
      emblemTexture.dispose();
      glowTexture.dispose();
      environmentMap?.dispose();
      pmrem?.dispose();
      renderer.dispose();
    },
  };
}
