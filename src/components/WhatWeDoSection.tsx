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

function StageRow({ stage, index }: { stage: Stage; index: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      className={`relative grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-10 py-10 sm:py-12 ${
        index > 0 ? 'border-t border-[#1A1A2E]/[0.07] dark:border-white/[0.08]' : ''
      }`}
    >
      {/* Ghost numeral + reading marker */}
      <div className="min-w-0 lg:col-span-3 flex lg:flex-col items-baseline lg:items-start gap-4">
        <span
          className="font-poppins font-thin leading-none text-[clamp(3.5rem,7vw,5.5rem)] select-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: `1.5px ${stage.accent}55`,
          }}
        >
          {stage.index}
        </span>
        <motion.span
          initial={prefersReducedMotion ? undefined : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
          style={{ background: stage.accent, transformOrigin: 'left' }}
          className="hidden lg:block h-[3px] w-14 rounded-full"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 lg:col-span-9">
        <span
          className="inline-block font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] mb-3"
          style={{ color: stage.accent }}
        >
          {stage.title}
        </span>
        <h3 className="font-poppins font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#1A1A2E] dark:text-white leading-[1.15] max-w-xl">
          {stage.headline}
        </h3>
        <p className="mt-4 text-sm sm:text-base text-[#1A1A2E]/60 dark:text-white/50 leading-relaxed max-w-lg">
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
      {/* one quiet ambient glow, no per-stage effects */}
      <div
        aria-hidden="true"
        className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--glow-mid), transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 sm:mb-6"
        >
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#1A1A2E]/45 dark:text-white/35">
            What We Do
          </span>
          <h2 className="mt-3 font-poppins font-extrabold text-3xl sm:text-4xl tracking-tight text-[#1A1A2E] dark:text-white">
            What We <span className="ember-text">Build</span>
          </h2>
        </motion.div>

        <div>
          {STAGES.map((stage, i) => (
            <StageRow key={stage.id} stage={stage} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
