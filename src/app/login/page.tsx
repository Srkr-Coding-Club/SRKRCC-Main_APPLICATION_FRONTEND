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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
                    Sign in
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