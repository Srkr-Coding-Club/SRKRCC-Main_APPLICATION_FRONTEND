'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
    id: 'learn',
    index: '01',
    title: 'Learn',
    headline: 'Curiosity becomes capability.',
    desc: 'We create opportunities to learn coding, development, and emerging technologies through hands-on experiences.',
    verbs: ['Explore', 'Experiment', 'Grow'],
    accent: '#8B2E3B',
  },
  {
    id: 'build',
    index: '02',
    title: 'Build',
    headline: 'Ideas become something real.',
    desc: 'From small experiments to ambitious projects, members turn concepts into working products.',
    verbs: ['Design', 'Develop', 'Ship'],
    accent: '#FF7A00',
  },
  {
    id: 'collaborate',
    index: '03',
    title: 'Collaborate',
    headline: 'Better things are built together.',
    desc: 'We connect students, developers, and creators to share knowledge, solve problems, and build together.',
    verbs: ['Share', 'Contribute', 'Connect'],
    accent: '#FFA500',
  },
  {
    id: 'innovate',
    index: '04',
    title: 'Innovate',
    headline: "Think beyond what's already built.",
    desc: 'We encourage experimentation, creative thinking, and bold ideas that can become meaningful solutions.',
    verbs: ['Imagine', 'Experiment', 'Impact'],
    accent: '#C2410C',
  },
];

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 * (index % 2) }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-7 sm:p-9 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Ghost numeral — background texture */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 right-3 font-poppins font-thin leading-none select-none text-[5.5rem] sm:text-[6.5rem]"
        style={{ color: 'transparent', WebkitTextStroke: `1.5px ${stage.accent}33` }}
      >
        {stage.index}
      </span>

      <div className="relative">
        <span
          className="inline-block font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em]"
          style={{ color: stage.accent }}
        >
          {stage.title}
        </span>

        <motion.span
          initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          style={{ background: stage.accent, transformOrigin: 'left' }}
          className="mt-3 block h-[3px] w-12 rounded-full"
        />

        <h3 className="mt-5 font-poppins font-extrabold text-xl sm:text-2xl lg:text-[1.7rem] tracking-tight text-[#1A1A2E] dark:text-white leading-[1.2]">
          {stage.headline}
        </h3>

        <p className="mt-3 text-sm sm:text-base text-[#1A1A2E]/60 dark:text-white/50 leading-relaxed max-w-md">
          {stage.desc}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-[#1A1A2E]/45 dark:text-white/35">
          {stage.verbs.map((verb, i) => (
            <React.Fragment key={verb}>
              {i > 0 && <span className="opacity-50">&middot;</span>}
              <span>{verb}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function WhatWeDoSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-[var(--background)] transition-colors duration-300">
      {/* Backdrop — dot-grid, matches the About / Events sections */}
      <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — same container + type scale as the About section */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 sm:mb-16 max-w-2xl"
        >
          <span className="block text-xs font-bold tracking-[0.3em] text-[#FF7A00] uppercase mb-3">
            What We Do
          </span>
          <h2 className="font-poppins font-extrabold text-3xl sm:text-4xl tracking-tight text-[#1A1A2E] dark:text-white">
            What We <span className="ember-text">Build</span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Four stages every member moves through — from first steps to shipping ideas that matter.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
          {STAGES.map((stage, i) => (
            <StageCard key={stage.id} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
