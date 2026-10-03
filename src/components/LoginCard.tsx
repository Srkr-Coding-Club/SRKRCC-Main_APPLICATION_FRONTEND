'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { loginUser, getStoredUser, isAuthenticated, clearAuthSession, fetchAndSyncCurrentUser, isSafeNextPath, AuthUser, LoginError } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';
import { normalizeEmail, validateEmail } from '@/lib/validation/auth';

export interface LoginCardProps {
  className?: string;
  nextUrl?: string | null;
  onSubmit?: (values: { email: string; password: string }) => Promise<void> | void;
  onClose?: () => void;
  onSwitchToSignup?: () => void;
  embedded?: boolean;
}

export default function LoginCard({
  nextUrl: nextUrlProp,
  onSubmit: onSubmitProp,
  onClose,
  onSwitchToSignup,
  embedded = false,
}: LoginCardProps) {
  const searchParams = useSearchParams();
  const nextUrl = nextUrlProp ?? searchParams?.get('next') ?? null;
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isSendingSetup, setIsSendingSetup] = useState(false);
  const [setupSent, setSetupSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated()) {
      fetchAndSyncCurrentUser().then((user) => {
        if (!cancelled) setLoggedInUser(user);
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinueAsExisting = () => {
    if (!loggedInUser) return;
    const targetUrl = (isSafeNextPath(nextUrl) && !nextUrl.startsWith('/login') && !nextUrl.startsWith('/signup'))
      ? nextUrl
      : (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'CLUB_LEAD')
        ? '/admin'
        : '/';
    window.location.replace(targetUrl);
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

    const emailError = validateEmail(email);
    const passwordError = password ? undefined : 'Password is required.';
    if (emailError || passwordError) {
      setFieldErrors({ email: emailError, password: passwordError });
      toast.warning('Check Your Details', emailError || passwordError!);
      document.getElementById(emailError ? 'login-email' : 'login-password')?.focus();
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    setFieldErrors({});
    setIsLoading(true);

    try {
      let loggedUser = loggedInUser;
      if (onSubmitProp) {
        await onSubmitProp({ email: normalizedEmail, password });
        loggedUser = getStoredUser();
      } else {
        const { user } = await loginUser(normalizedEmail, password);
        loggedUser = user;
      }
      setSuccess(true);
      toast.success('Signed In', `Welcome back, ${loggedUser?.first_name || loggedUser?.email || ''}!`);
      setRedirecting(true);

      const targetUrl = (isSafeNextPath(nextUrl) && !nextUrl.startsWith('/login') && !nextUrl.startsWith('/signup'))
        ? nextUrl
        : (loggedUser?.role === 'ADMIN' || loggedUser?.role === 'CLUB_LEAD')
          ? '/admin'
          : '/';

      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 350);
    } catch (err) {
      const loginError = err as LoginError;
      if (loginError?.code === 'PASSWORD_SETUP_REQUIRED') {
        setSetupRequired(true);
        toast.warning('Password Setup Required', 'Your account was restored from backup. Please set up your password to activate it.');
      } else {
        const message = loginError?.message || 'Login failed. Please check your credentials.';
        toast.error('Sign In Failed', message);
        setFieldErrors(
          loginError?.fieldErrors && Object.keys(loginError.fieldErrors).length > 0
            ? loginError.fieldErrors
            : { password: message },
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentAdmin = loggedInUser?.role === 'ADMIN' || loggedInUser?.role === 'CLUB_LEAD';

  return (
    <motion.main
      initial={embedded ? false : { opacity: 0 }}
      animate={embedded ? undefined : { opacity: 1 }}
      transition={{ duration: 0.05, ease: 'easeOut' }}
      onClick={(event) => {
        if (!embedded && event.target === event.currentTarget) onClose?.();
      }}
      className={embedded ? 'contents' : 'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-6 backdrop-blur-[6px]'}
    >
      {/* Expanded Modal Card: generous width, natural height, soft pill corners */}
      <motion.section
        initial={embedded ? false : { opacity: 0, scale: 0.86, y: 12 }}
        animate={embedded ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className={embedded ? 'contents' : 'relative grid h-[min(460px,calc(100dvh-2rem))] w-full max-w-[780px] grid-rows-[120px_minmax(0,1fr)] grid-cols-1 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-10px_rgba(0,0,0,0.25)] dark:bg-[#151722] sm:grid-cols-[1fr_1.1fr] sm:grid-rows-1'}
      >

        {onClose && !embedded && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="absolute right-4 top-4 z-20 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Left Illustration Section */}
        <div className={embedded ? 'hidden' : 'relative min-h-0 bg-[radial-gradient(circle_at_20%_20%,_#FFE8D6_0%,_#FFF7F1_55%,_#FFFFFF_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,_rgba(255,122,0,0.18)_0%,_#1B1E2C_50%,_#151722_100%)]'}>
          <Image
            src="/Loginn.svg"
            alt="Secure sign in illustration"
            fill
            priority
            sizes="(min-width: 640px) 380px, 100vw"
            className="object-contain p-6 sm:p-8"
          />
        </div>

        {/* Right Form Section: roomy padding, uncompressed */}
        <div className={`min-h-0 overflow-y-auto px-8 py-6 sm:px-10 sm:py-8 ${embedded ? 'h-full' : ''}`}>
          <div className="mx-auto flex min-h-full w-full max-w-[320px] flex-col justify-center sm:mx-0">

            {/* SECURE SIGN IN Badge */}
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Lock className="h-3 w-3 text-slate-500 stroke-[2.2]" />
              Secure Sign In
            </div>

            {/* Title & Subtitle */}
            <h2 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Sign in
            </h2>
            <p className="mb-5 text-[12px] text-slate-500 dark:text-slate-400">
              Enter your credentials to continue.
            </p>

            {/* Already Signed In Card */}
            {loggedInUser && (
              <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">Already Signed In</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#8B2E3B] text-white">
                    {loggedInUser.role}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Active as <strong>{loggedInUser.email}</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleContinueAsExisting}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Switch
                  </button>
                </div>
              </div>
            )}

            {/* Password Setup Banner */}
            {setupRequired && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Password Setup Required</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Account restored from directory. Please set your password.
                </p>
                {setupSent ? (
                  <div className="flex items-center gap-1 text-emerald-500 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Link sent! Check your inbox.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestSetup}
                    disabled={isSendingSetup}
                    className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center justify-center gap-1"
                  >
                    {isSendingSetup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Send Setup Link</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {nextUrl && !loggedInUser && (
                <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-600">
                  <span className="font-semibold">Sign in required</span> for <code className="font-mono">{nextUrl}</code>
                </div>
              )}

              {/* EMAIL: proper 10px uppercase label, neutral input background, 38px height */}
              <div className="space-y-1">
                <label
                  htmlFor="login-email"
                  className="block text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[1.8]" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    placeholder="you@srkr.ac.in"
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value.replace(/\s/g, ''));
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onBlur={() => {
                      if (email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
                    }}
                    disabled={isLoading || success}
                    className={`w-full h-10 pl-9 pr-3 rounded-lg border text-xs text-slate-800 placeholder:text-slate-400 bg-[#FCFCFD] dark:bg-[#1C1F2E] dark:text-slate-100 transition-colors focus:outline-none focus:ring-1 ${
                      fieldErrors.email
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200/90 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="login-email-error" role="alert" className="text-[10px] text-rose-500 flex items-start gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* PASSWORD: proper 10px uppercase label, dark gray 'Forgot?' link, 38px height */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase"
                  >
                    Password
                  </label>
                  <Link
                    href="/account/setup-password"
                    className="text-[10px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[1.8]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    disabled={isLoading || success}
                    className={`w-full h-10 pl-9 pr-9 rounded-lg border text-xs text-slate-800 placeholder:text-slate-400 bg-[#FCFCFD] dark:bg-[#1C1F2E] dark:text-slate-100 transition-colors focus:outline-none focus:ring-1 ${
                      fieldErrors.password
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200/90 dark:border-slate-700 focus:border-slate-400 focus:ring-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" role="alert" className="text-[10px] text-rose-500 flex items-start gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* SIGN IN BUTTON: 40px height, vibrant orange, white text, clear arrow */}
              <button
                type="submit"
                disabled={isLoading || success}
                className="w-full h-10 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6B00] hover:bg-[#E56000] text-white font-medium text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in…</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{redirecting ? 'Signed in, redirecting…' : 'Signed in'}</span>
                    {redirecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  </>
                ) : (
                  <>
                    <span>{loggedInUser ? 'Sign in with different account' : 'Sign in'}</span>
                    <ArrowRight className="w-4 h-4 text-white stroke-[2.2]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-3 text-center text-[10px] text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              {onSwitchToSignup ? (
                <button type="button" onClick={onSwitchToSignup} className="font-semibold text-slate-800 hover:underline dark:text-slate-200">
                  Sign up
                </button>
              ) : (
                <Link href="/signup" className="font-semibold text-slate-800 hover:underline dark:text-slate-200">
                  Sign up
                </Link>
              )}
            </p>
          </div>
        </div>
      </motion.section>
    </motion.main>
  );
}