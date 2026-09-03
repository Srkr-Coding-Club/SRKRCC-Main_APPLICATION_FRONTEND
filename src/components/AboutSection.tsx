'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/* Word-by-word masked reveal for display headings — a single viewport  */
/* observer on the parent drives all children via variant propagation.  */
/* ------------------------------------------------------------------ */
const revealContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const revealWord = {
  hidden: { y: '115%' },
  visible: { y: '0%', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

function RevealLine({
  words,
  baseDelay = 0,
}: {
  words: { text: string; className?: string }[];
  baseDelay?: number;
}) {
  return (
    <motion.span
      className="block"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={revealContainer}
      transition={{ delayChildren: baseDelay }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.26em] pb-[0.08em] align-bottom">
          <motion.span className={`inline-block ${w.className || ''}`} variants={revealWord}>
            {w.text}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* Premium interactive CTA — morphing label, self-drawing underline     */
/* ------------------------------------------------------------------ */
function KnowMoreCTA() {
  return (
    <Link href="/about" className="group relative inline-flex flex-col gap-2.5 w-fit">
      <span className="relative h-6 overflow-hidden">
        <span className="flex items-center gap-2 font-poppins font-bold text-sm uppercase tracking-wider text-[#1A1A2E] dark:text-white transition-transform duration-300 ease-out group-hover:-translate-y-6">
          Know More
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
        <span className="absolute inset-0 flex items-center gap-2 font-poppins font-bold text-sm uppercase tracking-wider text-[#FF7A00] translate-y-6 transition-transform duration-300 ease-out group-hover:translate-y-0">
          About Us
          <ArrowRight className="w-4 h-4" />
        </span>
      </span>
      <span className="relative h-px w-40 bg-black/15 dark:bg-white/15 overflow-hidden">
        <span className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00] transition-all duration-500 ease-out group-hover:w-full" />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Learn / Build / Collaborate micro index                             */
/* ------------------------------------------------------------------ */
function MicroSteps() {
  const steps = ['Learn', 'Build', 'Collaborate'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
    >
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="opacity-30">/</span>}
          <span>
            <span className="text-[#FF7A00] mr-1.5">0{i + 1}</span>
            {s}
          </span>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

export default function AboutSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[var(--background)] transition-colors duration-300">
      {/* Backdrop — dot-grid, distinct from the hero's line grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Meta row */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-12 sm:mb-16 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#1A1A2E]/45 dark:text-white/35"
        >
          <span>About Us</span>
          <span className="hidden sm:inline">Student Developer Community</span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — heading + copy + CTA */}
          <div className="relative z-10 space-y-7">
            <span className="block text-xs font-bold tracking-[0.3em] text-[#FF7A00] uppercase">
              Who We Are
            </span>

            <h2 className="font-poppins font-extrabold leading-[0.98] tracking-tight text-[clamp(2.25rem,5.5vw,3.75rem)] text-[#1A1A2E] dark:text-white">
              <RevealLine words={[{ text: 'Building' }, { text: 'Coders.' }]} baseDelay={0.1} />
              <RevealLine
                words={[{ text: 'Creating' }, { text: 'Innovators.', className: 'ember-text' }]}
                baseDelay={0.35}
              />
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-md text-slate-600 dark:text-slate-300 text-base leading-relaxed"
            >
              SRKR Coding Club is a student-driven community passionate about coding, development, and
              emerging technologies. We organize events, workshops, and challenges that inspire learners
              to explore, experiment, and excel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <KnowMoreCTA />
            </motion.div>

            <MicroSteps />
          </div>

          {/* Right — image in a gradient-bordered frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* ambient glow, tight to the frame */}
            <div
              className="absolute -inset-6 rounded-[10px] blur-2xl opacity-70 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, var(--glow-mid), transparent)' }}
            />

            <div
              className="relative z-10 p-[2px] rounded-[10px]"
              style={{ background: 'linear-gradient(135deg, #FFA500, #FF7A00 45%, #8B2E3B 85%)' }}
            >
              <div className="relative overflow-hidden rounded-[10px] bg-[var(--card-bg)]">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"
                  alt="SRKR Coding Club members collaborating on a project"
                  loading="lazy"
                  className="w-full h-[340px] sm:h-[420px] lg:h-[460px] object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-tr from-[#1A1A2E]/40 via-transparent to-transparent"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
