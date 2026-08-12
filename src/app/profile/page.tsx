'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Hash,
  BookOpen,
  Award,
  Calendar,
  Flame,
  CheckCircle2,
  Settings,
  LogOut,
  Code2,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';

export default function UserProfilePage() {
  const [user, setUser] = useState({
    name: 'Rahul Sharma',
    email: 'rahul.sharma@srkr.ac.in',
    rollNumber: '21B91A0501',
    branch: 'Computer Science & Engineering',
    year: '3rd Year',
    role: 'CLUB_LEAD', // Options: MEMBER, VOLUNTEER, JUDGE, CLUB_LEAD, ADMIN
    streak: 14,
    points: 450,
    eventsCount: 3,
    projectsCount: 2,
  });

  const registeredEvents = [
    {
      id: 1,
      title: 'IconCoders Flagship Hackathon 2025',
      track: 'AI/ML & GenAI',
      date: '15 June, 2025',
      status: 'Team Registered',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 2,
      title: 'Hands-on Web Dev & Next.js Workshop',
      track: 'Frontend Engineering',
      date: '24 May, 2025',
      status: 'Seat Confirmed',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]',
    },
    {
      id: 3,
      title: 'Codequest Daily Algorithm Challenge',
      track: 'Data Structures & Algorithms',
      date: 'Ongoing Streak',
      status: 'Active Daily',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Top Profile Header Banner */}
        <div className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#FF7A00]/20 border-2 border-white dark:border-[#151722]"
              />
              <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#FF7A00] text-white shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
                  {user.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#8B2E3B] text-white">
                  {user.role}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {user.rollNumber} • {user.branch} ({user.year})
              </p>

              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => alert('Profile Settings modal opened.')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition border border-rose-200 dark:border-rose-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </Link>
          </div>
        </div>

        {/* Dashboard Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#151722] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Codequest Streak</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#FF7A00] mt-1">{user.streak} Days</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
              <Flame className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151722] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Events Registered</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white mt-1">{user.eventsCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-[#8B2E3B] dark:text-rose-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151722] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Projects Built</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{user.projectsCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Code2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151722] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Member Points</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{user.points} XP</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Registered Events & Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Registered Events */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">
                My Enrolled Events & Submissions
              </h2>
              <Link href="/forms" className="text-xs font-bold text-[#FF7A00] hover:text-[#E06B00]">
                Explore Forms Center →
              </Link>
            </div>

            <div className="space-y-4">
              {registeredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-[#FF7A00]">
                      {evt.track}
                    </span>
                    <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Date / Schedule: {evt.date}
                    </p>
                  </div>

                  <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${evt.badgeBg} flex-shrink-0 inline-flex items-center space-x-1`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{evt.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Column: Quick Links & Badges */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
                SRKRCC Member Badges
              </h3>
              
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 flex items-center space-x-3">
                  <Flame className="w-6 h-6 text-[#FF7A00]" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">Streak Master</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Completed 10+ consecutive daily challenges</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex items-center space-x-3">
                  <Award className="w-6 h-6 text-purple-500" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">Hackathon Contender</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Registered for IconCoders 2025 Flagship</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#8B2E3B] p-6 rounded-xl text-white shadow-md space-y-3">
              <h3 className="text-lg font-extrabold">Need Help or Support?</h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Connect with SRKR Coding Club executive leads or visit the Admin Control Room.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center space-x-1 text-xs font-bold text-[#FF7A00] hover:underline pt-1"
              >
                <span>Admin Room (/admin) →</span>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
