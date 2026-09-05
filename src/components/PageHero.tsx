'use client';

import React, { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { gsap } from 'gsap';

interface PageHeroProps {
  icon: React.ReactNode;   // was: LucideIcon
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  className?: string;
}

export default function PageHero({
  icon,                     // no longer destructured as `icon: Icon`
  eyebrow,
  title,
  description,
  className = '',
}: PageHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from('[data-hero-reveal]', {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
      });

      gsap.to('[data-hero-orb]', {
        y: -18,
        x: 12,
        scale: 1.06,
        duration: 6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: { each: 1.2, from: 'random' },
      });

      gsap.fromTo(
        '[data-hero-sheen]',
        { xPercent: -140 },
        { xPercent: 240, duration: 2.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.4 },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;

    gsap.to(root, {
      rotateY: px * 5,
      rotateX: -py * 5,
      duration: 0.6,
      ease: 'power2.out',
      transformPerspective: 900,
    });

    if (glowRef.current) {
      gsap.to(glowRef.current, {
        x: px * 60,
        y: py * 60,
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  };

  const handleLeave = () => {
    if (rootRef.current) {
      gsap.to(rootRef.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'power3.out' });
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, { x: 0, y: 0, duration: 1, ease: 'power3.out' });
    }
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={[
        'group relative isolate overflow-hidden rounded-3xl',
        'p-8 sm:p-14',
        'border border-white/50 dark:border-white/10',
        'bg-gradient-to-b from-[#FFEEDD] via-[#FFDCB0] to-[#FFC98A]',
        'dark:from-[#1A1A2E] dark:via-[#2A1B2E] dark:to-[#3D1F2A]',
        'backdrop-blur-2xl',
        'shadow-[0_20px_60px_-24px_rgba(255,122,0,0.35)]',
        'transition-shadow duration-500 hover:shadow-[0_28px_80px_-24px_rgba(255,122,0,0.48)]',
        'will-change-transform',
        className,
      ].join(' ')}
    >
      <div
        data-hero-orb
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 140, 40, 0.45) 0%, rgba(255, 174, 107, 0.25) 45%, transparent 75%)',
        }}
      />
      <div
        data-hero-orb
        className="pointer-events-none absolute inset-0 dark:opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255, 122, 0, 0.28) 0%, rgba(139, 46, 59, 0.12) 50%, transparent 80%)',
        }}
      />
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255, 154, 68, 0.2) 0%, transparent 55%)',
        }}
      />

      <div
        data-hero-sheen
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent dark:via-white/10"
      />

      <div className="relative z-10 max-w-2xl space-y-5">
        <div
          data-hero-reveal
          className="inline-flex items-center gap-2 rounded-full border border-[#FF7A00]/30 bg-white/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B24A0B] shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-[#FFC08A]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF7A00]/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF7A00]" />
          </span>
          {icon}
          <span>{eyebrow}</span>
        </div>

        <h1
          data-hero-reveal
          className="text-balance bg-gradient-to-br from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] bg-clip-text text-4xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-6xl dark:from-white dark:via-[#FFD8B5] dark:to-[#FF9A44]"
        >
          {title}
        </h1>

        <p
          data-hero-reveal
          className="max-w-xl text-pretty text-sm leading-relaxed text-[#4A3B38] sm:text-base dark:text-slate-200"
        >
          {description}
        </p>

        <div
          data-hero-reveal
          className="h-px w-40 bg-gradient-to-r from-[#FF7A00] to-transparent"
        />
      </div>
    </div>
  );
}