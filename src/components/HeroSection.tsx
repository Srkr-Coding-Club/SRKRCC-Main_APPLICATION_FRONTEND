'use client';

import React from 'react';
import { motion } from 'framer-motion';
import BrainLogo from './BrainLogo';
import PillButton from './PillButton';

/* ------------------------------------------------------------------ */
/* Perspective floor grid — atmosphere                                 */
/* ------------------------------------------------------------------ */
function FloorGrid() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[42%] overflow-hidden pointer-events-none [mask-image:linear-gradient(to_top,black,transparent)]"
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[220%] bg-blueprint-grid opacity-50"
        style={{ transform: 'perspective(480px) rotateX(64deg)', transformOrigin: 'bottom center' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A single glowing node orbiting the composition. Pure CSS animation  */
/* (reuses the shared `spinSlow` keyframe from globals.css) instead of */
/* a JS-driven GSAP tween — the browser suspends CSS animations on     */
/* elements hidden via `display:none`, so the copy of this component   */
/* rendered for the inactive mobile/desktop breakpoint costs nothing,  */
/* unlike a GSAP rAF loop which keeps ticking regardless of visibility.*/
/* ------------------------------------------------------------------ */
function OrbitParticle({
  radius,
  duration,
  size,
  color,
  reverse = false,
  startAngle = 0,
}: {
  radius: number;
  duration: number;
  size: number;
  color: string;
  reverse?: boolean;
  startAngle?: number;
}) {
  // Negative animation-delay jumps straight to that point in the cycle,
  // giving each particle a distinct start angle without a bespoke keyframe.
  const negativeDelay = -((startAngle / 360) * duration);

  return (
    <div
      className="absolute inset-0"
      style={{ animation: `spinSlow ${duration}s linear infinite${reverse ? ' reverse' : ''}`, animationDelay: `${negativeDelay}s` }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateY(-${radius}px)`,
          background: color,
          boxShadow: `0 0 ${size * 2.5}px ${size * 0.9}px ${color}`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Static twinkling sparkle glints scattered through the composition   */
/* ------------------------------------------------------------------ */
function Sparkle({ style, delay, size = 3 }: { style: React.CSSProperties; delay: number; size?: number }) {
  return (
    <div
      className="absolute rounded-full bg-white sparkle pointer-events-none"
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 8px 2px rgba(255,255,255,0.8)',
        animationDelay: `${delay}s`,
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Concentric ring system with orbiting particles — the "circulating   */
/* objects" behind the wordmark. Desktop/tablet only — rendered inside */
/* LogoWithBackdrop so it's always centered exactly on the logo,       */
/* regardless of how much content sits above/below it in the layout.  */
/* Trimmed to 3 static rings / 3 orbit particles / 3 sparkles (down    */
/* from 5/6/6) — a visibly lighter composition, not just a faster one. */
/* ------------------------------------------------------------------ */
function RingsBackdrop() {
  return (
    <div className="hidden sm:flex absolute inset-0 items-center justify-center pointer-events-none" aria-hidden="true">
      {/* ambient core glow */}
      <div
        className="absolute w-[420px] h-[420px] sm:w-[640px] sm:h-[640px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--glow-mid), transparent 68%)' }}
      />

      {/* static concentric rings */}
      {[560, 460, 370].map((size) => (
        <div
          key={size}
          className="absolute rounded-full border border-[#1A1A2E]/[0.07] dark:border-white/[0.08]"
          style={{ width: size, height: size }}
        />
      ))}

      {/* rotating dashed rings — CSS animation, not GSAP */}
      <div
        className="absolute w-[520px] h-[520px] sm:w-[640px] sm:h-[640px] rounded-full border border-dashed border-[#FF7A00]/20"
        style={{ animation: 'spinSlow 90s linear infinite' }}
      />
      <div
        className="absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full border border-dotted border-[#8B2E3B]/25 dark:border-[#FFA500]/20"
        style={{ animation: 'spinSlow 55s linear infinite reverse' }}
      />

      {/* faint crosshair spokes */}
      <div className="absolute w-px h-[75%] bg-gradient-to-b from-transparent via-[#1A1A2E]/10 dark:via-white/10 to-transparent" />
      <div className="absolute h-px w-[75%] bg-gradient-to-r from-transparent via-[#1A1A2E]/10 dark:via-white/10 to-transparent" />

      {/* orbiting glowing particles — the "circulating objects" */}
      <OrbitParticle radius={330} duration={26} size={4} color="#FF7A00" startAngle={20} />
      <OrbitParticle radius={250} duration={20} size={3} color="#8B2E3B" startAngle={150} reverse />
      <OrbitParticle radius={190} duration={16} size={3} color="#FFA500" startAngle={260} />

      {/* twinkling sparkle glints */}
      <Sparkle style={{ top: '20%', left: '28%' }} delay={0.2} size={3} />
      <Sparkle style={{ top: '68%', left: '24%' }} delay={1.1} size={2.5} />
      <Sparkle style={{ top: '26%', left: '74%' }} delay={0.6} size={3} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile backdrop — orbiting rings/particles read as clutter at small */
/* sizes, so mobile gets a quieter glow + a couple of still rings      */
/* instead, sized to suit the logo rather than the full composition.  */
/* ------------------------------------------------------------------ */
function MobileGlowBackdrop() {
  return (
    <div className="flex sm:hidden absolute inset-0 items-center justify-center pointer-events-none" aria-hidden="true">
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--glow-mid), transparent 70%)' }}
      />
      <div className="absolute w-[250px] h-[250px] rounded-full border border-[#1A1A2E]/[0.07] dark:border-white/[0.08]" />
      <div className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-[#FF7A00]/15" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Logo + its backdrop, always sharing one center — used at both call  */
/* sites (mobile stack, desktop flanking layout) so the rings/glow     */
/* never drift from the logo regardless of surrounding content height. */
/* ------------------------------------------------------------------ */
function LogoWithBackdrop() {
  return (
    <div className="relative flex items-center justify-center">
      <MobileGlowBackdrop />
      <RingsBackdrop />
      <CenterBadge />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Central emblem — the club mark, worn like a seal at the seam        */
/* of the wordmark. Arc rotation is CSS (`spinSlow`), not GSAP.        */
/* ------------------------------------------------------------------ */
function CenterBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 flex items-center justify-center w-[226px] h-[226px] sm:w-[180px] sm:h-[180px] lg:w-[240px] lg:h-[240px] rounded-full p-[2px]"
      style={{
        background: 'linear-gradient(135deg, #FFA500, #FF7A00 40%, #8B2E3B 70%, #FFA500)',
        boxShadow: '0 0 60px var(--glow-strong), 0 0 130px var(--glow-mid)',
      }}
    >
      <div className="relative flex items-center justify-center w-full h-full rounded-full bg-[var(--background)]">
        <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 150 150">
          <circle
            cx="75"
            cy="75"
            r="71"
            fill="none"
            stroke="#FF7A00"
            strokeWidth="1.5"
            strokeDasharray="38 408"
            strokeLinecap="round"
            opacity="0.9"
            style={{ animation: 'spinSlow 14s linear infinite', transformOrigin: '75px 75px' }}
          />
          <circle
            cx="75"
            cy="75"
            r="63"
            fill="none"
            stroke="#FFA500"
            strokeWidth="1"
            strokeDasharray="20 375"
            strokeLinecap="round"
            opacity="0.6"
            style={{ animation: 'spinSlow 20s linear infinite reverse', transformOrigin: '75px 75px' }}
          />
        </svg>
        <BrainLogo size={176} showRays={true} animated={true} className="sm:hidden" />
        <BrainLogo size={140} showRays={true} animated={true} className="hidden sm:block lg:hidden" />
        <BrainLogo size={188} showRays={true} animated={true} className="hidden lg:block" />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Shimmering display typography — "ember" for SRKR, "chrome" for the  */
/* CODING CLUB line                                                    */
/* ------------------------------------------------------------------ */
function DisplayRow({
  children,
  delay,
  variant,
  className = '',
}: {
  children: React.ReactNode;
  delay: number;
  variant: 'ember' | 'chrome';
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ filter: 'brightness(1.25)' }}
      className={`whitespace-nowrap leading-none ${variant === 'ember' ? 'ember-text' : 'chrome-text'} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[var(--background)] transition-colors duration-300 flex flex-col">
      <FloorGrid />
      <div className="absolute inset-0 bg-blueprint-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_35%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-20">
        {/* Mobile: logo on top, SRKR below, CODING CLUB below that */}
        <div className="flex sm:hidden flex-col items-center gap-3 w-full">
          <LogoWithBackdrop />
          <DisplayRow
            delay={0.15}
            variant="ember"
            className="text-[clamp(2.5rem,13vw,4.5rem)] font-extrabold font-poppins tracking-[0.04em]"
          >
            SRKR
          </DisplayRow>
          <DisplayRow
            delay={0.32}
            variant="chrome"
            className="text-[clamp(1.4rem,7vw,2.75rem)] font-extrabold font-poppins tracking-[0.01em]"
          >
            CODING CLUB
          </DisplayRow>
        </div>

        {/* sm and up: CODING [logo] CLUB flanking layout */}
        <div className="hidden sm:flex flex-col items-center w-full">
          <DisplayRow
            delay={0.15}
            variant="ember"
              className="text-[clamp(1.9rem,8vw,9rem)] font-extrabold font-poppins tracking-[0.04em]"
          >
            SRKR
          </DisplayRow>

          <div className="relative flex items-center justify-center w-full mt-4">
            <div className="absolute right-1/2 mr-[76px] lg:mr-[98px]">
              <DisplayRow
                delay={0.32}
                variant="chrome"
                className="text-[clamp(1.9rem,8vw,9rem)] font-extrabold font-poppins tracking-[0.02em]"
              >
                CODING
              </DisplayRow>
            </div>

            <LogoWithBackdrop />

            <div className="absolute left-1/2 ml-[76px] lg:ml-[98px]">
              <DisplayRow
                delay={0.32}
                variant="chrome"
                className="text-[clamp(1.9rem,8vw,9rem)] font-extrabold font-poppins tracking-[0.22em]"
              >
                CLUB
              </DisplayRow>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-9 sm:mt-11 text-center"
        >
          <span className="block text-xs sm:text-sm uppercase tracking-[0.35em] text-[#1A1A2E]/55 dark:text-white/50">
            Where ideas become code.
          </span>
          <span className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-sm text-[#1A1A2E]/45 dark:text-white/40">
            <span className="text-[#FF7A00]">&lt;/&gt;</span>
            <span className="text-[#FF7A00] font-semibold">Build</span>
            <span>&middot;</span>
            <span className="text-[#8B2E3B] dark:text-[#E05263] font-semibold">Learn</span>
            <span>&middot;</span>
            <span className="text-[#E06B00] dark:text-[#FFA500] font-semibold">Innovate</span>
            <span className="text-[#FF7A00]">&lt;/&gt;</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-9 sm:mt-11 flex flex-wrap items-center justify-center gap-4"
        >
          <PillButton href="/events" variant="solid" icon="arrow">
            Explore Events
          </PillButton>
          <PillButton href="#join" variant="outline" icon="code">
            Join the Community
          </PillButton>
        </motion.div>
      </div>
    </section>
  );
}
