'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import BrainLogo from '@/components/BrainLogo';
import { loginUser } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  return (
    <div className="max-w-md w-full mx-auto px-4">
      {/* Card Container */}
      <div className="bg-white dark:bg-[#151722] rounded-2xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#FFE5CC] dark:bg-[#8B2E3B]/30 mb-1">
            <BrainLogo size={44} showRays={true} animated={false} />
          </div>
          
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
            <Shield className="w-3.5 h-3.5" />
            <span>SRKRCC AUTH PORTAL</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">
            Welcome Back
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign in to access registered events, admin controls, and member perks.
          </p>

          {nextUrl && (
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-left text-xs text-orange-400">
              <span className="font-bold">Authentication Required:</span> Please sign in to access <code className="font-mono text-[11px]">{nextUrl}</code>.
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              Email / Roll Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="student@srkr.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || success}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || success}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00]"
              />
              <span>Remember me</span>
            </label>

            <Link href="#" className="font-semibold text-[#FF7A00] hover:text-[#E06B00]">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Signed In</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link to Signup */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-[#FF7A00] hover:text-[#E06B00]">
            Sign Up Now
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-16 flex items-center justify-center transition-colors duration-300">
      <Suspense fallback={<div className="text-sm text-slate-500 animate-pulse">Loading login portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
