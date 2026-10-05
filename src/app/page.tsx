import type { Metadata } from 'next';

import AnnouncementBanner from '@/components/AnnouncementBanner';
import HeroSection from '@/components/HeroSection';
import HeroIntro from '@/components/hero-intro/HeroIntro';
import BuiltByStudents from '@/components/landing/BuiltByStudents';
import JourneyTrace from '@/components/landing/JourneyTrace';
import ThePath from '@/components/landing/ThePath';
import UpNext from '@/components/landing/UpNext';
import YourTurn from '@/components/landing/YourTurn';
import { getLandingData } from '@/lib/landing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Home | Innovate, Code, Excel',
  description:
    'SRKR Coding Club: from your first program to your first hackathon. Awareness sessions, C workshops, the DSA crash course, daily CodeQuest problems, EdgeCase contests, HackOverflow and IconCoders.',
};

/* ------------------------------------------------------------------ */
/* Home: one story, start to finish.                                  */
/*   Enter (intro) -> where you are (hero) -> how you grow (the path) */
/*   -> what's on (up next) -> who with (built by students)           */
/*   -> your turn.                                                    */
/* ------------------------------------------------------------------ */
export default async function HomePage() {
  const data = await getLandingData();

  return (
    <div className="min-h-screen overflow-x-clip bg-journey-bg">
      <AnnouncementBanner />

      <HeroIntro>
        <HeroSection nextUp={data.nextUp} />
      </HeroIntro>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <JourneyTrace>
          <ThePath data={data} />
          <UpNext items={data.agenda} />
          <BuiltByStudents />
          <YourTurn />
        </JourneyTrace>
        <div aria-hidden="true" className="h-32 sm:h-44" />
      </div>
    </div>
  );
}
