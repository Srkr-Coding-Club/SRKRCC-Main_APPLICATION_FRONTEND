import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clamp, easeOutCubic, smoothDamp, type DampState } from '../introMath';
import { PLANETS } from '../solarSystem';
import { createJourneyPath, planetProximity, sunBrightness, systemPresence } from './journeyPath';
import { createPlanet } from './planet';
import { createFrameMonitor, nextPixelRatio, type QualitySettings } from './quality';
import { createDust, createOrbits, createStarfield } from './space';
import { createSun } from './sun';
import { createGlowTexture } from './textures';

/* ------------------------------------------------------------------ */
/* The solar-system journey and its render loop.                      */
/*                                                                    */
/* Input never drives the camera directly:                            */
/*   scroll -> target progress -> damped progress (inertia)           */
/*          -> camera pose on the journey spline -> damped camera     */
/* so fast scrolling accelerates the flight, slowing settles it, and  */
/* reversing turns it round without a jolt. The pointer only nudges   */
/* where the camera looks (a few degrees), never the world.           */
/* ------------------------------------------------------------------ */

const BACKGROUND = '#05060A';
const FOV_LANDSCAPE = 42;
const FOV_PORTRAIT = 62;
const PORTRAIT_ASPECT = 0.8;
const NEAR = 0.05;
const FAR = 1400;

const PROGRESS_SMOOTH_TIME = 0.7;
const CAMERA_SMOOTH_TIME = 0.22;
const LOOK_SMOOTH_TIME = 0.3;
const GLANCE_YAW_MAX = THREE.MathUtils.degToRad(3);
const GLANCE_PITCH_MAX = THREE.MathUtils.degToRad(2);
const GLANCE_SMOOTH_TIME = 0.35;
const BANK_MAX = THREE.MathUtils.degToRad(4);
const BANK_PER_SPEED = 0.004;
const MAX_FRAME_SECONDS = 1 / 20;
const AWAKEN_SECONDS = 2.4;
const ENVIRONMENT_INTENSITY = 0.35;

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

const damp = (): DampState => ({ value: 0, velocity: 0 });

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
  scene.fog = new THREE.FogExp2(BACKGROUND, 0.0016);
  const camera = new THREE.PerspectiveCamera(FOV_LANDSCAPE, 1, NEAR, FAR);

  onLoadProgress(0.35);

  const glowTexture = createGlowTexture();
  const starfield = createStarfield(quality, glowTexture);
  const orbits = createOrbits();
  const dust = createDust(quality);
  const sun = createSun({ glowTexture, quality });
  scene.add(starfield.group, orbits.group, dust.points, sun.group);
  onLoadProgress(0.65);

  const planets = PLANETS.map((spec) => createPlanet(spec));
  planets.forEach((planet) => scene.add(planet.group));
  scene.add(new THREE.AmbientLight('#1A2233', 0.45));
  // Soft studio reflections for the glossy technology emblems (planet shaders ignore it).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  onLoadProgress(0.9);

  /* --- Camera rig ------------------------------------------------- */
  const progress = damp();
  let targetProgress = 0;
  const position = [damp(), damp(), damp()];
  const look = [damp(), damp(), damp()];
  const yaw = damp();
  const pitch = damp();
  let glanceX = 0;
  let glanceY = 0;
  let portrait = false;
  let path = createJourneyPath(false);
  const lookTarget = new THREE.Vector3();
  const glanceEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const glanceQuaternion = new THREE.Quaternion();
  const proximities = PLANETS.map(() => 0);

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    const nextPortrait = aspect < PORTRAIT_ASPECT;
    camera.fov = nextPortrait ? FOV_PORTRAIT : FOV_LANDSCAPE;
    if (nextPortrait !== portrait) {
      portrait = nextPortrait;
      path = createJourneyPath(portrait);
    }
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const snapCamera = (p: number) => {
    path.position.forEach((track, axis) => {
      position[axis].value = track(p);
      position[axis].velocity = 0;
    });
    path.look.forEach((track, axis) => {
      look[axis].value = track(p);
      look[axis].velocity = 0;
    });
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
      dust.points.visible = false;
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
    camera.position.set(
      smoothDamp(position[0], path.position[0](p), CAMERA_SMOOTH_TIME, dt),
      smoothDamp(position[1], path.position[1](p), CAMERA_SMOOTH_TIME, dt),
      smoothDamp(position[2], path.position[2](p), CAMERA_SMOOTH_TIME, dt),
    );
    lookTarget.set(
      smoothDamp(look[0], path.look[0](p), LOOK_SMOOTH_TIME, dt),
      smoothDamp(look[1], path.look[1](p), LOOK_SMOOTH_TIME, dt),
      smoothDamp(look[2], path.look[2](p), LOOK_SMOOTH_TIME, dt),
    );
    camera.lookAt(lookTarget);

    // Bank gently into the turn (lateral speed), then add the pointer's small glance.
    const lateralSpeed = position[0].velocity * Math.cos(camera.rotation.y) - position[2].velocity * Math.sin(camera.rotation.y);
    glanceEuler.set(
      smoothDamp(pitch, glanceY * GLANCE_PITCH_MAX, GLANCE_SMOOTH_TIME, dt),
      smoothDamp(yaw, -glanceX * GLANCE_YAW_MAX, GLANCE_SMOOTH_TIME, dt),
      clamp(-lateralSpeed * BANK_PER_SPEED, -BANK_MAX, BANK_MAX),
    );
    camera.quaternion.multiply(glanceQuaternion.setFromEuler(glanceEuler));

    const awaken = easeOutCubic(elapsed / AWAKEN_SECONDS);
    renderer.toneMappingExposure = awaken;
    const presence = systemPresence(p);

    sun.update(elapsed, sunBrightness(p), camera.position);
    planets.forEach((planet, i) => {
      proximities[i] = planetProximity(p, i);
      planet.update(elapsed, p, camera.position);
      planet.group.visible = presence > 0.01;
    });
    orbits.update(proximities, presence);
    dust.update(dt, presence);
    starfield.stars.rotation.y += dt * 0.002;

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
      glanceX = clamp(x, -1, 1);
      glanceY = clamp(y, -1, 1);
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
      sun.dispose();
      glowTexture.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
