"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
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
            animate={{ width: "82%" }}
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
        <line
          x1="10"
          y1="26"
          x2="70"
          y2="8"
          stroke={stage.accent}
          strokeWidth="1"
          opacity="0.35"
        />
        <line
          x1="10"
          y1="26"
          x2="70"
          y2="44"
          stroke={stage.accent}
          strokeWidth="1"
          opacity="0.35"
        />
        <line
          x1="70"
          y1="8"
          x2="130"
          y2="26"
          stroke={stage.accent}
          strokeWidth="1"
          opacity="0.35"
        />
        <line
          x1="70"
          y1="44"
          x2="130"
          y2="26"
          stroke={stage.accent}
          strokeWidth="1"
          opacity="0.35"
        />
      </svg>
    );
  }
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
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
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: stage.accent }}
      />
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
) {
  const base = index * SLICE;
  const flightPeak = base + SLICE * 0.18;
  const flightEnd = base + SLICE * 0.34;
  const textIn = base + SLICE * 0.46;
  const exitStart = Math.min(1, base + SLICE * 1.0);
  const exitEnd = Math.min(1, base + SLICE * 1.06);

  const peakY = Math.min(0, delta.dy) - ARC_HEIGHT;

  const brickOpacity = useTransform(
    scrollYProgress,
    [base, base + 0.001, flightEnd, 1],
    [0, 1, 1, 1],
  );
  const brickX = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    [0, delta.dx * 0.52, delta.dx],
  );
  const brickY = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    [0, peakY, delta.dy],
  );
  const brickRotate = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    [-12, 8, 0],
  );
  const brickScale = useTransform(
    scrollYProgress,
    [base, flightPeak, flightEnd],
    [0.85, 1.06, 1],
  );

  // For the last stage, keep text visible forever; for others, fade it out
  const isLastStage = index === STAGES.length - 1;
  const textOpacity = isLastStage
    ? useTransform(scrollYProgress, [flightEnd, textIn, 1], [0, 1, 1])
    : useTransform(
        scrollYProgress,
        [flightEnd, textIn, exitStart, exitEnd],
        [0, 1, 1, 0],
      );
  const textY = useTransform(scrollYProgress, [flightEnd, textIn], [16, 0]);

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
      }}
      className="absolute inset-0 z-30 rounded-2xl overflow-hidden"
    >
      <div
        className="relative w-full h-full rounded-2xl flex items-center gap-4 px-5"
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
    </motion.div>
  );
}

export default function WhatWeDoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [deltas, setDeltas] = useState(() =>
    STAGES.map(() => ({ dx: 0, dy: 0 })),
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(
      STAGES.length - 1,
      Math.max(0, Math.floor(v * STAGES.length)),
    );
    setActiveIndex(idx);
  });

  useEffect(() => {
    function measure() {
      const targetRect = targetRef.current?.getBoundingClientRect();
      if (!targetRect) return;
      setDeltas(
        slotRefs.current.map((el) => {
          if (!el) return { dx: 0, dy: 0 };
          const r = el.getBoundingClientRect();
          return { dx: targetRect.left - r.left, dy: targetRect.top - r.top };
        }),
      );
    }
    measure();
    const t = setTimeout(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const motions = STAGES.map((_, i) =>
    useBrickMotion(scrollYProgress, i, deltas[i]),
  );

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: "400vh" }}
    >
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
            <span className="hidden sm:inline">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(STAGES.length).padStart(2, "0")}
            </span>
          </div>

          <h2 className="font-poppins font-extrabold text-3xl sm:text-4xl tracking-tight text-[#1A1A2E] dark:text-white mb-10 sm:mb-14">
            What We <span className="ember-text">Build</span>
          </h2>

          {/* Desktop composition */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-x-16 items-center">
            {/* LEFT — landing zone: text content fades in here as bricks land */}
            <div className="lg:col-span-7 relative h-[300px]">
              {/* Initial Unsplash image - completely hidden */}
              <motion.div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  opacity: 0,
                  pointerEvents: "none",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                  alt="Coding Club members collaborating"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              <div ref={targetRef} className="absolute inset-0">
                {STAGES.map((s, i) => (
                  <motion.div
                    key={s.id}
                    style={{
                      opacity: motions[i].textOpacity,
                      y: motions[i].textY,
                    }}
                    className="absolute inset-0"
                  >
                    <span
                      className="font-mono text-xs uppercase tracking-[0.25em]"
                      style={{ color: s.accent }}
                    >
                      {s.index} / {s.title}
                    </span>
                    <h3 className="mt-3 text-3xl sm:text-5xl font-extrabold font-poppins tracking-tight text-[#1A1A2E] dark:text-white leading-[1.05] max-w-lg">
                      {s.headline}
                    </h3>
                    <p className="mt-5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                      {s.desc}
                    </p>
                    <div
                      className="mt-6 flex items-center gap-2 font-mono text-xs sm:text-sm"
                      style={{ color: s.accent }}
                    >
                      {s.verbs.map((v, vi) => (
                        <React.Fragment key={v}>
                          {vi > 0 && <span className="opacity-40">&rarr;</span>}
                          <span>{v}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="mt-8">
                      <SupportingVisual stage={s} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* RIGHT — the stack: sockets that empty out as bricks launch, then final image appears */}
            <div className="lg:col-span-5 flex flex-col relative h-[300px]">
              {/* Stack containers - visible while bricks are launching */}
              <motion.div
                className="flex flex-col gap-4"
                style={{
                  opacity: useTransform(
                    scrollYProgress,
                    [0.75, 0.85],
                    [1, 0]
                  ),
                  pointerEvents: useTransform(
                    scrollYProgress,
                    [0.75, 0.85],
                    ["auto", "none"]
                  ),
                }}
              >
                {STAGES.map((s, i) => (
                  <motion.div
                    key={s.id}
                    ref={(el) => {
                      slotRefs.current[i] = el;
                    }}
                    className="relative h-20 rounded-2xl border-2 border-dashed bg-slate-50/30 dark:bg-slate-900/20 transition-all duration-300 overflow-hidden"
                    style={{
                      borderColor: s.accent + "60",
                      opacity: motions[i].socketOpacity,
                      scaleY: motions[i].socketOpacity,
                      transformOrigin: "top",
                    }}
                  >
                    {/* Socket placeholder content — visible only before brick launches, stays empty after */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"
                      style={{
                        opacity: motions[i].placeholderOpacity,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="font-poppins font-black text-2xl leading-none"
                          style={{ color: s.accent }}
                        >
                          {s.index}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-poppins font-extrabold text-base text-slate-700 dark:text-slate-200">
                            {s.title}
                          </span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Ready to launch
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                        Stack
                      </span>
                    </motion.div>
                    <Brick stage={s} motionProps={motions[i]} />
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Final image - shows after all bricks have been launched, positioned like left image */}
              <motion.div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  opacity: useTransform(
                    scrollYProgress,
                    [0.8, 0.92, 1],
                    [0, 0, 1]
                  ),
                  pointerEvents: "none",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                  alt="Coding Club members collaborating"
                  className="w-full h-full object-cover"
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
                />
              );
            })}

            <div className="absolute -bottom-2 inset-x-0 flex items-center justify-center gap-2">
              {STAGES.map((s, i) => (
                <span
                  key={s.id}
                  className="rounded-full transition-all duration-500"
                  style={{
                    width: i === activeIndex ? 20 : 6,
                    height: 6,
                    background:
                      i <= activeIndex ? s.accent : "rgba(128,128,128,0.25)",
                  }}
                />
              ))}
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
}: {
  stage: Stage;
  scrollYProgress: MotionValue<number>;
  base: number;
  inEnd: number;
  exitStart: number;
  exitEnd: number;
}) {
  const opacity = useTransform(
    scrollYProgress,
    [base, inEnd, exitStart, exitEnd],
    [0, 1, 1, 0],
  );
  const y = useTransform(scrollYProgress, [base, inEnd], [24, 0]);

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
      <div
        className="mt-5 flex items-center gap-2 font-mono text-xs"
        style={{ color: stage.accent }}
      >
        {stage.verbs.map((v, i) => (
          <React.Fragment key={v}>
            {i > 0 && <span className="opacity-40">&rarr;</span>}
            <span>{v}</span>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}
