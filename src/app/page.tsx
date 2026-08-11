import Link from 'next/link';
import { Calendar, Trophy, Sparkles, Terminal, Briefcase, BookOpen, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api-client';
import { FeatureFlag } from '@/lib/types';

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
    const flag = flags.find(f => f.key === key);
    return flag ? flag.is_enabled : true;
  };

  const modules = [
    { key: 'events', title: 'Events & Workshops', desc: 'Workshops, tech talks, seminars, and club meetups.', href: '/events', icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { key: 'hackathons', title: 'Hackathons Engine', desc: 'Multi-round hackathons with team formation and judging.', href: '/hackathons', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { key: 'iconcoders', title: 'IconCoders Flagship', desc: 'Flagship annual hackathon landing & Hall of Fame.', href: '/iconcoders', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { key: 'codequest', title: 'Codequest Daily', desc: 'Daily coding problem of the day and streak tracker.', href: '/codequest', icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'career', title: 'Career Opportunities', desc: 'Internships, job drives, and referral applications.', href: '/career', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { key: 'blogs', title: 'Blogs & Write-ups', desc: 'Member articles, technical tutorials, and club updates.', href: '/blogs', icon: BookOpen, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center py-12 px-4 rounded-3xl glass-panel relative overflow-hidden mb-16 border border-slate-800">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>SRKR Coding Club Unified Platform</span>
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
          One Platform. <span className="gradient-text">Limitless Possibilities.</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-300 text-lg sm:text-xl leading-relaxed mb-8">
          The official central hub for SRKR Coding Club events, flagship hackathons, daily problem solving, and career drives.
        </p>

        <div className="flex justify-center space-x-4">
          <Link
            href="/events"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition shadow-lg shadow-sky-500/25"
          >
            <span>Explore Events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition border border-slate-700"
          >
            <span>Admin Control Room</span>
          </Link>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-2">Platform Modules</h2>
        <p className="text-slate-400 text-sm mb-6">Controlled dynamically via feature flags and date visibility windows.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            const isEnabled = getFlagStatus(m.key);

            return (
              <div
                key={m.key}
                className={`p-6 rounded-2xl border transition relative flex flex-col justify-between ${
                  isEnabled
                    ? 'glass-panel border-slate-800 hover:border-sky-500/40 hover:shadow-xl hover:shadow-sky-500/5'
                    : 'bg-slate-900/40 border-slate-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${m.bg} ${m.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{m.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">{m.desc}</p>
                </div>

                {isEnabled ? (
                  <Link
                    href={m.href}
                    className="inline-flex items-center text-sm font-semibold text-sky-400 hover:text-sky-300 space-x-1"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 italic">Off-season / Disabled by Admin</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
