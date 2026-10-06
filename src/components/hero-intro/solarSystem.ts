/* ------------------------------------------------------------------ */
/* The SRKR Coding Club solar system: the club is the Sun, and every  */
/* technology era and club program is a planet on its own orbit.      */
/* This one configuration drives the WebGL scene, the story panels,   */
/* the orbital navigation and the scroll timing.                      */
/* ------------------------------------------------------------------ */

/* Surface families, each a real planet type: cratered rock, an ocean world with clouds, */
/* a banded gas giant, a hazy ice giant, and a cracked lava world.                       */
export type PlanetSurface = 'rocky' | 'terran' | 'gas' | 'ice' | 'lava';
export type PlanetChapter = 'technology' | 'club';

export interface PlanetSpec {
  id: string;
  chapter: PlanetChapter;
  eyebrow: string;
  title: string;
  statement: string;
  href: string;
  cta: string;
  /* Orbit radius and starting position on it (radians), in world units around the Sun at the origin.    */
  /* Starting angles are tuned so no planet crosses the camera's path or crowds another's encounter. */
  orbit: number;
  angle: number;
  lift: number;
  radius: number;
  /* Axial tilt (radians). */
  tilt: number;
  surface: PlanetSurface;
  /* By surface: land/ocean/desert, light band/dark band/storm, ice/deep/haze, crust/rock/magma. */
  palette: { primary: string; secondary: string; accent: string; atmosphere: string };
  /* How strongly the atmosphere scatters light at the limb (0 = airless). */
  atmosphere: number;
  clouds?: boolean;
  ring?: { inner: number; outer: number; color: string; opacity: number };
  moons?: number;
  /* Which side of the frame the planet holds during its encounter; the story panel takes the other. */
  side: 'left' | 'right';
}

export const PLANETS: PlanetSpec[] = [
  {
    id: 'foundations', chapter: 'technology', eyebrow: 'Foundations', title: 'C Programming', statement: 'Where problem solving begins.',
    href: '/events', cta: 'Explore', orbit: 17, angle: 3.95, lift: 0.8, radius: 1.7, tilt: 0.05, surface: 'rocky',
    palette: { primary: '#A39A90', secondary: '#5A524C', accent: '#2E2926', atmosphere: '#BFB3A6' }, atmosphere: 0.1, side: 'left',
  },
  {
    id: 'web-era', chapter: 'technology', eyebrow: 'The web era', title: 'HTML · CSS · JavaScript', statement: 'Turning ideas into interfaces.',
    href: '/events', cta: 'Explore', orbit: 23, angle: 0.2, lift: -1, radius: 2.1, tilt: 0.41, surface: 'terran', clouds: true,
    palette: { primary: '#4F6B3A', secondary: '#0D2B52', accent: '#B59A6A', atmosphere: '#6FA8FF' }, atmosphere: 0.9, side: 'right',
  },
  {
    id: 'systems', chapter: 'technology', eyebrow: 'Building systems', title: 'Java · Backend · Engineering', statement: 'From algorithms to applications.',
    href: '/events', cta: 'Explore', orbit: 29, angle: 2.78, lift: 1.2, radius: 2.6, tilt: 0.47, surface: 'gas',
    palette: { primary: '#D9C49A', secondary: '#A88B5E', accent: '#E8DCC0', atmosphere: '#E8D6AE' }, atmosphere: 0.4, side: 'left',
    ring: { inner: 1.3, outer: 2.25, color: '#D8C9A8', opacity: 0.85 },
  },
  {
    id: 'dsa', chapter: 'technology', eyebrow: 'Think differently', title: 'DSA', statement: 'Learn to solve before learning to code.',
    href: '/events', cta: 'Explore', orbit: 36, angle: 4.9, lift: -0.6, radius: 2.0, tilt: 0.3, surface: 'ice',
    palette: { primary: '#9ED8DB', secondary: '#5FA9B3', accent: '#C9EEF0', atmosphere: '#A8E6F0' }, atmosphere: 0.7, side: 'right',
    ring: { inner: 1.55, outer: 1.75, color: '#B8D8DC', opacity: 0.45 },
  },
  {
    id: 'awareness', chapter: 'club', eyebrow: 'Awareness sessions', title: 'Awareness', statement: 'Understand. Question. Explore.',
    href: '/events', cta: 'Find a session', orbit: 43, angle: 5.41, lift: 1, radius: 1.9, tilt: 0.44, surface: 'rocky',
    palette: { primary: '#C27148', secondary: '#7A3A22', accent: '#4A2416', atmosphere: '#E8A27A' }, atmosphere: 0.3, side: 'left',
  },
  {
    id: 'c-workshops', chapter: 'club', eyebrow: 'C workshops', title: 'C Workshops', statement: 'From syntax to problem solving.',
    href: '/events', cta: 'See workshops', orbit: 50, angle: 0.52, lift: -1.2, radius: 2.1, tilt: 0.49, surface: 'ice',
    palette: { primary: '#3E6FD8', secondary: '#1C3A8C', accent: '#9FB9FF', atmosphere: '#6E9BFF' }, atmosphere: 0.8, side: 'right', moons: 1,
  },
  {
    id: 'dsa-crash-course', chapter: 'club', eyebrow: 'DSA crash course', title: 'DSA Crash Course', statement: 'Think faster. Solve smarter.',
    href: '/events', cta: 'Join the course', orbit: 57, angle: 1.77, lift: 0.9, radius: 2.5, tilt: 0.1, surface: 'gas',
    palette: { primary: '#A9B4E6', secondary: '#5A67A8', accent: '#E6E9FF', atmosphere: '#9AA8FF' }, atmosphere: 0.5, side: 'left',
  },
  {
    id: 'coding-events', chapter: 'club', eyebrow: 'Coding events', title: 'Coding Events', statement: 'Where curiosity becomes competition.',
    href: '/events', cta: 'See events', orbit: 64, angle: 3.1, lift: -0.8, radius: 3.0, tilt: 0.05, surface: 'gas',
    palette: { primary: '#E2C29C', secondary: '#9A6440', accent: '#B8482A', atmosphere: '#F0C89A' }, atmosphere: 0.45, side: 'right', moons: 3,
  },
  {
    id: 'hackoverflow', chapter: 'club', eyebrow: '24-hour hackathon', title: 'HACKoverflow', statement: 'Build. Break. Rebuild.',
    href: '/hackathons', cta: 'Explore HACKoverflow', orbit: 72, angle: 3.9, lift: 1.4, radius: 2.4, tilt: 0.2, surface: 'lava',
    palette: { primary: '#3A2A26', secondary: '#15100F', accent: '#FF5A1F', atmosphere: '#FF7A3A' }, atmosphere: 0.35, side: 'left',
  },
  {
    id: 'codequest', chapter: 'club', eyebrow: 'Daily problems', title: 'CodeQuest', statement: 'A journey through problems, projects and possibilities.',
    href: '/codequest', cta: 'Start CodeQuest', orbit: 80, angle: 5.34, lift: -1, radius: 2.2, tilt: 0.35, surface: 'terran', clouds: true,
    palette: { primary: '#3F7A4A', secondary: '#0E3B3A', accent: '#CDBB8A', atmosphere: '#7FF0C2' }, atmosphere: 0.85, side: 'right', moons: 2,
  },
  {
    id: 'iconcoders', chapter: 'club', eyebrow: 'Community', title: 'IconCoders', statement: 'Learn from builders.',
    href: '/iconcoders', cta: 'Explore IconCoders', orbit: 88, angle: 0.38, lift: 1.1, radius: 2.6, tilt: 0.45, surface: 'gas',
    palette: { primary: '#E3C27A', secondary: '#A97F3A', accent: '#F4E3B5', atmosphere: '#FFD88A' }, atmosphere: 0.45, side: 'left',
    ring: { inner: 1.35, outer: 2.4, color: '#E6CF98', opacity: 0.8 },
  },
  {
    id: 'edgecase', chapter: 'club', eyebrow: 'Bi-weekly contests', title: 'EdgeCase', statement: 'Bi-weekly. Competitive. Relentless.',
    href: '/events', cta: 'Enter EdgeCase', orbit: 97, angle: 1.43, lift: -1.3, radius: 2.3, tilt: 0.25, surface: 'ice',
    palette: { primary: '#4D7CFF', secondary: '#1A2E8F', accent: '#B9CCFF', atmosphere: '#86A6FF' }, atmosphere: 0.8, side: 'right',
    ring: { inner: 1.4, outer: 1.85, color: '#AFC2FF', opacity: 0.5 },
  },
];

export const SUN_RADIUS = 6;

/* How far the innermost planet travels round its orbit over the whole journey (radians). */
/* Outer planets go slower, as in a real system (angular speed falls with orbit^1.5).     */
const ORBIT_SWEEP = 1.2;
const INNER_ORBIT = 17;

/* World position of a planet on its orbit at a point in the journey: the planets orbit as you scroll. */
export function planetPosition(planet: PlanetSpec, progress = 0) {
  const angle = planet.angle + ORBIT_SWEEP * Math.pow(INNER_ORBIT / planet.orbit, 1.5) * progress;
  return { x: Math.cos(angle) * planet.orbit, y: planet.lift, z: Math.sin(angle) * planet.orbit };
}

/* ------------------------------------------------------------------ */
/* The journey, in scroll progress (0-1):                             */
/*   void and opening lines -> the Sun -> twelve planet encounters    */
/*   -> the whole system from outer space -> back to the Sun, the     */
/*   final title and invitation -> into the Sun and onto the page.    */
/* ------------------------------------------------------------------ */
export const JOURNEY = {
  openingLines: [
    { text: 'Every journey begins with curiosity.', start: 0.008, end: 0.042 },
    { text: 'Every generation builds on what came before.', start: 0.045, end: 0.078 },
  ],
  sunReveal: { start: 0.085, end: 0.135 },
  firstEncounter: 0.17,
  encounterStep: 0.06,
  /* Half-width of a planet's story window around its encounter. */
  encounterReach: 0.024,
  outerSpace: 0.885,
  finalReveal: { start: 0.912, end: 0.962 },
} as const;

export const encounterAt = (index: number) => JOURNEY.firstEncounter + index * JOURNEY.encounterStep;

/* The beats that hand the journey over to the page: into the Sun, light, the hero emerges. */
export const LAUNCH = {
  shellCrossing: 0.968,
  lightFull: 0.979,
  pageEmerges: 0.986,
} as const;
