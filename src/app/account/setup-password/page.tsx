'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { useToast } from '@/context/ToastContext';

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const { toast } = useToast();

  // Verification State (Mode 1: token in URL)
  const [isValidatingToken, setIsValidatingToken] = useState(Boolean(tokenParam));
  const [tokenValid, setTokenValid] = useState(false);
  const [memberInfo, setMemberInfo] = useState<{ first_name?: string; club_id?: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Form inputs for Mode 1 (Confirming Password)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Form inputs for Mode 2 (Requesting setup link)
  const [requestEmail, setRequestEmail] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Validate token on mount if provided
  useEffect(() => {
    if (!tokenParam) {
      setIsValidatingToken(false);
      return;
    }

    const verifyToken = async () => {
      setIsValidatingToken(true);
      setTokenError(null);
      try {
        const res = await fetch(`/api/proxy/auth/setup-password/verify/?token=${encodeURIComponent(tokenParam)}`);
        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenValid(true);
          setMemberInfo(data);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'This setup link is invalid or has expired.');
        }
      } catch (err: any) {
        setTokenValid(false);
        setTokenError(err.message || 'Unable to verify setup token.');
      } finally {
        setIsValidatingToken(false);
      }
    };

    verifyToken();
  }, [tokenParam]);

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasMixedCase && hasNumberOrSpecial;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Handle setting new password
  const handleConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenParam) return;

    if (!hasMinLength) {
      toast.warning('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }
    if (!hasMixedCase) {
      toast.warning('Password Too Weak', 'Password must contain both upper and lower case letters.');
      return;
    }
    if (!hasNumberOrSpecial) {
      toast.warning('Password Too Weak', 'Password must contain at least one number or symbol.');
      return;
    }
    if (!passwordsMatch) {
      toast.warning('Passwords Do Not Match', 'Please ensure both passwords match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/proxy/auth/setup-password/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenParam, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to establish password.');
      }

      setSetupComplete(true);
      toast.success('Password Established!', 'Your account is now active. You can sign in.');
    } catch (err: any) {
      toast.error('Setup Failed', err.message || 'Password confirmation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle requesting setup link
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail) {
      toast.warning('Email Required', 'Please enter your registered college email.');
      return;
    }

    setIsRequesting(true);
    try {
      await fetch('/api/proxy/auth/setup-password/request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail }),
      });
      setRequestSent(true);
      toast.success('Request Received', 'If an eligible account exists, a setup link has been dispatched to your email.');
    } catch (err: any) {
      toast.error('Request Failed', err.message || 'Unable to request password setup link.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account Activation"
      title="Establish Your Password"
      subtitle="Activate your SRKR Coding Club account and get access to workshops, hackathons, and Codequest."
      features={[
        { icon: ShieldCheck, text: 'Cryptographically secured single-use setup link' },
        { icon: KeyRound, text: 'Your password is never stored or transmitted in plain text' },
        { icon: CheckCircle2, text: 'Permanent Club ID linked directly to your profile' },
      ]}
      footer={
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already know your password?{' '}
          <Link href="/login" className="font-bold text-[#FF7A00] hover:text-[#E06B00]">
            Sign in
          </Link>
        </p>
      }
    >
      {/* State A: Validating Token */}
      {isValidatingToken && (
        <div className="py-12 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#FF7A00]" />
          <p className="text-sm text-slate-400">Verifying secure setup token...</p>
        </div>
      )}

      {/* State B: Token Error / Expired */}
      {!isValidatingToken && tokenParam && !tokenValid && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold block text-sm">Link Expired or Invalid</span>
              <p>{tokenError || 'This setup link has expired or has already been used.'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-3">
            <p>Setup tokens are single-use and expire within 24 hours for security. Please request a fresh link below.</p>
            <button
              type="button"
              onClick={() => router.push('/account/setup-password')}
              className="w-full py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs transition shadow-sm"
            >
              Request a New Setup Link
            </button>
          </div>
        </div>
      )}

      {/* State C: Token Valid -> Enter New Password */}
      {!isValidatingToken && tokenParam && tokenValid && !setupComplete && (
        <form onSubmit={handleConfirmPassword} className="space-y-5">
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1A1A2E] dark:text-white">
                Welcome, {memberInfo?.first_name || 'Member'}!
              </span>
              {memberInfo?.club_id && (
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#FF7A00] text-white font-bold">
                  {memberInfo.club_id}
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Please choose a secure password to activate your account.
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Gauge */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
            <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasMixedCase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Contains upper & lower case letters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${hasNumberOrSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Contains number or symbol</span>
            </div>
            {password && confirmPassword && (
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Passwords match</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isPasswordStrong || !passwordsMatch}
            className="w-full py-2.5 px-4 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-orange-500/10"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Set Password & Activate</span>
          </button>
        </form>
      )}

      {/* State D: Success State */}
      {setupComplete && (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white">Password Established!</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Your SRKR Coding Club account is now active. You can now sign in with your email and new password.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm transition shadow-md shadow-orange-500/10"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* State E: No Token in URL -> Request Setup Link Form */}
      {!isValidatingToken && !tokenParam && !requestSent && (
        <form onSubmit={handleRequestLink} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1A1A2E] dark:text-white">Registered Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                disabled={isRequesting}
                placeholder="student@srkr.ac.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00]"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Enter the college email address associated with your club membership.
            </p>
          </div>

          <button
            type="submit"
            disabled={isRequesting || !requestEmail}
            className="w-full py-2.5 px-4 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-orange-500/10"
          >
            {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span>Send Setup Link</span>
          </button>
        </form>
      )}

      {/* State F: Setup Link Request Dispatched */}
      {!isValidatingToken && !tokenParam && requestSent && (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white">Check Your Inbox</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            If an eligible account matching <strong className="text-[#1A1A2E] dark:text-white">{requestEmail}</strong> exists, a password setup link has been sent to your inbox.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF7A00] hover:text-[#E06B00]"
            >
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetupPasswordContent />
    </Suspense>
  );
}
