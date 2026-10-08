/* ------------------------------------------------------------------ */
/* Copy for the home page journey. Claims stay to what the club has   */
/* confirmed: the programs themselves, CodeQuest's daily problems,    */
/* EdgeCase's two-week cadence and HackOverflow's 24-hour format.     */
/* Dates, prizes, team sizes and descriptions come from the API.      */
/* ------------------------------------------------------------------ */

export const JOURNEY_STAGES = ['Discover', 'Learn', 'Practice', 'Compete', 'Build', 'Belong'] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface ChapterCopy {
  id: string;
  number: string;
  stage: JourneyStage;
  program: string;
  title: string;
  body: string;
  outcome: string;
  cta: { label: string; href: string };
}

export const CHAPTERS = {
  awareness: {
    id: 'awareness',
    number: '01',
    stage: 'Discover',
    program: 'Awareness sessions',
    title: 'Every journey starts with curiosity.',
    body: 'Awareness sessions are where it begins. No experience needed: we show you what programming is, what the club does, and where you could take it.',
    outcome: 'You leave knowing where to start.',
    cta: { label: 'Find the next session', href: '/events' },
  },
  cWorkshop: {
    id: 'c-workshops',
    number: '02',
    stage: 'Learn',
    program: 'C workshops',
    title: 'Then you write your first real program.',
    body: 'Hands-on C workshops take you from an empty file to a program that compiles and runs. You write every line yourself.',
    outcome: 'You leave with code you wrote and understand.',
    cta: { label: 'Explore C workshops', href: '/events' },
  },
  dsa: {
    id: 'dsa',
    number: '03',
    stage: 'Learn',
    program: 'DSA crash course',
    title: 'Coding isn’t just typing. It’s thinking.',
    body: 'The DSA crash course teaches the ideas behind problem solving: how to organise data, and how to choose the steps that reach an answer efficiently.',
    outcome: 'You start seeing problems as structures.',
    cta: { label: 'Build your problem-solving skills', href: '/events' },
  },
  codeQuest: {
    id: 'codequest',
    number: '04',
    stage: 'Practice',
    program: 'CodeQuest',
    title: 'Skill comes from consistency.',
    body: 'CodeQuest puts a new problem in front of you every day. Solve it, keep your streak going, and let the habit compound.',
    outcome: 'Small daily wins become real fluency.',
    cta: { label: 'Start CodeQuest', href: '/codequest' },
  },
  edgeCase: {
    id: 'edgecase',
    number: '05',
    stage: 'Compete',
    program: 'EdgeCase',
    title: 'Now test yourself.',
    body: 'EdgeCase is the club’s coding contest, held every two weeks. Race the clock, see where you rank, and come back sharper for the next round.',
    outcome: 'Every round shows you how far you’ve come.',
    cta: { label: 'Enter EdgeCase', href: '/events' },
  },
  hackOverflow: {
    id: 'hackoverflow',
    number: '06',
    stage: 'Build',
    program: 'HackOverflow',
    title: 'You’ve learned. You’ve practiced. Now build.',
    body: 'HackOverflow is our 24-hour hackathon. Teams take an idea through the night to a working prototype, then present it to the judges.',
    outcome: 'Everything you learned becomes something real.',
    cta: { label: 'See HackOverflow', href: '/hackathons' },
  },
  iconCoders: {
    id: 'iconcoders',
    number: '07',
    stage: 'Build',
    program: 'IconCoders',
    title: 'Build. Show. Learn. Inspire.',
    // Shown only when the API has no IconCoders description - no story is invented here.
    body: 'Each IconCoders edition, with its theme and details, is published on the IconCoders page.',
    outcome: '',
    cta: { label: 'Explore IconCoders', href: '/iconcoders' },
  },
} satisfies Record<string, ChapterCopy>;
