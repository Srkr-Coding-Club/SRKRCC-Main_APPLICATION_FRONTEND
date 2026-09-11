'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Trophy,
  Flame,
  FileText,
  ShieldCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { loginUser, getStoredUser, isAuthenticated, clearAuthSession, AuthUser } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';

export interface LoginCardProps {
  className?: string;
  nextUrl?: string | null;
  onSubmit?: (values: { email: string; password: string }) => Promise<void> | void;
}

export default function LoginCard({
  nextUrl: nextUrlProp,
  onSubmit: onSubmitProp,
}: LoginCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = nextUrlProp ?? searchParams?.get('next') ?? null;
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isSendingSetup, setIsSendingSetup] = useState(false);
  const [setupSent, setSetupSent] = useState(false);

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
    setFieldErrors({});
    setSetupRequired(false);
    setSetupSent(false);
  };

  const handleRequestSetup = async () => {
    if (!email) {
      toast.warning('Email Required', 'Please enter your email address to request a setup link.');
      return;
    }
    setIsSendingSetup(true);
    try {
      await fetch('/api/proxy/auth/setup-password/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSetupSent(true);
      toast.success('Setup Link Sent', 'If an eligible account exists, a secure password setup link has been sent to your email.');
    } catch (ex: any) {
      toast.error('Request Failed', ex?.message || 'Unable to request password setup link.');
    } finally {
      setIsSendingSetup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Missing Details', 'Please enter your email and password.');
      setFieldErrors({
        email: !email ? 'Email is required.' : undefined,
        password: !password ? 'Password is required.' : undefined,
      });
      return;
    }
    setFieldErrors({});
    setIsLoading(true);

    try {
      if (onSubmitProp) {
        await onSubmitProp({ email, password });
        setSuccess(true);
        toast.success('Signed In', 'Welcome back!');
      } else {
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
      }
    } catch (err: any) {
      if (err?.code === 'PASSWORD_SETUP_REQUIRED') {
        setSetupRequired(true);
        toast.warning('Password Setup Required', 'Your account was restored from backup. Please set up your password to activate it.');
      } else {
        const message = err?.message || 'Login failed. Please check your credentials.';
        toast.error('Sign In Failed', message);
        setFieldErrors({ password: message });
      }
    } finally {
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

      {/* Password Setup Required Banner (for Backup-Restored / Imported Members) */}
      {setupRequired && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Lock className="w-4 h-4" />
            <span>Password Setup Required</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Your account was restored from the club member directory. A secure password setup link is required to activate your account.
          </p>
          {setupSent ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium pt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Setup link sent! Check your inbox.</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestSetup}
              disabled={isSendingSetup}
              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
            >
              {isSendingSetup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              <span>Send Password Setup Link</span>
            </button>
          )}
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
              autoComplete="email"
              placeholder="student@srkr.ac.in"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              disabled={isLoading || success}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white focus:outline-none focus:ring-1 ${
                fieldErrors.email
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:ring-[#FF7A00]'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">Password</label>
            <Link href="/account/setup-password" className="text-xs font-semibold text-[#FF7A00] hover:text-[#E06B00]">
              Forgot / Set Up?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={isLoading || success}
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white focus:outline-none focus:ring-1 ${
                fieldErrors.password
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:ring-[#FF7A00]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
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
