import React from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import {
  Trophy,
  Award,
  Calendar,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getHackathons(): Promise<Hackathon[]> {
  try {
    const fetched = await fetchApi<Hackathon[]>('/hackathons/');
    if (fetched && fetched.length > 0) return fetched;
  } catch (error) {
    // Fallback to flagship hackathon catalog
  }

  return [
    {
      id: 1,
      title: 'IconCoders Flagship Hackathon 2025',
      slug: 'iconcoders-hackathon-2025',
      is_flagship: true,
      theme: 'AI for Social Good & Web3 Innovations',
      description: 'SRKR Coding Club annual flagship 36-hour hackathon. Bring your team, code overnight, present to industrial judges, and win cash awards!',
      prize_pool: '₹1,00,000 INR',
      start_date: '2025-06-15',
      end_date: '2025-06-17',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      form_slug: 'iconcoders-hackathon-2025',
      tracks: ['AI/ML & GenAI', 'Web3 & Blockchain', 'Full Stack Web & Cloud', 'Open Innovation'],
      team_size: '2 - 4 Members',
    },
    {
      id: 2,
      title: 'Summer Codefest Sprint 2025',
      slug: 'summer-codefest-2025',
      is_flagship: false,
      theme: 'Developer Productivity Tools & Automation',
      description: 'A focused 24-hour virtual hackathon dedicated to building CLI utilities, browser extensions, and workflow automation bots.',
      prize_pool: '₹25,000 INR',
      start_date: '2025-07-10',
      end_date: '2025-07-11',
      image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      tracks: ['DevTools & CLI', 'Browser Extensions', 'Automation Bots'],
      team_size: '1 - 3 Members',
    },
  ];
}

export default async function HackathonsPage() {
  const hackathons = await getHackathons();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <Trophy className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB HACKATHONS ENGINE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Build, Hack & Win Cash Prizes
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Form your hackathon squad, build real-world software prototypes, present to industry judges, and win prize pools!
            </p>
          </div>
        </div>

        {/* Hackathons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {hackathons.map((h) => (
            <div
              key={h.id}
              className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Cover Image */}
                {h.image_url && (
                  <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                    <img
                      src={h.image_url}
                      alt={h.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    />
                    <div className="absolute top-4 left-4 flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#FF7A00] px-3 py-1 rounded-md shadow">
                        Prize: {h.prize_pool}
                      </span>
                      {h.is_flagship && (
                        <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#8B2E3B] px-3 py-1 rounded-md shadow flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Flagship Edition</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Box */}
                <div className="p-6 sm:p-8 space-y-4">
                  <h3 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                    {h.title}
                  </h3>

                  <p className="text-xs font-bold text-[#FF7A00]">
                    Theme: {h.theme}
                  </p>

                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    {h.description}
                  </p>

                  {/* Tracks Pills */}
                  {h.tracks && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tracks & Categories</p>
                      <div className="flex flex-wrap gap-2">
                        {h.tracks.map((tr) => (
                          <span
                            key={tr}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-orange-50 dark:bg-orange-950/30 text-[#FF7A00] border border-orange-200 dark:border-orange-900/40"
                          >
                            {tr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Information */}
                  <div className="pt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-[#FF7A00]" />
                      <span>{h.start_date} → {h.end_date}</span>
                    </div>

                    {h.team_size && (
                      <div className="flex items-center space-x-1.5 font-mono text-[#8B2E3B] dark:text-rose-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Team: {h.team_size}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Team Registration
                </span>

                <Link
                  href={h.form_slug ? `/forms/${h.form_slug}` : '/forms'}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition"
                >
                  <span>Register Team</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
