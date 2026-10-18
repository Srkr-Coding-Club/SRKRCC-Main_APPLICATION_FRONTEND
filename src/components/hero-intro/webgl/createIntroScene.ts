import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clamp, easeOutCubic, smoothDamp, smoothstep, type DampState } from '../introMath';
import { LAUNCH, PLANETS, planetPosition } from '../solarSystem';
import { createJourneyPath, planetProximity, sunBrightness, systemPresence } from './journeyPath';
import { createPlanet } from './planet';
import { createFrameMonitor, nextPixelRatio, type QualitySettings } from './quality';
import { createDust, createOrbits, createStarfield } from './space';
import { createStream } from './stream';
import { createSun } from './sun';
import { createGlowTexture } from './textures';
import { createGalaxies } from './galaxies';
import { createNoiseTexture } from './noiseTexture';
import { bangDolly, bangReveal, bangShake, createBigBang } from './bigBang';

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
const NEAR = 0.3;
const FAR = 20000;

const PROGRESS_SMOOTH_TIME = 0.7;
/* Progress is already critically damped, so the camera only needs a light second pass; */
/* more lag lets planets (which follow progress directly) slide against the frame.      */
const CAMERA_SMOOTH_TIME = 0.08;
const LOOK_SMOOTH_TIME = 0.12;
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
  const sun = createSun(glowTexture);
  const noise = createNoiseTexture(quality.noiseSize);
  const galaxies = createGalaxies(quality, glowTexture, noise);
  const bang = createBigBang(quality, glowTexture, noise);
  scene.add(galaxies.group, bang.group, starfield.group, orbits.group, dust.points, sun.group);
  onLoadProgress(0.65);

  const planets = PLANETS.map((spec, i) => createPlanet(spec, i, glowTexture));
  planets.forEach((planet) => scene.add(planet.group, planet.trail));
  const stream = createStream(planets.map((planet) => planet.emblemObject));
  scene.add(stream.group);
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
  const drift = new THREE.Vector3();
  const shake = new THREE.Vector3();
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
      // Still struggling: drop the dust and thin the star fields (they are stored in random order, so a prefix is a fair sample).
      dust.points.visible = false;
      galaxies.setDetail(0.7);
      bang.setDetail(0.7);
      return true;
    }
    if (step === 4) {
      galaxies.setDetail(0.42);
      bang.setDetail(0.45);
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

    // The planets revolve with time, but the flight is scripted against where each one is at its encounter.
    // So the camera shares the drift of whichever planet it is near, in proportion to how near: framing
    // holds through an encounter and the shared drift fades out between planets.
    drift.set(0, 0, 0);
    PLANETS.forEach((planet, i) => {
      const weight = planetProximity(p, i);
      if (weight <= 0) return;
      const now = planetPosition(planet, p, elapsed);
      const scripted = planetPosition(planet, p, 0);
      drift.x += (now.x - scripted.x) * weight;
      drift.y += (now.y - scripted.y) * weight;
      drift.z += (now.z - scripted.z) * weight;
    });
    // The Big Bang: the camera opens well back from the first frame and eases in, with a jolt at ignition.
    const pullBack = 0.55 * bangDolly(elapsed, p);
    bangShake(elapsed, shake);
    const at = (axis: number) => path.position[axis](p);
    const back = (axis: number) => (at(axis) - path.look[axis](p)) * pullBack;
    camera.position.set(
      smoothDamp(position[0], at(0) + drift.x + back(0) + shake.x, CAMERA_SMOOTH_TIME, dt),
      smoothDamp(position[1], at(1) + drift.y + back(1) + shake.y, CAMERA_SMOOTH_TIME, dt),
      smoothDamp(position[2], at(2) + drift.z + back(2), CAMERA_SMOOTH_TIME, dt),
    );
    lookTarget.set(
      smoothDamp(look[0], path.look[0](p) + drift.x, LOOK_SMOOTH_TIME, dt),
      smoothDamp(look[1], path.look[1](p) + drift.y, LOOK_SMOOTH_TIME, dt),
      smoothDamp(look[2], path.look[2](p) + drift.z, LOOK_SMOOTH_TIME, dt),
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
    // Orbits and dust fade in as the camera arrives from the galaxy, and out again for the final dive.
    const endFade = 1 - smoothstep(LAUNCH.shellCrossing - 0.02, LAUNCH.shellCrossing, p);
    const presence = systemPresence(p) * endFade;
    // The star sphere is a backdrop: it travels with the camera so it always reads as infinitely far.
    starfield.group.position.copy(camera.position);
    galaxies.update(elapsed, p, camera.position, renderer.domElement.height, camera.fov, bangReveal(elapsed, p));
    bang.update(elapsed, p, renderer.domElement.height, camera.fov, camera);
    // Worlds are present from the opening gathering on; only the final dive into the Sun takes them away.
    const planetFade = 1 - smoothstep(LAUNCH.shellCrossing - 0.02, LAUNCH.shellCrossing, p);

    sun.update(elapsed, sunBrightness(p), camera.position);
    planets.forEach((planet, i) => {
      proximities[i] = planetProximity(p, i);
      planet.update(elapsed, p, camera.position, planetFade);
      planet.group.visible = planetFade > 0.002;
    });
    stream.update(elapsed, p, camera.position);
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
      noise.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
