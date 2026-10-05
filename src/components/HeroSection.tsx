'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getStoredUser, isAuthenticated, fetchAndSyncCurrentUser, subscribeToAuthResync, AuthUser, AUTH_CHANGE_EVENT } from '@/lib/auth';
import type { AgendaItem } from '@/lib/landing';
import ActionLink from './landing/ActionLink';
import LiveLine from './landing/LiveLine';

const NAVBAR_HEIGHT_PX = 64;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* A soft rise for visitors who land without the intro. With reduced motion, MotionConfig keeps it to a fade. */
const settle = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE_OUT },
});

/* ------------------------------------------------------------------ */
/* The hero: where the intro lands. The emblem sits where the core's  */
/* light was; the club's name carries its signature ember shimmer and */
/* leans toward the pointer in 3D, the emblem following more gently; */
/* the tagline is the line the light resolved into, and the live line */
/* says what's happening next. HeroIntro animates the data-hero-*     */
/* hooks during its handoff; they are inert otherwise.                */
/* ------------------------------------------------------------------ */
export default function HeroSection({ nextUp }: { nextUp: AgendaItem | null }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setIsAuth(isAuthenticated());
      setCurrentUser(getStoredUser());
    };

    syncAuth();
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);

    let cancelled = false;
    const syncFromServer = () => {
      fetchAndSyncCurrentUser().then((user) => {
        if (cancelled) return;
        if (user) {
          setIsAuth(true);
          setCurrentUser(user);
        }
      });
    };
    // Re-validate on focus too - otherwise a role change made elsewhere (e.g. an
    // admin promoting this member) never reaches an already-open tab until a
    // hard refresh remounts everything.
    syncFromServer();
    const unsubscribe = subscribeToAuthResync(syncFromServer);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  /* Pointer position within the section, normalised to -0.5..0.5 and spring-smoothed. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.5 });

  /* Headline: the closest layer, so it moves and tilts the most. */
  const titleX = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const titleY = useTransform(sy, [-0.5, 0.5], [-11, 11]);
  const titleRotateX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const titleRotateY = useTransform(sx, [-0.5, 0.5], [-7, 7]);

  /* Emblem: a further layer, a gentler shift in the same direction. */
  const emblemX = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const emblemY = useTransform(sy, [-0.5, 0.5], [-5, 5]);

  /* Checked per event rather than at render, so server and client markup always match. */
  const handlePointerMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  /* Relative to the section's current position, so it still lands on the next */
  /* section when HeroIntro has pinned the hero further down the page.         */
  const scrollDown = (e: React.MouseEvent<HTMLElement>) => {
    const section = e.currentTarget.closest('section');
    if (!section) return;
    window.scrollBy({ top: section.getBoundingClientRect().bottom - NAVBAR_HEIGHT_PX, behavior: 'smooth' });
  };

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD';
  const secondary = !isAuth
    ? { href: '/signup', label: 'Join the club' }
    : isStaff
      ? { href: '/admin', label: 'Admin control room' }
      : { href: '/profile', label: 'Go to your profile' };

  return (
    <MotionConfig reducedMotion="user">
      <section
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden bg-journey-bg px-5 pb-20 pt-16 text-center">
        {/* The core's light, carried over from the intro: one warm source above the emblem. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-18%] h-[70vmin] w-[110vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.16),transparent)]"
        />

        <div className="relative flex w-full max-w-6xl flex-col items-center [perspective:1000px]">
          <motion.div style={{ x: emblemX, y: emblemY }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
              data-hero-emblem
              className="relative rounded-full p-[2px]"
              style={{
                background: 'linear-gradient(135deg, #FFA500, #FF7A00 45%, #8B2E3B 85%)',
                boxShadow: '0 0 46px var(--glow-strong), 0 0 100px var(--glow-mid)',
              }}
            >
              <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[var(--background)] sm:h-[120px] sm:w-[120px]">
                <div className="relative h-[84%] w-[84%]">
                  <Image src="/logonobg.png" alt="" fill priority sizes="120px" className="object-contain" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* LCP element: real text, painted at full opacity from the first frame. The entrance */}
          {/* is a transform-only rise; the pointer parallax lives on the h1 so it never fights it. */}
          <motion.div
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: EASE_OUT }}
            data-hero-title
            className="mt-8 [transform-style:preserve-3d]"
          >
            <motion.h1
              style={{ x: titleX, y: titleY, rotateX: titleRotateX, rotateY: titleRotateY, transformPerspective: 900 }}
              className="ember-text font-poppins text-[clamp(2.7rem,9.5vw,6.75rem)] font-extrabold leading-[0.95] tracking-tight will-change-transform"
            >
              SRKR CODING CLUB
            </motion.h1>
          </motion.div>

          <motion.p
            {...settle(0.1)}
            data-hero-reveal
            className="mt-6 font-display text-[clamp(1.35rem,2.6vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-journey-text [font-stretch:112%]"
          >
            Building coders. Creating innovators.
          </motion.p>

          <motion.p {...settle(0.16)} data-hero-reveal className="mt-4 max-w-[44ch] text-base leading-relaxed text-journey-muted sm:text-lg">
            The student developer community of SRKR Engineering College, where curiosity becomes code and ideas become real projects.
          </motion.p>

          <motion.div {...settle(0.24)} data-hero-reveal className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <ActionLink href="#path" variant="primary">
              Explore the journey
            </ActionLink>
            <ActionLink href={secondary.href}>{secondary.label}</ActionLink>
          </motion.div>

          {nextUp && (
            <motion.div {...settle(0.32)} data-hero-reveal className="mt-8">
              <LiveLine
                label={`Next: ${nextUp.title}`}
                detail={nextUp.dateLabel}
                registration={nextUp.registration}
                href={nextUp.href}
              />
            </motion.div>
          )}
        </div>

        <motion.button
          {...settle(0.5)}
          data-hero-reveal
          whileTap={{ scale: 0.92 }}
          onClick={scrollDown}
          aria-label="Scroll to the journey"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full p-3 text-journey-muted transition-colors hover:text-journey-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent"
        >
          <ChevronDown className="h-5 w-5 motion-safe:animate-[heroBob_2.4s_ease-in-out_infinite]" />
        </motion.button>
      </section>
    </MotionConfig>
  );
}
