export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export type TrackKeys = ReadonlyArray<readonly [progress: number, value: number]>;

/* A value that moves through keyframes on a Catmull-Rom spline, so motion */
/* flows through each key instead of stopping at it. Keys need not be      */
/* evenly spaced; values hold flat before the first and after the last.    */
export function createTrack(keys: TrackKeys) {
  const last = keys.length - 1;
  return (progress: number) => {
    if (progress <= keys[0][0]) return keys[0][1];
    if (progress >= keys[last][0]) return keys[last][1];
    let i = 0;
    while (progress > keys[i + 1][0]) i++;

    const [p0, v0] = keys[i];
    const [p1, v1] = keys[i + 1];
    const span = p1 - p0;
    const t = (progress - p0) / span;
    const before = keys[Math.max(0, i - 1)];
    const after = keys[Math.min(last, i + 2)];
    const m0 = i === 0 ? v1 - v0 : ((v1 - before[1]) / (p1 - before[0])) * span;
    const m1 = i + 1 === last ? v1 - v0 : ((after[1] - v0) / (after[0] - p0)) * span;

    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * m1;
  };
}

/* Critically damped follow (after Unity's SmoothDamp): eases toward the  */
/* target with inertia - fast input accelerates, slowing input settles,   */
/* reversing input turns round smoothly. Velocity lives in `state`.       */
export interface DampState {
  value: number;
  velocity: number;
}

export function smoothDamp(state: DampState, target: number, smoothTime: number, dt: number) {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = state.value - target;
  const temp = (state.velocity + omega * change) * dt;
  state.velocity = (state.velocity - omega * temp) * decay;
  let next = target + (change + temp) * decay;
  if (target - state.value > 0 === next > target) {
    next = target;
    state.velocity = 0;
  }
  state.value = next;
  return next;
}
