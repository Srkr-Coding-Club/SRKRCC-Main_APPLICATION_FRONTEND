"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
  MotionValue,
} from "framer-motion";

interface Stage {
  id: string;
  index: string;
  title: string;
  headline: string;
  desc: string;
  verbs: string[];
  accent: string;
}

const STAGES: Stage[] = [
  {
    id: "learn",
    index: "01",
    title: "Learn",
    headline: "Curiosity becomes capability.",
    desc: "We create opportunities to learn coding, development, and emerging technologies through hands-on experiences.",
    verbs: ["Explore", "Experiment", "Grow"],
    accent: "#8B2E3B",
  },
  {
    id: "build",
    index: "02",
    title: "Build",
    headline: "Ideas become something real.",
    desc: "From small experiments to ambitious projects, members turn concepts into working products.",
    verbs: ["Design", "Develop", "Ship"],
    accent: "#FF7A00",
  },
  {
    id: "collaborate",
    index: "03",
    title: "Collaborate",
    headline: "Better things are built together.",
    desc: "We connect students, developers, and creators to share knowledge, solve problems, and build together.",
    verbs: ["Share", "Contribute", "Connect"],
    accent: "#FFA500",
  },
  {
    id: "innovate",
    index: "04",
    title: "Innovate",
    headline: "Think beyond what's already built.",
    desc: "We encourage experimentation, creative thinking, and bold ideas that can become meaningful solutions.",
    verbs: ["Imagine", "Experiment", "Impact"],
    accent: "#C2410C",
  },
];

const SLICE = 1 / STAGES.length;
const ARC_HEIGHT = 150;
const MEASURE_EPSILON = 0.5; // px — ignore sub-pixel jitter so we don't re-render for nothing

// Simple, self-contained easing functions — this framer-motion version's
// useTransform requires an actual (t: number) => number, not a string/bezier tuple.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const FLIGHT_EASE = [easeOutCubic, easeInCubic];

/* ------------------------------------------------------------------ */
/* Stage-specific supporting visual                                    */
/* ------------------------------------------------------------------ */
function SupportingVisual({ stage }: { stage: Stage }) {
  if (stage.id === "learn") {
    return (
      <div className="font-mono text-[11px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 select-none">
        <div>
          <span style={{ color: stage.accent }}>const</span> skills = [];
        </div>
        <div>
          skills.<span style={{ color: stage.accent }}>learn</span>
          (&apos;fundamentals&apos;);
        </div>
        <div className="opacity-50">// still compiling knowledge...</div>
      </div>
    );
  }
  if (stage.id === "build") {
    return (
      <div className="flex items-center gap-3 font-mono text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
        <span>build.exe</span>
        <div className="relative h-1.5 w-32 sm:w-40 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: stage.accent }}
            initial={{ width: "10%" }}
            whileInView={{ width: "82%" }}
            viewport={{ once: false, amount: 0.6 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        </div>
        <span style={{ color: stage.accent }}>82%</span>
      </div>
    );
  }
  if (stage.id === "collaborate") {
    return (
      <svg
        width="140"
        height="52"
        viewBox="0 0 140 52"
        className="overflow-visible"
        aria-hidden="true"
      >
        {[
          [10, 26],
          [70, 8],
          [70, 44],
          [130, 26],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill={stage.accent}
            opacity={0.85}
          />
        ))}
        <line x1="10" y1="26" x2="70" y2="8" stroke={stage.accent} strokeWidth="1" opacity="0.35" />
        <line x1="10" y1="26" x2="70" y2="44" stroke={stage.accent} strokeWidth="1" opacity="0.35" />
        <line x1="70" y1="8" x2="130" y2="26" stroke={stage.accent} strokeWidth="1" opacity="0.35" />
        <line x1="70" y1="44" x2="130" y2="26" stroke={stage.accent} strokeWidth="1" opacity="0.35" />
      </svg>
    );
  }
  return (
    <div className="relative w-16 h-16 flex items-center justify-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{
            borderColor: stage.accent,
            width: 16 + i * 16,
            height: 16 + i * 16,
          }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.3, 1] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
      <span className="w-2 h-2 rounded-full" style={{ background: stage.accent }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Derives a brick's entire journey — purely from scroll progress, so  */
/* it can never desync, stutter, or pause regardless of scroll speed.  */
/* ------------------------------------------------------------------ */
function useBrickMotion(
  scrollYProgress: MotionValue<number>,
  index: number,
  delta: { dx: number; dy: number },
  reduceMotion: boolean,
) {
  const base = index * SLICE;
  const flightPeak = base + SLICE * 0.2;
  const flightEnd = base + SLICE * 0.38;
  const textIn = base + SLICE * 0.5;
  const exitStart = Math.min(1, base + SLICE * 1.0);
  const exitEnd = Math.min(1, base + SLICE * 1.08);

  const peakY = reduceMotion ? delta.dy : Math.min(0, delta.dy) - ARC_HEIGHT;

  // Brick always fades out once the text has taken over its spot — otherwise
  // every landed brick would stay permanently stacked on the same landing zone.
  const brickOpacity = useTransform(
    scrollYProgress,
    [base, base + 0.001, flightEnd, textIn],
    [0, 1, 1, 0],
  );
  const brickX = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    reduceMotion ? [0, delta.dx, delta.dx] : [0, delta.dx * 0.5, delta.dx],
    { ease: FLIGHT_EASE },
  );
  const brickY = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    [0, peakY, delta.dy],
    { ease: FLIGHT_EASE },
  );
  const brickRotate = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    reduceMotion ? [0, 0, 0] : [-12, 8, 0],
    { ease: FLIGHT_EASE },
  );
  const brickScale = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    reduceMotion ? [1, 1, 1] : [0.85, 1.08, 1],
    { ease: FLIGHT_EASE },
  );

  // Both branches are always evaluated (never called conditionally) so hook
  // order stays identical across renders — only the *result* is picked below.
  const isLastStage = index === STAGES.length - 1;
  const textOpacityLoop = useTransform(
    scrollYProgress,
    [flightEnd, textIn, exitStart, exitEnd],
    [0, 1, 1, 0],
  );
  const textOpacityFinal = useTransform(
    scrollYProgress,
    [flightEnd, textIn, 1],
    [0, 1, 1],
  );
  const textOpacity = isLastStage ? textOpacityFinal : textOpacityLoop;
  const textY = useTransform(scrollYProgress, [flightEnd, textIn], reduceMotion ? [0, 0] : [16, 0]);

  // Placeholder is visible only before brick launches, then stays hidden after
  const placeholderOpacity = useTransform(
    scrollYProgress,
    [0, base, base + 0.001, textIn, 1],
    [0.75, 0.75, 0, 0, 0],
  );

  // Socket container fades out as brick exits
  const socketOpacity = useTransform(
    scrollYProgress,
    [0, base, textIn, exitEnd],
    [1, 1, 0, 0],
  );

  return {
    brickOpacity,
    brickX,
    brickY,
    brickRotate,
    brickScale,
    textOpacity,
    textY,
    placeholderOpacity,
    socketOpacity,
  };
}

/* ------------------------------------------------------------------ */
/* A single brick — solid, tactile, with a beveled highlight and glow  */
/* ------------------------------------------------------------------ */
function BrickCard({ stage }: { stage: Stage }) {
  return (
    <div
      className="inline-flex items-center gap-4 px-5 py-3 rounded-2xl whitespace-nowrap"
      style={{
        background: `linear-gradient(155deg, ${stage.accent}26, var(--card-bg) 55%)`,
        border: `1.5px solid ${stage.accent}80`,
        boxShadow: `0 18px 40px -12px ${stage.accent}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      <span
        className="font-poppins font-black text-3xl leading-none opacity-90"
        style={{ color: stage.accent }}
      >
        {stage.index}
      </span>
      <span className="font-poppins font-extrabold text-xl text-[#1A1A2E] dark:text-white">
        {stage.title}
      </span>
    </div>
  );
}

function Brick({
  stage,
  motionProps,
}: {
  stage: Stage;
  motionProps: ReturnType<typeof useBrickMotion>;
}) {
  return (
    <motion.div
      style={{
        opacity: motionProps.brickOpacity,
        x: motionProps.brickX,
        y: motionProps.brickY,
        rotate: motionProps.brickRotate,
        scale: motionProps.brickScale,
        willChange: "transform, opacity",
      }}
      className="absolute inset-0 z-30 flex items-center justify-center"
    >
      <BrickCard stage={stage} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Beaker — glass vessel that holds the stack and drains as each stage */
/* pours out into the text on the left. Fades away once fully empty.   */
/* ------------------------------------------------------------------ */
const BEAKER_W = 200;
const BEAKER_H = 280;
// Tapered silhouette: rounded lip, straight tapering walls, rounded base.
const BEAKER_PATH =
  "M28,4 H172 Q182,4 180,14 L162,240 Q160,260 140,262 L60,262 Q40,260 38,240 L20,14 Q18,4 28,4 Z";

function Beaker({
  scrollYProgress,
  activeIndex,
  reduceMotion,
  children,
}: {
  scrollYProgress: MotionValue<number>;
  activeIndex: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const accent = STAGES[Math.min(activeIndex, STAGES.length - 1)].accent;

  // Liquid level: full at the start, drains to empty as bricks launch.
  const levelPct = useTransform(scrollYProgress, [0, 0.78], ["90%", "3%"]);
  // Beaker vanishes right where the final photo begins to appear — no gap.
  const glassOpacity = useTransform(scrollYProgress, [0.84, 0.94], [1, 0]);
  const glassScale = useTransform(scrollYProgress, [0.84, 0.96], [1, 0.94]);

  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: BEAKER_W, height: BEAKER_H, opacity: glassOpacity, scale: glassScale }}
    >
      {/* Glass body: silhouette clipped to a real tapered-vessel shape */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `path("${BEAKER_PATH}")` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
            backdropFilter: "blur(2px)",
          }}
        />

        {/* Liquid fill, level tracks scroll progress */}
        <motion.div className="absolute inset-x-0 bottom-0" style={{ height: levelPct }}>
          <div
            className="absolute inset-0 transition-colors duration-500"
            style={{ background: `linear-gradient(180deg, ${accent}38, ${accent}16)` }}
          />
          {/* Meniscus — a gentle idle wobble sells it as liquid, not a bar chart */}
          <motion.div
            className="absolute inset-x-0 top-0 h-[3px] transition-colors duration-500"
            style={{ background: `${accent}90`, boxShadow: `0 0 12px ${accent}90` }}
            animate={reduceMotion ? undefined : { y: [0, -1.5, 0, 1.5, 0] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Ripple burst at the surface, timed to each brick's launch */}
          <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
            {!reduceMotion &&
              STAGES.map((s, i) => {
                const base = i * SLICE;
                return (
                  <LaunchRipple
                    key={s.id}
                    scrollYProgress={scrollYProgress}
                    base={base}
                    accent={s.accent}
                  />
                );
              })}
          </div>
        </motion.div>

        {/* Diagonal specular streak — reads as glass, not plastic */}
        <div
          className="absolute -left-6 top-0 w-10 h-full pointer-events-none"
          style={{
            background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.16) 50%, transparent 70%)",
            transform: "skewX(-12deg)",
          }}
        />

        {/* Measurement ticks — tint follows the active stage's accent */}
        <div className="absolute inset-y-6 right-3 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block w-2.5 h-px transition-colors duration-500"
              style={{ background: `${accent}70` }}
            />
          ))}
        </div>
      </div>

      {/* Glass outline, drawn on top so it stays crisp regardless of fill */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={BEAKER_W}
        height={BEAKER_H}
        viewBox={`0 0 ${BEAKER_W} ${BEAKER_H}`}
        aria-hidden="true"
      >
        <path
          d={BEAKER_PATH}
          fill="none"
          stroke="rgba(148,163,184,0.55)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Contents — each stage's slot, stacked bottom-up like liquid layers */}
      <div className="relative h-full flex flex-col justify-end gap-1 px-8 pb-6 pt-8">
        {children}
      </div>
    </motion.div>
  );
}

function LaunchRipple({
  scrollYProgress,
  base,
  accent,
}: {
  scrollYProgress: MotionValue<number>;
  base: number;
  accent: string;
}) {
  const opacity = useTransform(scrollYProgress, [base, base + SLICE * 0.12, base + SLICE * 0.32], [0, 0.9, 0]);
  const scale = useTransform(scrollYProgress, [base, base + SLICE * 0.32], [0.3, 2.4]);

  return (
    <motion.span
      className="absolute rounded-full border-2"
      style={{ width: 14, height: 14, borderColor: `${accent}90`, opacity, scale }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Shared progress control — dots for desktop, reused for mobile too   */
/* ------------------------------------------------------------------ */
function StageDots({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="tablist" aria-label="Jump to a stage">
      {STAGES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={activeIndex === i}
          aria-label={`${s.index} ${s.title}`}
          onClick={() => onSelect(i)}
          className="rounded-full transition-all duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            width: activeIndex === i ? 22 : 6,
            height: 6,
            background: i <= activeIndex ? s.accent : "rgba(128,128,128,0.25)",
            outlineColor: s.accent,
          }}
        />
      ))}
    </div>
  );
}

export default function WhatWeDoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [deltas, setDeltas] = useState(() => STAGES.map(() => ({ dx: 0, dy: 0 })));
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress: rawScrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooths raw scroll input into gentle inertia so mouse-wheel/trackpad steps
  // never feel like discrete jumps. Skipped for reduced-motion users, who get
  // the raw (1:1, no overshoot) progress instead.
  const springScrollYProgress = useSpring(rawScrollYProgress, {
    stiffness: 280,
    damping: 38,
    mass: 0.6,
    restDelta: 0.0005,
  });
  const scrollYProgress = prefersReducedMotion ? rawScrollYProgress : springScrollYProgress;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length)));
    setActiveIndex(idx);
  });

  // Re-measures the flight target for every brick. Runs before paint on
  // mount/resize (useLayoutEffect) so bricks never render with a stale target
  // and then visibly snap into place once the "real" measurement lands.
  const measure = useCallback(() => {
    const targetRect = targetRef.current?.getBoundingClientRect();
    if (!targetRect) return;
    setDeltas((prev) => {
      let changed = false;
      const next = slotRefs.current.map((el, i) => {
        if (!el) return prev[i];
        const r = el.getBoundingClientRect();
        const dx = targetRect.left - r.left;
        const dy = targetRect.top - r.top;
        if (
          Math.abs(dx - prev[i].dx) > MEASURE_EPSILON ||
          Math.abs(dy - prev[i].dy) > MEASURE_EPSILON
        ) {
          changed = true;
          return { dx, dy };
        }
        return prev[i];
      });
      return changed ? next : prev;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    // Fonts/images can still reflow layout after first paint — catch that too.
    const raf = requestAnimationFrame(measure);
    const fallback = setTimeout(measure, 350);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      if (targetRef.current) ro.observe(targetRef.current);
      slotRefs.current.forEach((el) => el && ro!.observe(el));
    }

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // eslint-disable-next-line react-hooks/rules-of-hooks -- STAGES.length is a
  // static constant, so this always calls the same number of hooks in the
  // same order on every render; safe despite the loop.
  const motions = STAGES.map((_, i) =>
    useBrickMotion(scrollYProgress, i, deltas[i], !!prefersReducedMotion),
  );

  const scrollToStage = useCallback((i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const targetProgress = i / STAGES.length + 0.02;
    const targetScroll = window.scrollY + rect.top + scrollable * targetProgress;
    window.scrollTo({
      top: targetScroll,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [prefersReducedMotion]);

  return (
    <section ref={containerRef} className="relative" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center bg-[var(--background)] transition-colors duration-300">
        <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_65%_at_35%_50%,#000_15%,transparent_100%)] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{
                opacity: activeIndex === i ? 1 : 0,
                background: `radial-gradient(circle at 25% 45%, ${s.accent}22, transparent 62%)`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          {/* Meta row */}
          <div className="flex items-center justify-between mb-8 sm:mb-10 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#1A1A2E]/45 dark:text-white/35">
            <span>What We Do / 02</span>
            <div className="hidden sm:flex items-center gap-3">
              <span className="tabular-nums">
                {String(activeIndex + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
              </span>
              <StageDots activeIndex={activeIndex} onSelect={scrollToStage} />
            </div>
          </div>

          <h2 className="font-poppins font-extrabold text-3xl sm:text-4xl tracking-tight text-[#1A1A2E] dark:text-white mb-10 sm:mb-14">
            What We <span className="ember-text">Build</span>
          </h2>

          {/* Desktop composition */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-x-16 items-center">
            {/* LEFT — landing zone: text content fades in here as bricks land */}
            <div className="lg:col-span-7 relative h-[300px]">
              <div ref={targetRef} className="absolute inset-0">
                {STAGES.map((s, i) => (
                  <motion.div
                    key={s.id}
                    style={{ opacity: motions[i].textOpacity, y: motions[i].textY }}
                    className="absolute inset-0"
                  >
                    <BrickCard stage={s} />
                    <h3 className="mt-4 text-3xl sm:text-5xl font-extrabold font-poppins tracking-tight text-[#1A1A2E] dark:text-white leading-[1.05] max-w-lg">
                      {s.headline}
                    </h3>
                    <p className="mt-5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                      {s.desc}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      {s.verbs.map((v) => (
                        <span
                          key={v}
                          className="font-mono text-xs sm:text-[13px] px-3 py-1 rounded-full border"
                          style={{
                            color: s.accent,
                            borderColor: `${s.accent}45`,
                            background: `${s.accent}0d`,
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                    <div className="mt-8">
                      <SupportingVisual stage={s} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* RIGHT — a beaker that holds each stage, draining as it "pours" bricks out into the text on the left */}
            <div className="lg:col-span-5 flex flex-col items-center relative h-[300px]">
              <motion.div
                className="relative h-full flex items-center"
                style={{
                  opacity: useTransform(scrollYProgress, [0.84, 0.94], [1, 0]),
                  pointerEvents: useTransform(scrollYProgress, [0.84, 0.94], ["auto", "none"]),
                }}
              >
                <Beaker
                  scrollYProgress={scrollYProgress}
                  activeIndex={activeIndex}
                  reduceMotion={!!prefersReducedMotion}
                >
                  {STAGES.map((s, i) => (
                    <div
                      key={s.id}
                      ref={(el) => {
                        slotRefs.current[i] = el;
                      }}
                      className="relative w-full h-16"
                    >
                      {/* Fill content — visible only before this brick launches */}
                      <motion.div
                        className="absolute inset-0 flex items-center gap-3 px-2 pointer-events-none"
                        style={{ opacity: motions[i].placeholderOpacity }}
                      >
                        <span
                          className="font-poppins font-black text-xl leading-none"
                          style={{ color: s.accent }}
                        >
                          {s.index}
                        </span>
                        <span className="font-poppins font-extrabold text-sm text-slate-700 dark:text-slate-200">
                          {s.title}
                        </span>
                      </motion.div>
                      <Brick stage={s} motionProps={motions[i]} />
                    </div>
                  ))}
                </Beaker>
              </motion.div>

              {/* Final image — crossfades in over exactly the beaker's fade-out window */}
              <motion.div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  opacity: useTransform(scrollYProgress, [0.84, 0.94], [0, 1]),
                  pointerEvents: "none",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                  alt="Coding Club members collaborating"
                  loading="lazy"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </motion.div>
            </div>
          </div>

          {/* Mobile composition — simple, still scroll-scrubbed, no stack geometry */}
          <div className="lg:hidden relative h-[360px]">
            {STAGES.map((s, i) => {
              const base = i * SLICE;
              const inEnd = base + SLICE * 0.25;
              const exitStart = Math.min(1, base + SLICE * 0.95);
              const exitEnd = Math.min(1, base + SLICE * 1.05);
              return (
                <MobileStage
                  key={s.id}
                  stage={s}
                  scrollYProgress={scrollYProgress}
                  base={base}
                  inEnd={inEnd}
                  exitStart={exitStart}
                  exitEnd={exitEnd}
                  reduceMotion={!!prefersReducedMotion}
                />
              );
            })}

            <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center">
              <StageDots activeIndex={activeIndex} onSelect={scrollToStage} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile stage card — fade + rise, scroll-scrubbed                    */
/* ------------------------------------------------------------------ */
function MobileStage({
  stage,
  scrollYProgress,
  base,
  inEnd,
  exitStart,
  exitEnd,
  reduceMotion,
}: {
  stage: Stage;
  scrollYProgress: MotionValue<number>;
  base: number;
  inEnd: number;
  exitStart: number;
  exitEnd: number;
  reduceMotion: boolean;
}) {
  const opacity = useTransform(scrollYProgress, [base, inEnd, exitStart, exitEnd], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [base, inEnd], reduceMotion ? [0, 0] : [24, 0]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0">
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest mb-5"
        style={{ color: stage.accent, border: `1px solid ${stage.accent}55` }}
      >
        {stage.index} / {stage.title}
      </div>
      <h3 className="text-3xl font-extrabold font-poppins tracking-tight text-[#1A1A2E] dark:text-white leading-[1.05]">
        {stage.headline}
      </h3>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {stage.desc}
      </p>
      <div className="mt-5 flex items-center gap-2 font-mono text-xs" style={{ color: stage.accent }}>
        {stage.verbs.map((v, i) => (
          <React.Fragment key={v}>
            {i > 0 && <span className="opacity-40" aria-hidden="true">&rarr;</span>}
            <span>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}