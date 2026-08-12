import Link from 'next/link';
import { Calendar, Trophy, Sparkles, Terminal, Briefcase, BookOpen, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { FeatureFlag } from '@/lib/types';

import HeroSection from '@/components/HeroSection';
import StatsBar from '@/components/StatsBar';
import AboutSection from '@/components/AboutSection';
import WhatWeDoSection from '@/components/WhatWeDoSection';
import UpcomingEventsGrid from '@/components/UpcomingEventsGrid';
import CallToActionBanner from '@/components/CallToActionBanner';

export const dynamic = 'force-dynamic';

async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await fetchApi<FeatureFlag[]>('/feature-flags/');
  } catch (error) {
    console.error('Failed to fetch feature flags from Django backend:', error);
    return [];
  }
}

export default async function HomePage() {
  const flags = await getFeatureFlags();

  const getFlagStatus = (key: string) => {
    const flag = flags.find((f) => f.key === key);
    return flag ? flag.is_enabled : true;
  };

  const modules = [
    { key: 'events', title: 'Events & Workshops', desc: 'Workshops, tech talks, seminars, and club meetups.', href: '/events', icon: Calendar, color: 'text-[#FF7A00]', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { key: 'hackathons', title: 'Hackathons Engine', desc: 'Multi-round hackathons with team formation and judging.', href: '/hackathons', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { key: 'iconcoders', title: 'IconCoders Flagship', desc: 'Flagship annual hackathon landing & Hall of Fame.', href: '/iconcoders', icon: Sparkles, color: 'text-[#8B2E3B] dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { key: 'codequest', title: 'Codequest Daily', desc: 'Daily coding problem of the day and streak tracker.', href: '/codequest', icon: Terminal, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { key: 'career', title: 'Career Opportunities', desc: 'Internships, job drives, and referral applications.', href: '/career', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { key: 'blogs', title: 'Blogs & Write-ups', desc: 'Member articles, technical tutorials, and club updates.', href: '/blogs', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] transition-colors duration-300">
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

      {/* 6. Dynamic Platform Modules Section (Backend Integrated) */}
      <section className="py-16 bg-white dark:bg-[#0D0E15] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">
                PLATFORM MODULES
              </span>
              <h2 className="text-3xl font-extrabold text-[#1A1A2E] dark:text-white mt-1">
                Explore Club Services
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-0 font-medium">
              Controlled dynamically via Django REST feature flags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              const isEnabled = getFlagStatus(m.key);

              return (
                <div
                  key={m.key}
                  className={`p-6 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isEnabled
                      ? 'bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/40 hover:shadow-lg'
                      : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-900 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${m.bg} ${m.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isEnabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white mb-2">
                      {m.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                      {m.desc}
                    </p>
                  </div>

                  {isEnabled ? (
                    <Link
                      href={m.href}
                      className="inline-flex items-center text-sm font-bold text-[#FF7A00] hover:text-[#E06B00] space-x-1"
                    >
                      <span>Open Module</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Off-season / Disabled by Admin
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Call To Action Banner */}
      <CallToActionBanner />
    </div>
  );
}

