import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import optimerBold from 'three/examples/fonts/optimer_bold.typeface.json';
import type { Emblem } from '../solarSystem';
import { createGlowTexture } from './textures';

/* ------------------------------------------------------------------ */
/* Every stop as a solid, realistic 3D object: bevelled, clear-coated */
/* or metal surfaces lit by the Sun and the scene's environment       */
/* reflections. Technology eras wear the technology's own mark:       */
/*   c    - the C hexagon in its three blues, with a white C          */
/*   web  - the HTML, CSS and JavaScript shields, side by side        */
/*   java - a steaming coffee cup on a saucer                         */
/*   tree - a binary tree whose nodes light up in traversal order     */
/* Club programs are objects that stand for them:                     */
/*   bulb (awareness), laptop with C code (workshops), a launching    */
/*   rocket (crash course), trophy (events), </> (hackathon), a daily */
/*   flip-calendar (CodeQuest), a winner's podium (IconCoders, the    */
/*   flagship championship), and a checkered racing flag (EdgeCase,   */
/*   the biweekly DSA contest - race the clock).                      */
/* Each is built about one unit across and scaled to the stop's size; */
/* `update` animates only what lives inside the emblem.               */
/* ------------------------------------------------------------------ */

const font = new Font(optimerBold as unknown as ConstructorParameters<typeof Font>[0]);

// curveSegments/bevelSegments tessellate every extruded emblem face (12 stops'
// worth): these objects read small on screen for almost the whole journey, so
// film-quality segment counts here were pure frame-time cost with no visible
// return - this keeps edges smooth while roughly halving their triangle count.
const BEVEL = { bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3, curveSegments: 14 };
const LIFT = 0.004;

function glossy(color: string, overrides: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.12, ...overrides });
}

/* A shape extruded with a soft bevel. Its front face sits at z = frontOf(depth). */
function extrude(shape: THREE.Shape, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, ...BEVEL }), material);
}
const frontOf = (depth: number) => depth + BEVEL.bevelThickness;

/* A flat face laid on top of an extruded body, for two-tone fronts without bevel seams. */
function face(points: Array<[number, number]>, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))), material);
  mesh.position.z = z + LIFT;
  return mesh;
}

/* Raised lettering, centred on (x, y), standing on the face at z. */
function glyphs(text: string, size: number, x: number, y: number, z: number, material: THREE.Material) {
  const geometry = new TextGeometry(text, { font, size, depth: size * 0.14, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3 });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

/* --- C: the hexagon, lit like a cube seen corner-on, with a white C --- */
function createC() {
  const group = new THREE.Group();
  const depth = 0.32;
  const corner = (degrees: number): [number, number] => {
    const a = THREE.MathUtils.degToRad(degrees);
    return [Math.cos(a), Math.sin(a)];
  };
  const [top, upperLeft, lowerLeft, bottom, lowerRight, upperRight] = [90, 150, 210, 270, 330, 30].map(corner);
  const hexagon = new THREE.Shape([top, upperLeft, lowerLeft, bottom, lowerRight, upperRight].map(([x, y]) => new THREE.Vector2(x, y)));
  group.add(extrude(hexagon, depth, glossy('#03599C')));
  const z = frontOf(depth);
  group.add(face([top, upperLeft, lowerLeft, bottom, [0, 0]], z, glossy('#659AD2')));
  group.add(face([[0, 0], bottom, lowerRight], z, glossy('#004482')));

  // The letter: a thick ring opened toward the right, as in the C mark.
  const gap = 0.62;
  const outer = 0.56;
  const inner = 0.31;
  const letter = new THREE.Shape();
  letter.absarc(0, 0, outer, gap, Math.PI * 2 - gap, false);
  letter.lineTo(Math.cos(-gap) * inner, Math.sin(-gap) * inner);
  letter.absarc(0, 0, inner, Math.PI * 2 - gap, gap, true);
  letter.closePath();
  const c = extrude(letter, 0.07, glossy('#FFFFFF', { roughness: 0.22 }));
  c.position.z = z;
  group.add(c);

  group.position.z = -z / 2;
  return { object: group, update: () => {} };
}

/* --- Web: the real HTML5/CSS3 badge - a solid shield with a folded top-right */
/* corner and a white inset ribbon carrying the numeral in the brand color --- */
function shield(base: string, fold: string, numeral: string) {
  const group = new THREE.Group();
  const depth = 0.24;
  const outline: Array<[number, number]> = [
    [-0.46, 0.58], [0.46, 0.58], [0.46, 0.08], [0.3, -0.5], [0, -0.62], [-0.3, -0.5], [-0.46, 0.08],
  ];
  group.add(extrude(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), depth, glossy(base)));
  const z = frontOf(depth);
  // The dog-eared corner: a small folded flap in a darker shade of the same color.
  group.add(face([[0.2, 0.58], [0.46, 0.58], [0.46, 0.32]], z, glossy(fold, { roughness: 0.45, clearcoat: 0.2 })));
  // The white inset ribbon stands proud of the shield's own face (a real raised plaque,
  // not a flat decal) so the badge reads as genuinely dimensional up close.
  const inset: Array<[number, number]> = [
    [-0.27, 0.3], [0.27, 0.3], [0.27, -0.02], [0.18, -0.46], [0, -0.56], [-0.18, -0.46], [-0.27, -0.02],
  ];
  const insetDepth = 0.07;
  const insetMesh = extrude(new THREE.Shape(inset.map(([x, y]) => new THREE.Vector2(x, y))), insetDepth, glossy('#F4F3EF', { roughness: 0.25 }));
  insetMesh.position.z = z;
  group.add(insetMesh);
  group.add(glyphs(numeral, 0.46, 0, -0.13, z + frontOf(insetDepth) + LIFT, glossy(base, { roughness: 0.25 })));
  return group;
}

function jsSquare() {
  const group = new THREE.Group();
  const depth = 0.24;
  const half = 0.5;
  const round = 0.07;
  const square = new THREE.Shape();
  square.moveTo(-half + round, -half);
  square.lineTo(half - round, -half);
  square.quadraticCurveTo(half, -half, half, -half + round);
  square.lineTo(half, half - round);
  square.quadraticCurveTo(half, half, half - round, half);
  square.lineTo(-half + round, half);
  square.quadraticCurveTo(-half, half, -half, half - round);
  square.lineTo(-half, -half + round);
  square.quadraticCurveTo(-half, -half, -half + round, -half);
  group.add(extrude(square, depth, glossy('#F7DF1E', { roughness: 0.35 })));
  group.add(glyphs('JS', 0.4, 0.17, -0.22, frontOf(depth), glossy('#1A1A1A', { roughness: 0.4 })));
  return group;
}

function createWeb() {
  const group = new THREE.Group();
  const tiles = [shield('#E44D26', '#A8350F', '5'), shield('#1572B6', '#0D4C87', '3'), jsSquare()];
  tiles.forEach((tile, i) => {
    const offset = i - 1;
    tile.position.set(offset * 1.18, 0, -Math.abs(offset) * 0.22);
    tile.rotation.y = -offset * 0.28;
    group.add(tile);
  });
  group.scale.setScalar(0.72);
  return {
    object: group,
    // The tiles bob slightly out of step, like cards held in the air.
    update: (time: number) => tiles.forEach((tile, i) => (tile.position.y = Math.sin(time * 0.9 + i * 1.3) * 0.05)),
  };
}

/* --- Java: a glazed cup on a saucer, with two curls of steam --- */
function createJava() {
  const group = new THREE.Group();
  const glaze = glossy('#5382A1', { roughness: 0.2 });
  const cupProfile = [
    [0, 0], [0.42, 0], [0.47, 0.05], [0.56, 0.45], [0.62, 0.86], [0.6, 0.88], [0.54, 0.86], [0.48, 0.47], [0.4, 0.1], [0, 0.1],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 36), glaze);
  group.add(cup);

  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.555, 64), glossy('#3B2416', { roughness: 0.12, clearcoat: 0.6 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.78;
  group.add(coffee);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 20, 48, Math.PI * 1.25), glaze);
  handle.position.set(0.6, 0.47, 0);
  handle.rotation.z = -Math.PI * 0.62;
  group.add(handle);

  const saucerProfile = [[0, -0.06], [0.75, -0.04], [0.92, 0.04], [0.9, 0.07], [0.72, 0.01], [0, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  group.add(new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, 36), glaze));

  // Steam: two parallel S-curls in the Java orange, rising side by side and swaying together.
  const steam = new THREE.Group();
  const steamMaterial = glossy('#E76F00', { roughness: 0.4, emissive: '#7A2E00', emissiveIntensity: 0.3 });
  [-1, 1].forEach((side, k) => {
    const points = Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      return new THREE.Vector3(side * 0.13 + Math.sin(t * Math.PI * 2 + k * 0.6) * 0.1, 0.95 + t * (0.72 - k * 0.12), Math.cos(t * Math.PI * 2) * 0.04);
    });
    steam.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.04 - k * 0.006, 8, false), steamMaterial));
  });
  group.add(steam);

  group.position.y = -0.85;
  group.rotation.x = 0.22;
  const holder = new THREE.Group();
  holder.add(group);
  return { object: holder, update: (time: number) => (steam.rotation.y = Math.sin(time * 0.7) * 0.5) };
}

/* --- DSA: a four-level binary tree; a traversal walks it, node by node, in level order --- */
function createTree() {
  const group = new THREE.Group();
  const levels = 4;
  const nodes: Array<{ position: THREE.Vector3; material: THREE.MeshPhysicalMaterial }> = [];
  const edgeMaterial = new THREE.MeshPhysicalMaterial({ color: '#C9D4E3', metalness: 0.85, roughness: 0.28 });
  const up = new THREE.Vector3(0, 1, 0);
  for (let level = 0; level < levels; level++) {
    const count = 2 ** level;
    for (let k = 0; k < count; k++) {
      const position = new THREE.Vector3(((k + 0.5) / count) * 2.4 - 1.2, 0.95 - level * 0.62, Math.sin(k * 1.7 + level) * 0.12 * level);
      const material = glossy('#1F7F91', { roughness: 0.18, emissive: '#7FE6F0', emissiveIntensity: 0.05 });
      const node = new THREE.Mesh(new THREE.SphereGeometry(level === 0 ? 0.15 : 0.12, 32, 24), material);
      node.position.copy(position);
      group.add(node);
      nodes.push({ position, material });
      if (level > 0) {
        // Edge from this node up to its parent.
        const parent = nodes[2 ** (level - 1) - 1 + Math.floor(k / 2)].position;
        const span = new THREE.Vector3().subVectors(parent, position);
        const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, span.length(), 12), edgeMaterial);
        edge.position.copy(position).addScaledVector(span, 0.5);
        edge.quaternion.setFromUnitVectors(up, span.normalize());
        group.add(edge);
      }
    }
  }
  // A small plaque beneath the root, so the structure reads as "DSA" at a glance.
  const plaque = glyphs('DSA', 0.26, 0, -1.55, 0.02, glossy('#C9D4E3', { roughness: 0.2, metalness: 0.6 }));
  group.add(plaque);

  group.scale.setScalar(0.85);
  const period = 5;
  return {
    object: group,
    update: (time: number) => {
      const visit = ((time % period) / period) * (nodes.length + 3);
      nodes.forEach(({ material }, i) => {
        material.emissiveIntensity = 0.05 + Math.max(0, 1 - Math.abs(visit - i) * 0.7) * 1.6;
      });
    },
  };
}

/* --- Shared pieces for the club objects ----------------------------- */

const chrome = (color = '#D5DAE1') => new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.22 });
const gold = () => new THREE.MeshPhysicalMaterial({ color: '#E2B14A', metalness: 1, roughness: 0.22, clearcoat: 0.3 });
const glass = () =>
  new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });

const lathe = (points: Array<[number, number]>, material: THREE.Material, segments = 40) =>
  new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);

/* A texture drawn on a canvas: dials, screens. */
function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

let glowTexture: THREE.Texture | null = null;
function glowSprite(color: string, scale: number, opacity: number) {
  glowTexture ??= createGlowTexture();
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

/* --- Awareness: a glowing incandescent bulb ------------------------- */
function createBulb() {
  const group = new THREE.Group();
  const outline: Array<[number, number]> = [[0.27, -0.55], [0.28, -0.45], [0.3, -0.33]];
  for (let i = 0; i <= 24; i++) {
    const a = THREE.MathUtils.degToRad(-55 + (145 * i) / 24);
    outline.push([Math.cos(a) * 0.6, 0.25 + Math.sin(a) * 0.6]);
  }
  group.add(lathe(outline.map(([x, y]) => [Math.max(x, 0.0001), y] as [number, number]), glass()));

  // Filament: a coil strung between two support wires.
  const wire = chrome('#AEB4BD');
  const coil = new THREE.CatmullRomCurve3(
    Array.from({ length: 80 }, (_, i) => {
      const t = i / 79;
      const a = t * Math.PI * 2 * 9;
      return new THREE.Vector3(-0.17 + t * 0.34, 0.16 + Math.sin(a) * 0.035, Math.cos(a) * 0.035);
    }),
  );
  const filamentMaterial = new THREE.MeshStandardMaterial({ color: '#2A1A10', emissive: '#FFB15C', emissiveIntensity: 3 });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(coil, 100, 0.008, 6, false), filamentMaterial));
  [-1, 1].forEach((side) => {
    const support = new THREE.CatmullRomCurve3([new THREE.Vector3(side * 0.06, -0.52, 0), new THREE.Vector3(side * 0.1, -0.15, 0), new THREE.Vector3(side * 0.17, 0.16, 0)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(support, 24, 0.009, 6, false), wire));
  });
  const glow = glowSprite('#FFC27A', 1.5, 0.55);
  glow.position.y = 0.18;
  group.add(glow);

  // Screw base: threads, insulator and contact.
  const threads: Array<[number, number]> = [];
  for (let i = 0; i <= 10; i++) threads.push([i % 2 ? 0.25 : 0.29, -0.56 - i * 0.035]);
  threads.push([0.2, -0.95], [0.12, -0.98], [0, -0.98]);
  group.add(lathe([[0, -0.55], [0.29, -0.55], ...threads], chrome('#C9CED6')));
  const tip = lathe([[0, -1.06], [0.08, -1.04], [0.1, -0.98], [0, -0.98]], new THREE.MeshStandardMaterial({ color: '#15171B', roughness: 0.5 }));
  group.add(tip);

  group.position.y = 0.08;
  return {
    object: group,
    update: (time: number) => {
      const flicker = 0.92 + Math.sin(time * 2.1) * 0.05 + Math.sin(time * 5.3) * 0.03;
      filamentMaterial.emissiveIntensity = 3 * flicker;
      glow.material.opacity = 0.55 * flicker;
    },
  };
}

/* --- C workshops: a laptop with C on screen ------------------------- */
const CODE: Array<Array<[string, string]>> = [
  [['#include ', '#FF7A59'], ['<stdio.h>', '#9ECE6A']],
  [],
  [['int ', '#7AA2F7'], ['main', '#E0AF68'], ['(', '#C0CAF5'], ['void', '#7AA2F7'], [') {', '#C0CAF5']],
  [['    printf', '#E0AF68'], ['(', '#C0CAF5'], ['"Hello, SRKR!\\n"', '#9ECE6A'], [');', '#C0CAF5']],
  [['    return ', '#BB9AF7'], ['0', '#FF9E64'], [';', '#C0CAF5']],
  [['}', '#C0CAF5']],
];

function screenTexture() {
  return canvasTexture(1024, 620, (ctx) => {
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, 1024, 620);
    ctx.fillStyle = '#161B22';
    ctx.fillRect(0, 0, 1024, 54);
    ['#FF5F56', '#FFBD2E', '#27C93F'].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(34 + i * 30, 27, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#8B949E';
    ctx.font = '24px Consolas, "Courier New", monospace';
    ctx.fillText('hello.c', 150, 35);
    ctx.font = '34px Consolas, "Courier New", monospace';
    CODE.forEach((line, row) => {
      const y = 120 + row * 58;
      ctx.fillStyle = '#484F58';
      ctx.fillText(String(row + 1).padStart(2, ' '), 26, y);
      let x = 100;
      line.forEach(([text, color]) => {
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      });
    });
    ctx.fillStyle = '#58A6FF';
    ctx.fillRect(100, 120 + 6 * 58 - 30, 16, 38);
  });
}

function roundedRect(width: number, height: number, round: number) {
  const w = width / 2;
  const h = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w + round, -h);
  shape.lineTo(w - round, -h);
  shape.quadraticCurveTo(w, -h, w, -h + round);
  shape.lineTo(w, h - round);
  shape.quadraticCurveTo(w, h, w - round, h);
  shape.lineTo(-w + round, h);
  shape.quadraticCurveTo(-w, h, -w, h - round);
  shape.lineTo(-w, -h + round);
  shape.quadraticCurveTo(-w, -h, -w + round, -h);
  return shape;
}

function createLaptop() {
  const group = new THREE.Group();
  const aluminium = new THREE.MeshPhysicalMaterial({ color: '#AEB3BB', metalness: 0.9, roughness: 0.32 });
  const slab = (width: number, height: number, depth: number) =>
    new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(width, height, 0.06), { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 12 }), aluminium);

  // Base, lying flat in front of the hinge.
  const base = new THREE.Group();
  const deck = slab(2, 1.36, 0.06);
  base.add(deck);
  const keyboard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.74, 0.66),
    new THREE.MeshStandardMaterial({
      roughness: 0.7,
      map: canvasTexture(870, 330, (ctx) => {
        ctx.fillStyle = '#9DA2AA';
        ctx.fillRect(0, 0, 870, 330);
        for (let row = 0; row < 5; row++)
          for (let col = 0; col < 14; col++) {
            ctx.fillStyle = '#1C1F25';
            const w = row === 4 && col > 3 && col < 10 ? 0 : 52;
            if (w) ctx.fillRect(8 + col * 61.5, 10 + row * 63, w, 52);
          }
        ctx.fillStyle = '#1C1F25';
        ctx.fillRect(8 + 4 * 61.5, 10 + 4 * 63, 6 * 61.5 - 9, 52);
      }),
    }),
  );
  keyboard.position.set(0, 0.24, 0.075);
  base.add(keyboard);
  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.4), new THREE.MeshPhysicalMaterial({ color: '#B9BEC6', metalness: 0.6, roughness: 0.25 }));
  trackpad.position.set(0, -0.36, 0.075);
  base.add(trackpad);
  base.rotation.x = -Math.PI / 2;
  base.position.z = 0.68;
  group.add(base);

  // Lid, hinged at the back edge and opened a little past upright.
  const lid = new THREE.Group();
  const shell = slab(2, 1.3, 0.04);
  shell.position.set(0, 0.65, -0.05);
  lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.24), new THREE.MeshStandardMaterial({ color: '#0B0C0F', roughness: 0.3 }));
  bezel.position.set(0, 0.65, 0.002);
  lid.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.09), new THREE.MeshBasicMaterial({ map: screenTexture() }));
  screen.position.set(0, 0.66, 0.004);
  lid.add(screen);
  lid.rotation.x = -0.22;
  group.add(lid);

  group.position.set(0, -0.35, -0.2);
  // Tipped toward the viewer, so the keyboard and the screen both read.
  group.rotation.x = 0.5;
  const holder = new THREE.Group();
  holder.add(group);
  return { object: holder, update: () => {} };
}

/* --- DSA crash course: a chrome stopwatch, running -------------------- */
/* A horizontal band of repeating "DSA" lettering, wrapped around the rocket's body. */
function rocketBandTexture() {
  return canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = '#1B2A4A';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#F4C04E';
    ctx.font = 'bold 150px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) ctx.fillText('DSA', 128 + i * 256, 132);
  });
}

/* --- DSA crash course: a rocket mid-launch, climbing fast -------------------- */
function createRocket() {
  const group = new THREE.Group();

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 28), glossy('#C0392B', { roughness: 0.3, clearcoat: 0.6 }));
  nose.position.y = 0.95;
  group.add(nose);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.1, 28), glossy('#E9E4D8', { roughness: 0.3, clearcoat: 0.5 }));
  body.position.y = 0.15;
  group.add(body);

  // The "DSA" band, wrapped around the body like a mission patch.
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.385, 0.385, 0.26, 28, 1, true),
    new THREE.MeshStandardMaterial({ map: rocketBandTexture(), roughness: 0.4 }),
  );
  band.position.y = 0.2;
  group.add(band);

  // A porthole window.
  const porthole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), glass());
  porthole.position.set(0, 0.55, 0.345);
  group.add(porthole);
  const portholeRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 12, 24), chrome());
  portholeRing.position.set(0, 0.55, 0.345);
  group.add(portholeRing);

  // Three swept fins, spaced evenly around the base.
  const finShape = new THREE.Shape([[0, 0.28], [0.3, -0.1], [0.3, -0.28], [0, -0.05]].map(([x, y]) => new THREE.Vector2(x, y)));
  const finMaterial = glossy('#C0392B', { roughness: 0.35, clearcoat: 0.4 });
  for (let i = 0; i < 3; i++) {
    const fin = extrude(finShape, 0.045, finMaterial);
    fin.position.set(0.37, -0.42, -0.0225);
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    pivot.add(fin);
    group.add(pivot);
  }

  // The exhaust flame, flickering as it burns.
  const flameMaterial = new THREE.MeshStandardMaterial({ color: '#FFB347', emissive: '#FF7A00', emissiveIntensity: 1.6, roughness: 0.5 });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 20), flameMaterial);
  flame.rotation.x = Math.PI;
  flame.position.y = -0.75;
  group.add(flame);
  const flameGlow = glowSprite('#FFA94D', 1.3, 0.5);
  flameGlow.position.y = -0.85;
  group.add(flameGlow);

  group.position.y = -0.05;
  group.rotation.z = 0.08; // A slight climbing tilt.
  const holder = new THREE.Group();
  holder.add(group);
  return {
    object: holder,
    update: (time: number) => {
      const flicker = 0.85 + Math.sin(time * 14) * 0.1 + Math.sin(time * 27) * 0.06;
      flame.scale.set(1, flicker, 1);
      flameMaterial.emissiveIntensity = 1.4 + Math.sin(time * 10) * 0.4;
      flameGlow.material.opacity = 0.45 * flicker;
      holder.position.y = Math.sin(time * 1.3) * 0.04;
    },
  };
}

/* --- Coding events: a gold trophy on a black plinth ------------------ */
function createTrophy() {
  const group = new THREE.Group();
  const metal = gold();
  group.add(
    lathe(
      [[0, -0.62], [0.1, -0.62], [0.09, -0.45], [0.07, -0.3], [0.14, -0.22], [0.3, -0.12], [0.48, 0.08], [0.6, 0.35], [0.66, 0.62], [0.68, 0.72], [0.63, 0.72], [0.6, 0.62], [0.54, 0.36], [0.42, 0.12], [0.25, -0.04], [0, -0.08]],
      metal,
    ),
  );
  [-1, 1].forEach((side) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 16, 48, Math.PI * 1.15), metal);
    handle.position.set(side * 0.6, 0.38, 0);
    // Centre the arc on the outside of the cup, so both ends meet the bowl.
    handle.rotation.z = (side > 0 ? 0 : Math.PI) - Math.PI * 0.575;
    group.add(handle);
  });
  const foot = lathe([[0, -0.7], [0.3, -0.7], [0.32, -0.66], [0.2, -0.62], [0, -0.62]], metal);
  group.add(foot);
  const plinth = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(0.9, 0.6, 0.05), { depth: 0.28, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }),
    new THREE.MeshPhysicalMaterial({ color: '#15171C', roughness: 0.25, clearcoat: 1 }),
  );
  plinth.rotation.x = -Math.PI / 2;
  plinth.position.set(0, -0.98, 0.3);
  group.add(plinth);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), metal);
  plate.position.set(0, -0.84, 0.322);
  group.add(plate);
  group.position.y = 0.12;
  return { object: group, update: () => {} };
}

/* --- HACKoverflow: the </> mark, in solid orange and gold ------------ */
function createBrackets() {
  const group = new THREE.Group();
  const polygon = (points: Array<[number, number]>) => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const chevron = (direction: number) =>
    polygon([[-0.3, 0.55], [-0.95, 0], [-0.3, -0.55], [-0.16, -0.4], [-0.64, 0], [-0.16, 0.4]].map(([x, y]) => [x * direction, y] as [number, number]));
  const orange = glossy('#F25C05', { roughness: 0.38, clearcoat: 0.5 });
  const left = extrude(chevron(1), 0.24, orange);
  const right = extrude(chevron(-1), 0.24, orange);
  const GAP = 0.22;
  const slash = extrude(polygon([[0.13, 0.66], [0.29, 0.66], [-0.13, -0.66], [-0.29, -0.66]]), 0.24, glossy('#FFB13B', { roughness: 0.3, metalness: 0.4 }));
  group.add(left, right, slash);
  group.position.z = -0.14;
  group.scale.setScalar(0.92);
  return {
    object: group,
    // The brackets breathe apart and back, like code being opened up.
    update: (time: number) => {
      const spread = Math.sin(time * 1.1) * 0.035;
      left.position.x = -GAP - spread;
      right.position.x = GAP + spread;
    },
  };
}

/* A simple teardrop flame outline, for the calendar's streak accent. */
function flameShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.11);
  shape.quadraticCurveTo(0.09, 0, 0, 0.17);
  shape.quadraticCurveTo(-0.09, 0, 0, -0.11);
  shape.closePath();
  return shape;
}

/* --- CodeQuest: a daily flip-calendar - a new problem every day, a streak kept ------- */
function createCalendar() {
  const group = new THREE.Group();
  const depth = 0.16;
  const card = extrude(roundedRect(1.1, 1.3, 0.08), depth, glossy('#F4F1EA', { roughness: 0.3 }));
  group.add(card);
  const z = frontOf(depth);

  // The header band naming the day.
  group.add(face([[-0.55, 0.65], [0.55, 0.65], [0.55, 0.38], [-0.55, 0.38]], z, glossy('#C2410C', { roughness: 0.35 })));
  // Binder rings, hanging from the top like a desk calendar.
  [-0.3, 0.3].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 12, 24), chrome());
    ring.position.set(x, 0.7, z * 0.5);
    group.add(ring);
  });
  // The streak flame, lit in the header's corner.
  const flameMaterial = new THREE.MeshStandardMaterial({ color: '#FFB347', emissive: '#FF7A00', emissiveIntensity: 1.3, roughness: 0.4 });
  const flame = extrude(flameShape(), 0.05, flameMaterial);
  flame.position.set(0.4, 0.5, z);
  group.add(flame);

  // Today's problem, front and centre.
  const bracket = glyphs('</>', 0.42, 0, -0.02, z + LIFT, glossy('#8B2E3B', { roughness: 0.3 }));
  group.add(bracket);

  // The streak, ticked off along the bottom - solved days behind, today still ahead.
  for (let i = 0; i < 5; i++) {
    const solved = i < 4;
    const tick = new THREE.Mesh(
      new THREE.CircleGeometry(0.055, 20),
      new THREE.MeshStandardMaterial({
        color: solved ? '#FF7A00' : '#D8D2C4', emissive: solved ? '#7A2E00' : '#000000', emissiveIntensity: solved ? 0.5 : 0, roughness: 0.3,
      }),
    );
    tick.position.set(-0.42 + i * 0.21, -0.48, z + LIFT);
    group.add(tick);
  }

  group.position.y = -0.05;
  return {
    object: group,
    update: (time: number) => {
      const pulse = 1 + Math.sin(time * 1.6) * 0.04;
      bracket.scale.set(pulse, pulse, 1);
      flameMaterial.emissiveIntensity = 1.1 + Math.sin(time * 5) * 0.3 + Math.sin(time * 11) * 0.15;
    },
  };
}

/* A black-and-white checkered racing-flag pattern. */
function checkerTexture() {
  return canvasTexture(256, 160, (ctx) => {
    const cols = 8;
    const rows = 5;
    const cw = 256 / cols;
    const ch = 160 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#F5F5F0' : '#15171C';
        ctx.fillRect(c * cw, r * ch, cw, ch);
      }
    }
  });
}

/* --- EdgeCase: a checkered racing flag - race the clock, every two weeks ----------- */
function createFlag() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.9, 16), chrome());
  pole.position.y = -0.1;
  group.add(pole);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), chrome('#E2B14A'));
  finial.position.y = 0.85;
  group.add(finial);

  // The cloth: a subdivided plane that ripples, pinned at the pole and free at its far edge.
  const width = 0.95;
  const height = 0.62;
  const geometry = new THREE.PlaneGeometry(width, height, 14, 8);
  const material = new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.6, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(geometry, material);
  cloth.position.set(width / 2 + 0.05, 0.5, 0);
  group.add(cloth);

  group.position.y = -0.05;
  const holder = new THREE.Group();
  holder.add(group);
  return {
    object: holder,
    update: (time: number) => {
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const wave = Math.sin(x * 5 - time * 4.5) * 0.08 * ((x + width / 2) / width);
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      holder.rotation.y = Math.sin(time * 0.3) * 0.12;
    },
  };
}

/* --- IconCoders: a winner's podium - the club's flagship championship -------------- */
function createPodium() {
  const group = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#E2B14A', metalness: 1, roughness: 0.2, clearcoat: 0.5 });
  const silver = new THREE.MeshPhysicalMaterial({ color: '#C7CDD6', metalness: 1, roughness: 0.25, clearcoat: 0.35 });
  const bronze = new THREE.MeshPhysicalMaterial({ color: '#B5793F', metalness: 1, roughness: 0.28, clearcoat: 0.35 });
  const ground = -0.55;
  const blockDepth = 0.4;
  const numeralMaterial = glossy('#1A1A1A', { roughness: 0.35, metalness: 0.2 });

  const block = (x: number, width: number, height: number, material: THREE.MeshPhysicalMaterial, numeral: string) => {
    const mesh = extrude(roundedRect(width, height, 0.05), blockDepth, material);
    mesh.position.set(x, ground + height / 2, 0);
    group.add(mesh);
    group.add(glyphs(numeral, 0.26, x, ground + height - 0.24, frontOf(blockDepth) + LIFT, numeralMaterial));
    return height;
  };

  block(-0.64, 0.52, 0.62, silver, '2');
  const firstHeight = block(0, 0.56, 0.92, gold, '1');
  block(0.64, 0.52, 0.48, bronze, '3');

  // A star standing on the winner's block.
  const star = new THREE.Shape();
  const spikes = 5;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 0.16 : 0.07;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const starMesh = extrude(star, 0.05, gold);
  starMesh.position.set(0, ground + firstHeight + 0.22, 0);
  group.add(starMesh);

  // A ring on the ground that pulses outward - the contest going live again, every two weeks.
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: '#1B2A4A', emissive: '#2F63FF', emissiveIntensity: 1.2, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.44, 48), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = ground - 0.01;
  group.add(ring);

  const holder = new THREE.Group();
  holder.add(group);
  return {
    object: holder,
    update: (time: number) => {
      const t = (time * 0.35) % 1;
      ring.scale.setScalar(0.6 + t * 1.8);
      ringMaterial.opacity = 0.65 * (1 - t);
      starMesh.rotation.y = time * 0.8;
      holder.rotation.y = Math.sin(time * 0.3) * 0.18;
    },
  };
}

const BUILDERS: Record<Emblem, () => { object: THREE.Object3D; update: (time: number) => void }> = {
  c: createC,
  web: createWeb,
  java: createJava,
  tree: createTree,
  bulb: createBulb,
  laptop: createLaptop,
  rocket: createRocket,
  trophy: createTrophy,
  brackets: createBrackets,
  calendar: createCalendar,
  podium: createPodium,
  flag: createFlag,
};

export function createEmblem(kind: Emblem) {
  return BUILDERS[kind]();
}
