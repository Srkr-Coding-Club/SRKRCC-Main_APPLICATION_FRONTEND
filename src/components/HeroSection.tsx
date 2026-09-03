'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import PillButton from './PillButton';

/* ------------------------------------------------------------------ */
/* Logo worn like a seal — gradient ring, page-coloured core so it     */
/* sits flush in either theme. `depthX/Y` drive its parallax layer.   */
/* ------------------------------------------------------------------ */
function LogoSeal({ depthX, depthY }: { depthX: MotionValue<number>; depthY: MotionValue<number> }) {
  return (
    <motion.div style={{ x: depthX, y: depthY }} className="[transform-style:preserve-3d]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex-shrink-0 rounded-full p-[2px]"
        style={{
          background: 'linear-gradient(135deg, #FFA500, #FF7A00 45%, #8B2E3B 85%)',
          boxShadow: '0 0 46px var(--glow-strong), 0 0 100px var(--glow-mid)',
        }}
      >
        <div className="relative flex items-center justify-center rounded-full bg-[var(--background)] w-[116px] h-[116px] sm:w-[136px] sm:h-[136px] lg:w-[152px] lg:h-[152px]">
          <div className="relative w-[84%] h-[84%]">
            <Image
              src="/logonobg.png"
              alt="SRKR Coding Club"
              fill
              priority
              sizes="128px"
              className="object-contain"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HeroSection() {
  const reduce = useReducedMotion();
  const canHover = useRef(false);

  useEffect(() => {
    canHover.current =
      typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  /* Pointer position within the section, normalised to -0.5..0.5, spring-smoothed. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 18, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 90, damping: 18, mass: 0.5 });

  /* Headline — the closest layer, so it moves & tilts the most. */
  const hX = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const hY = useTransform(sy, [-0.5, 0.5], [-11, 11]);
  const hRotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const hRotY = useTransform(sx, [-0.5, 0.5], [-7, 7]);

  /* Logo — mid layer, a gentler shift in the same direction. */
  const midX = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const midY = useTransform(sy, [-0.5, 0.5], [-5, 5]);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce || !canHover.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
  };

  const scrollDown = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: window.innerHeight * 0.92, behavior: 'smooth' });
    }
  };

  const settle = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-20 text-center transition-colors duration-300"
    >
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center [perspective:1000px]">
        {/* When reduced-motion is on, handleMove bails and px/py stay 0, so   */}
        {/* midX/midY (and the headline transforms) resolve to 0 — no motion.  */}
        <LogoSeal depthX={midX} depthY={midY} />

        {/* LCP element — real text, painted at full opacity from the first frame. */}
        {/* Entrance is a transform-only rise; the pointer parallax lives on the   */}
        {/* inner <h1> so it never fights the entrance.                            */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: 18 }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 [transform-style:preserve-3d]"
        >
          <motion.h1
            style={
              reduce
                ? undefined
                : { x: hX, y: hY, rotateX: hRotX, rotateY: hRotY, transformPerspective: 900 }
            }
            className="ember-text font-poppins text-[clamp(2.7rem,9.5vw,6.75rem)] font-extrabold leading-[0.95] tracking-tight will-change-transform"
          >
            SRKR CODING CLUB
          </motion.h1>
        </motion.div>

        <motion.p
          {...settle(0.12)}
          className="mt-6 max-w-xl text-base leading-relaxed text-[#1A1A2E]/70 dark:text-white/60 sm:text-lg"
        >
          The student developer community of SRKR Engineering College.
        </motion.p>

        <motion.div
          {...settle(0.2)}
          className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-sm text-[#1A1A2E]/45 dark:text-white/40"
        >
          <span className="text-[#FF7A00]">{'</>'}</span>
          <span className="font-semibold text-[#8B2E3B] dark:text-[#FFA500]">Learn</span>
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[#C2410C] dark:text-[#FF7A00]">Build</span>
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[#B45309] dark:text-[#FFB84D]">Innovate</span>
          <span className="text-[#FF7A00]">{'</>'}</span>
        </motion.div>

        <motion.div {...settle(0.3)} className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <PillButton href="/signup" variant="solid" icon="arrow">
            Join the Club
          </PillButton>
          <PillButton href="/events" variant="outline" icon="code">
            Explore Events
          </PillButton>
        </motion.div>

        <motion.p
          {...settle(0.4)}
          className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-[#1A1A2E]/40 dark:text-white/35"
        >
          6 modules · hackathons every semester · open to every branch
        </motion.p>
      </div>

      {/* Scroll cue */}
      <motion.button
        {...settle(0.55)}
        onClick={scrollDown}
        aria-label="Scroll to content"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full p-2 text-[#1A1A2E]/40 transition-colors hover:text-[#FF7A00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] dark:text-white/35"
      >
        <ChevronDown
          className="h-5 w-5"
          style={{ animation: reduce ? undefined : 'heroBob 2.4s ease-in-out infinite' }}
        />
      </motion.button>
    </section>
  );
}
