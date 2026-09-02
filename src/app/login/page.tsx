'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, Trophy, Flame, FileText, UserCheck, ShieldCheck, LogOut } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { loginUser, getStoredUser, isAuthenticated, clearAuthSession, AuthUser } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setLoggedInUser(getStoredUser());
    }
  }, []);

  const handleContinueAsExisting = () => {
    if (!loggedInUser) return;
    if (nextUrl) {
      router.push(nextUrl);
    } else if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'CLUB_LEAD') {
      router.push('/admin');
    } else {
      router.push('/profile');
    }
  };

  const handleSwitchAccount = () => {
    clearAuthSession();
    setLoggedInUser(null);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Missing Details', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);

    try {
      const { user } = await loginUser(email, password);
      setSuccess(true);
      toast.success('Signed In', `Welcome back, ${user.first_name || user.email}!`);

      setTimeout(() => {
        if (nextUrl) {
          router.push(nextUrl);
        } else if (user.role === 'ADMIN' || user.role === 'CLUB_LEAD') {
          router.push('/admin');
        } else {
          router.push('/profile');
        }
      }, 500);
    } catch (err: any) {
      toast.error('Sign In Failed', err?.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const isCurrentAdmin = loggedInUser?.role === 'ADMIN' || loggedInUser?.role === 'CLUB_LEAD';

  return (
    <AuthLayout
      eyebrow="Member Portal"
      title="Welcome back, coder."
      subtitle="Sign in to register for events, track your Codequest streak, and access member-only perks."
      features={[
        { icon: Trophy, text: 'Register for hackathons & workshops' },
        { icon: Flame, text: 'Track your daily Codequest streak' },
        { icon: FileText, text: 'View your past submissions & forms' },
      ]}
      footer={
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-[#FF7A00] hover:text-[#E06B00]">
            Sign up
          </Link>
        </p>
      }
    >
      <h2 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white mb-1">Sign in</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Enter your credentials to continue.</p>

      {/* Already logged in helper card */}
      {loggedInUser && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-slate-900 dark:text-white">Already Signed In</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8B2E3B] text-white">
              {loggedInUser.role}
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-300">
            You are active as <strong className="text-slate-900 dark:text-white">{loggedInUser.email}</strong>.
            {nextUrl === '/admin' && !isCurrentAdmin && (
              <span className="block text-rose-500 mt-1 font-semibold">
                This account is a {loggedInUser.role}, which does not have Admin access. Sign in below with an Admin or Club Lead account.
              </span>
            )}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleContinueAsExisting}
              className="flex-1 py-2 px-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <span>Continue as {loggedInUser.first_name || loggedInUser.username || 'User'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Switch
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {nextUrl && !loggedInUser && (
          <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs text-[#FF7A00]">
            <span className="font-bold">Sign in required</span> to continue to <code className="font-mono text-[11px]">{nextUrl}</code>.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              placeholder="student@srkr.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || success}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">Password</label>
            <Link href="#" className="text-xs font-semibold text-[#FF7A00] hover:text-[#E06B00]">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || success}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || success}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Signed in</span>
            </>
          ) : (
            <>
              <span>{loggedInUser ? 'Sign in with different account' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFormContent />
    </Suspense>
  );
}
