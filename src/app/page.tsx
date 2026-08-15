import { Suspense } from 'react';

import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import AboutSection from '@/components/AboutSection';
import WhatWeDoSection from '@/components/WhatWeDoSection';
import UpcomingEventsGrid from '@/components/UpcomingEventsGrid';
import PlatformModulesSection from '@/components/PlatformModulesSection';
import PlatformModulesSkeleton from '@/components/PlatformModulesSkeleton';
import CallToActionBanner from '@/components/CallToActionBanner';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Key Metrics Stats Bar */}
      <StatsBar />

      {/* 3. About Us Section */}
      <AboutSection />

      {/* 4. What We Do Section */}
      <WhatWeDoSection />

      {/* 5. Upcoming Events Grid */}
      <UpcomingEventsGrid />

      {/* 6. Dynamic Platform Modules Section — streamed independently so a slow  */}
      {/* or offline backend never blocks the rest of the page from rendering.   */}
      <Suspense fallback={<PlatformModulesSkeleton />}>
        <PlatformModulesSection />
      </Suspense>

      {/* 7. Call To Action Banner */}
      <CallToActionBanner />
    </div>
  );
}
