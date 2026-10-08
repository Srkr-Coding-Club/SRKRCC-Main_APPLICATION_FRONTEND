/* ------------------------------------------------------------------ */
/* The SRKR Coding Club solar system: the club is the Sun, and every  */
/* technology era and club program is a world on its own orbit, drawn */
/* as a realistic 3D object that stands for it (see webgl/emblems.ts).*/
/* This one configuration drives the WebGL scene, the story panels,   */
/* the orbital navigation and the scroll timing.                      */
/* ------------------------------------------------------------------ */

export type PlanetChapter = 'technology' | 'club';

/* Technology eras: the C hexagon, the HTML/CSS/JS shields, the Java cup, a binary tree.  */
/* Club programs: a light bulb (awareness), a laptop with C code (workshops), a rocket    */
/* (crash course), a trophy (events), the </> mark (hackathon), a daily flip-calendar     */
/* (CodeQuest), a winner's podium (IconCoders, the flagship championship) and a           */
/* checkered racing flag (EdgeCase, the biweekly DSA contest).                            */
export type Emblem =
  | 'c'
  | 'web'
  | 'java'
  | 'tree'
  | 'bulb'
  | 'laptop'
  | 'rocket'
  | 'trophy'
  | 'brackets'
  | 'calendar'
  | 'podium'
  | 'flag';

export interface PlanetSpec {
  id: string;
  chapter: PlanetChapter;
  eyebrow: string;
  title: string;
  statement: string;
  href: string;
  cta: string;
  /* Orbit radius and starting position on it (radians), in world units around the Sun at the origin.    */
  /* Starting angles are tuned so no stop crosses the camera's path or crowds another's encounter.   */
  orbit: number;
  angle: number;
  lift: number;
  /* The object's half-size, which also sets how close the camera comes. */
  radius: number;
  emblem: Emblem;
  /* Which side of the frame the stop holds during its encounter; the story panel takes the other. */
  side: 'left' | 'right';
}

export const PLANETS: PlanetSpec[] = [
  {
    id: 'foundations', chapter: 'technology', eyebrow: 'Foundations', title: 'C Programming', statement: 'Where problem solving begins.',
    href: '/events', cta: 'Explore', orbit: 17, angle: 3.7, lift: 0.8, radius: 1.7, emblem: 'c', side: 'left',
  },
  {
    id: 'web-era', chapter: 'technology', eyebrow: 'The web era', title: 'HTML · CSS · JavaScript', statement: 'Turning ideas into interfaces.',
    href: '/events', cta: 'Explore', orbit: 23, angle: 0.2, lift: -1, radius: 1.9, emblem: 'web', side: 'right',
  },
  {
    id: 'systems', chapter: 'technology', eyebrow: 'Building systems', title: 'Java · Backend · Engineering', statement: 'From algorithms to applications.',
    href: '/events', cta: 'Explore', orbit: 29, angle: 2.78, lift: 1.2, radius: 2.2, emblem: 'java', side: 'left',
  },
  {
    id: 'dsa', chapter: 'technology', eyebrow: 'Think differently', title: 'DSA', statement: 'Learn to solve before learning to code.',
    href: '/events', cta: 'Explore', orbit: 36, angle: 5, lift: -0.6, radius: 2.0, emblem: 'tree', side: 'right',
  },
  {
    id: 'awareness', chapter: 'club', eyebrow: 'Awareness sessions', title: 'Awareness', statement: 'Understand. Question. Explore.',
    href: '/events', cta: 'Find a session', orbit: 43, angle: 5.48, lift: 1, radius: 2.0, emblem: 'bulb', side: 'left',
  },
  {
    id: 'c-workshops', chapter: 'club', eyebrow: 'C workshops', title: 'C Workshops', statement: 'From syntax to problem solving.',
    href: '/events', cta: 'See workshops', orbit: 50, angle: 0.52, lift: -1.2, radius: 2.2, emblem: 'laptop', side: 'right',
  },
  {
    id: 'dsa-crash-course', chapter: 'club', eyebrow: 'DSA crash course', title: 'DSA Crash Course', statement: 'Think faster. Solve smarter.',
    href: '/events', cta: 'Join the course', orbit: 57, angle: 1.77, lift: 0.9, radius: 2.0, emblem: 'rocket', side: 'left',
  },
  {
    id: 'coding-events', chapter: 'club', eyebrow: 'Coding events', title: 'Coding Events', statement: 'Where curiosity becomes competition.',
    href: '/events', cta: 'See events', orbit: 64, angle: 3.1, lift: -0.8, radius: 2.2, emblem: 'trophy', side: 'right',
  },
  {
    id: 'hackoverflow', chapter: 'club', eyebrow: '24-hour hackathon', title: 'HACKoverflow', statement: 'Build. Break. Rebuild.',
    href: '/hackathons', cta: 'Explore HACKoverflow', orbit: 72, angle: 3.9, lift: 1.4, radius: 2.2, emblem: 'brackets', side: 'left',
  },
  {
    id: 'codequest', chapter: 'club', eyebrow: 'Daily problems', title: 'CodeQuest', statement: 'A journey through problems, projects and possibilities.',
    href: '/codequest', cta: 'Start CodeQuest', orbit: 80, angle: 5.34, lift: -1, radius: 2.0, emblem: 'calendar', side: 'right',
  },
  {
    id: 'iconcoders', chapter: 'club', eyebrow: 'Community', title: 'IconCoders', statement: 'Learn from builders.',
    href: '/iconcoders', cta: 'Explore IconCoders', orbit: 88, angle: 0.38, lift: 1.1, radius: 2.2, emblem: 'podium', side: 'left',
  },
  {
    id: 'edgecase', chapter: 'club', eyebrow: 'Bi-weekly contests', title: 'EdgeCase', statement: 'Bi-weekly. Competitive. Relentless.',
    href: '/events', cta: 'Enter EdgeCase', orbit: 97, angle: 1.43, lift: -1.3, radius: 1.9, emblem: 'flag', side: 'right',
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

/* Where a planet starts before it arrives: pulled in along its own orbital ray,   */
/* clustered close and pushed toward the camera's opening position, as though it  */
/* has just overtaken the viewer from behind. It eases out to `planetPosition`    */
/* over JOURNEY.arrival, so planets fly in and settle rather than popping in      */
/* already parked on their orbit.                                                 */
const ARRIVAL_SCALE = 0.1;
const ARRIVAL_PUSH = 90;
export function planetArrivalPosition(planet: PlanetSpec, progress: number) {
  const { x, y, z } = planetPosition(planet, progress);
  return { x: x * ARRIVAL_SCALE, y: y * ARRIVAL_SCALE, z: z * ARRIVAL_SCALE + ARRIVAL_PUSH };
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
  /* The window over which planets ease from their arrival position out to their orbit. */
  arrival: { start: 0.02, end: 0.15 },
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
