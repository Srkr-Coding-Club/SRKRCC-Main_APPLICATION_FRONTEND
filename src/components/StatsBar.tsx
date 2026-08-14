'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { UserCheck, CalendarDays, Code2, Trophy, LucideIcon } from 'lucide-react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const STATS: Stat[] = [
  {
    value: 500,
    suffix: '+',
    label: 'Active Members',
    description: 'Passionate learners and builders from across campus.',
    icon: UserCheck,
    accent: '#8B2E3B',
  },
  {
    value: 50,
    suffix: '+',
    label: 'Events Conducted',
    description: 'Workshops, hackathons and sessions that inspire growth.',
    icon: CalendarDays,
    accent: '#FF7A00',
  },
  {
    value: 100,
    suffix: '+',
    label: 'Projects Built',
    description: 'Innovative projects solving real-world problems.',
    icon: Code2,
    accent: '#FFA500',
  },
  {
    value: 25,
    suffix: '+',
    label: 'Achievements',
    description: 'Milestones, wins, and recognitions that motivate us.',
    icon: Trophy,
    accent: '#C2410C',
  },
];

/* ------------------------------------------------------------------ */
/* Decorative sweeping arcs framing the card grid                      */
/* ------------------------------------------------------------------ */
function SweepingArcs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-[420px] w-[1100px] h-[900px] rounded-full border border-[#8B2E3B]/15 dark:border-[#FF7A00]/15"
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-[460px] w-[1200px] h-[900px] rounded-full border border-[#FF7A00]/10 dark:border-[#FFA500]/10"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Corner viewfinder brackets, matching the hero's framing language    */
/* ------------------------------------------------------------------ */
function CornerBrackets() {
  const corners = [
    'top-4 left-4 sm:top-6 sm:left-6 border-t border-l',
    'top-4 right-4 sm:top-6 sm:right-6 border-t border-r',
    'bottom-4 left-4 sm:bottom-6 sm:left-6 border-b border-l',
    'bottom-4 right-4 sm:bottom-6 sm:right-6 border-b border-r',
  ];
  return (
    <>
      {corners.map((pos, i) => (
        <div
          key={i}
          className={`absolute w-5 h-5 sm:w-6 sm:h-6 border-[#1A1A2E]/15 dark:border-white/15 pointer-events-none z-10 ${pos}`}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Single impact stat card with a GSAP count-up number                 */
/* ------------------------------------------------------------------ */
function ImpactCard({ stat, delay }: { stat: Stat; delay: number }) {
  const numRef = useRef<HTMLSpanElement>(null);
  const Icon = stat.icon;

  useEffect(() => {
    if (!numRef.current) return;
    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: stat.value,
      duration: 1.8,
      delay: delay + 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(counter.val).toString();
      },
    });
    return () => {
      tween.kill();
    };
  }, [stat.value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl p-6 sm:p-7 overflow-hidden border bg-[var(--card-bg)] transition-colors duration-300"
      style={{ borderColor: `${stat.accent}30` }}
    >
      {/* corner glow, brightens on hover */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-25 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none"
        style={{ background: stat.accent }}
      />

      {/* icon badge */}
      <div className="relative w-14 h-14 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${stat.accent}45` }} />
        <div className="absolute inset-[3px] rounded-full border border-dashed" style={{ borderColor: `${stat.accent}30` }} />
        <Icon className="w-6 h-6 relative z-10" style={{ color: stat.accent }} strokeWidth={1.75} />
      </div>

      {/* count-up number */}
      <div className="flex items-baseline gap-0.5 font-poppins">
        <span ref={numRef} className="text-4xl sm:text-5xl font-extrabold" style={{ color: stat.accent }}>
          0
        </span>
        <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: stat.accent }}>
          {stat.suffix}
        </span>
      </div>

      <div className="mt-3 mb-3 h-px w-10 rounded-full" style={{ background: stat.accent }} />

      <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: stat.accent }}>
        {stat.label}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{stat.description}</p>
    </motion.div>
  );
}

export default function StatsBar() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-[var(--background)] transition-colors duration-300">
      <div className="absolute inset-0 bg-blueprint-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_65%_at_50%_40%,#000_15%,transparent_100%)] pointer-events-none" />
      <SweepingArcs />
      <CornerBrackets />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 sm:mb-20"
        >
          <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-[#FF7A00] mb-4">
            <span>&lt;</span>
            <span>Our Impact</span>
            <span>&gt;</span>
          </div>
          <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent mb-6" />
          <h2 className="font-poppins font-extrabold text-3xl sm:text-5xl tracking-tight">
            <span className="text-[#1A1A2E] dark:text-white">Building More </span>
            <span className="text-[#8B2E3B] dark:text-[#E05263]">Than </span>
            <span className="ember-text">Code.</span>
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            A community of learners, creators, and problem solvers pushing boundaries together.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {STATS.map((stat, i) => (
            <ImpactCard key={stat.label} stat={stat} delay={i * 0.1} />
          ))}
        </div>

        {/* Footer tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 sm:mt-16 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500"
        >
          <span className="hidden sm:block h-px w-10 bg-current opacity-30" />
          <span className="text-[#FF7A00]">&lt;/&gt;</span>
          <span>Together we code the future</span>
          <span className="text-[#FF7A00]">&lt;&gt;</span>
          <span className="hidden sm:block h-px w-10 bg-current opacity-30" />
        </motion.div>
      </div>
    </section>
  );
}
