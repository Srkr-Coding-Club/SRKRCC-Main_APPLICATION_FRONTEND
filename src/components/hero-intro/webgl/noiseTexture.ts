import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* One small tileable noise texture, baked once on the CPU, shared by  */
/* every procedural shader (galaxy discs, the Big Bang fireball).      */
/*                                                                     */
/* The shaders used to evaluate several multi-octave noise functions   */
/* per pixel, which is by far the most expensive thing in the intro.   */
/* A fetch from this texture returns the same kind of layered noise    */
/* for the price of one texture read, so the same look costs a         */
/* fraction of the GPU time - which is what lets low-end devices keep  */
/* the realistic galaxies and fireball.                                */
/*                                                                     */
/* Four independent channels (R, G, B, A) so one fetch can feed        */
/* different features without them repeating each other. Value noise,  */
/* 8 cells per tile at the base octave, 5 octaves, periodic so tiles   */
/* join without a seam.                                                */
/* ------------------------------------------------------------------ */

const BASE_CELLS = 8;
const OCTAVES = 5;

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* Periodic value noise: lattice coordinates wrap at `period` cells. */
function periodicNoise(x: number, y: number, period: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const wrap = (v: number) => ((v % period) + period) % period;
  const a = hash(wrap(x0), wrap(y0), seed);
  const b = hash(wrap(x0 + 1), wrap(y0), seed);
  const c = hash(wrap(x0), wrap(y0 + 1), seed);
  const d = hash(wrap(x0 + 1), wrap(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function createNoiseTexture(size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let channel = 0; channel < 4; channel++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let value = 0;
        let amplitude = 0.5;
        let cells = BASE_CELLS;
        for (let octave = 0; octave < OCTAVES; octave++) {
          value += amplitude * periodicNoise((x / size) * cells, (y / size) * cells, cells, channel * 31 + octave * 7 + 1);
          cells *= 2;
          amplitude *= 0.5;
        }
        data[(y * size + x) * 4 + channel] = Math.round(Math.min(1, value / 0.97) * 255);
      }
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
