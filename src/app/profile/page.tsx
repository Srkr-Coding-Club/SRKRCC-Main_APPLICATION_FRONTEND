'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User as UserIcon,
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
  ShieldAlert,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';
import { getStoredUser, clearAuthSession, isAuthenticated, AuthUser } from '@/lib/auth';
import { fetchApi } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

interface RegisteredEventItem {
  id: number;
  form_slug?: string;
  title: string;
  track: string;
  date: string;
  status: string;
  badgeBg: string;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
}

interface FullUserProfile {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  roll_number?: string;
  branch?: string;
  year?: number | string;
  streak: number;
  points: number;
  events_count: number;
  projects_count: number;
  registered_events: RegisteredEventItem[];
  badges: BadgeItem[];
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?next=/profile');
      return;
    }

    // Load initial local user for instant optimistic UI
    const localUser = getStoredUser();
    if (localUser) {
      setProfile({
        id: localUser.id,
        email: localUser.email,
        username: localUser.username,
        first_name: localUser.first_name,
        last_name: localUser.last_name,
        role: localUser.role || 'MEMBER',
        roll_number: localUser.roll_number,
        branch: localUser.branch,
        year: localUser.year,
        streak: 0,
        points: 50,
        events_count: 0,
        projects_count: 0,
        registered_events: [],
        badges: [],
      });
    }

    // Fetch live, real-time calculated database profile
    fetchApi<FullUserProfile>('/auth/me/')
      .then((data) => {
        if (data && data.email) {
          setProfile(data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('srkrcc_user', JSON.stringify({
              id: data.id,
              email: data.email,
              username: data.username,
              first_name: data.first_name,
              last_name: data.last_name,
              role: data.role,
              roll_number: data.roll_number,
              branch: data.branch,
              year: data.year,
            }));
          }
        }
      })
      .catch(() => {
        // Tolerant fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    clearAuthSession();
    router.push('/login');
  };

  const user = {
    name: profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || profile.email.split('@')[0]
      : 'Developer',
    email: profile?.email || 'student@srkr.ac.in',
    rollNumber: profile?.roll_number || '22B91A0501',
    branch: profile?.branch || 'Computer Science & Engineering',
    year: profile?.year ? `${profile.year}th Year` : '3rd Year',
    role: profile?.role || 'MEMBER',
    streak: profile?.streak ?? 0,
    points: profile?.points ?? 50,
    eventsCount: profile?.events_count ?? profile?.registered_events?.length ?? 0,
    projectsCount: profile?.projects_count ?? 0,
  };

  const registeredEvents = profile?.registered_events || [];
  const badges = profile?.badges || [];

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Top Profile Header Banner */}
        <div className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] p-1 shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-[#151722] flex items-center justify-center text-white font-extrabold text-3xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
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
                {loading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                )}
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
              onClick={() => alert('Profile settings updated.')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition border border-rose-200 dark:border-rose-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {authError === 'admin_access_required' && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-left">
            <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-rose-400">Admin Clearance Required</p>
              <p className="text-rose-300/80 mt-0.5">
                Your account role is <strong>{user.role}</strong>. Access to the Admin Control Room is restricted to users with <strong>ADMIN</strong> or <strong>CLUB_LEAD</strong> permissions.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Metrics Bar (Dynamic From DB) */}
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
                My Enrolled Events & Submissions ({registeredEvents.length})
              </h2>
              <Link href="/forms" className="text-xs font-bold text-[#FF7A00] hover:text-[#E06B00]">
                Explore Forms Center →
              </Link>
            </div>

            {registeredEvents.length > 0 ? (
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

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {evt.form_slug && (
                        <Link
                          href={`/forms/${evt.form_slug}`}
                          className="px-3 py-1.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
                        >
                          View Form
                        </Link>
                      )}
                      <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${evt.badgeBg} inline-flex items-center space-x-1`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{evt.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No active registrations yet</p>
                <p className="text-xs text-slate-500">Discover upcoming workshops, hackathons, and algorithm challenges in the club portal.</p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#FF7A00] hover:underline pt-2"
                >
                  <span>Browse Events & Forms</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar Column: Dynamic Badges & Quick Links */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
                SRKRCC Member Badges
              </h3>
              
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border flex items-center space-x-3 ${
                      badge.tone === 'orange'
                        ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50'
                        : badge.tone === 'purple'
                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                    }`}
                  >
                    {badge.tone === 'orange' ? (
                      <Flame className="w-6 h-6 text-[#FF7A00] flex-shrink-0" />
                    ) : badge.tone === 'purple' ? (
                      <Award className="w-6 h-6 text-purple-500 flex-shrink-0" />
                    ) : (
                      <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">{badge.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#1A1A2E] to-[#8B2E3B] p-6 rounded-xl text-white shadow-md space-y-3">
              <h3 className="text-lg font-extrabold">Need Help or Support?</h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Connect with SRKR Coding Club executive leads or visit the Admin Control Room.
              </p>
              {(user.role === 'ADMIN' || user.role === 'CLUB_LEAD') && (
                <Link
                  href="/admin"
                  className="inline-flex items-center space-x-1 text-xs font-bold text-[#FF7A00] hover:underline pt-1"
                >
                  <span>Admin Room (/admin) →</span>
                </Link>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
          <div className="flex items-center space-x-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading user profile...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
