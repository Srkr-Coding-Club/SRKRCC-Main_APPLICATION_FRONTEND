'use client';
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoginCardProps {
  className?: string;
  nextUrl?: string | null;
  onSubmit?: (values: { email: string; password: string }) => Promise<void> | void;
}

export default function LoginCard({
  className,
  nextUrl,
  onSubmit,
}: LoginCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-auth-card]", { autoAlpha: 0, y: 24, scale: 0.98, duration: 0.7 })
          .from("[data-auth-media]", { autoAlpha: 0, scale: 1.04, duration: 0.7 }, "-=0.45")
          .from("[data-auth-field]", { autoAlpha: 0, y: 14, stagger: 0.07, duration: 0.45 }, "-=0.4");

        gsap.to("[data-auth-orb-a]", { x: 22, y: -18, scale: 1.08, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to("[data-auth-orb-b]", { x: -18, y: 16, scale: 1.06, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });
      return () => media.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password || isLoading || success) return;
    setIsLoading(true);
    try {
      await onSubmit?.({ email, password });
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentAdmin = loggedInUser?.role === 'ADMIN' || loggedInUser?.role === 'CLUB_LEAD';

  return (
    <div
      ref={rootRef}
      className={cn("flex min-h-screen w-full items-center justify-center px-4 py-8", className)}
    >
      <div
        data-auth-card
        className="auth-glass relative grid w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-hero-border bg-background shadow-hero md:grid-cols-2"
      >
        {/* Left: image only */}
        <div className="auth-panel relative hidden min-h-[26rem] items-center justify-center overflow-hidden md:flex">
          <div aria-hidden="true" data-auth-orb-a className="absolute -left-14 -top-16 size-56 rounded-full bg-brand-orange/25 blur-3xl z-10" />
          <div aria-hidden="true" data-auth-orb-b className="absolute -bottom-20 -right-8 size-60 rounded-full bg-brand-wine/20 blur-3xl" />
          <img
            data-auth-media
            src="/Loginn.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover z-0 pt-10"
          />
        </div>

        {/* Right: login form only */}
        <div className="auth-form relative p-7 sm:p-10">
          <div aria-hidden="true" className="hero-sheen pointer-events-none absolute inset-0" />
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

          <div className="relative">
            <div
              data-auth-field
              className="inline-flex items-center gap-2 rounded-full border border-brand-orange/20 bg-brand-orange-soft px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brand-wine shadow-badge dark:text-brand-orange"
            >
              <Lock aria-hidden="true" className="size-3" />
              Secure sign in
            </div>

            <h1 data-auth-field className="mt-5 font-display text-2xl font-semibold text-hero-foreground sm:text-3xl">
              Sign in
            </h1>
            <p data-auth-field className="mt-2 text-sm leading-6 text-hero-muted">
              Enter your credentials to continue.
            </p>

            {nextUrl ? (
              <p
                data-auth-field
                className="mt-5 rounded-xl border border-brand-orange/20 bg-brand-orange-soft px-3.5 py-2.5 text-xs leading-5 text-brand-wine dark:text-brand-orange"
              >
                Sign in required to continue to {nextUrl}.
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div data-auth-field className="space-y-2">
                <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-[0.1em] text-hero-muted">
                  Email
                </label>
                <div className="auth-field group relative rounded-xl border border-hero-border bg-background/55 transition-colors focus-within:border-brand-orange/60">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-hero-muted transition-colors group-focus-within:text-brand-orange"
                  />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@srkr.ac.in"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isLoading || success}
                    className="w-full rounded-xl bg-transparent py-3 pl-10 pr-4 text-sm text-hero-foreground placeholder:text-hero-muted/70 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div data-auth-field className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-[0.1em] text-hero-muted">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-brand-wine hover:underline dark:text-brand-orange">
                    Forgot?
                  </a>
                </div>
                <div className="auth-field group relative rounded-xl border border-hero-border bg-background/55 transition-colors focus-within:border-brand-orange/60">
                  <Lock
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-hero-muted transition-colors group-focus-within:text-brand-orange"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading || success}
                    className="w-full rounded-xl bg-transparent py-3 pl-10 pr-11 text-sm text-hero-foreground placeholder:text-hero-muted/70 focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-hero-muted transition-colors hover:text-brand-orange"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                data-auth-field
                type="submit"
                disabled={isLoading || success}
                className="auth-submit group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-orange px-5 py-3 text-sm font-semibold text-brand-orange-foreground shadow-icon transition-transform duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Signed in
                  </>
                ) : (
                  <>
                    {loggedInUser ? 'Sign in with different account' : 'Sign in'}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p data-auth-field className="mt-7 text-center text-xs text-hero-muted">
              Don&apos;t have an account?{" "}
              <a href="#" className="font-semibold text-brand-wine hover:underline dark:text-brand-orange">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}