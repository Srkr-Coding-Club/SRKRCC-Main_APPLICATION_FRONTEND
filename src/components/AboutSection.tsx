'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import BrainLogo from './BrainLogo';

/* ------------------------------------------------------------------ */
/* Word-by-word masked reveal for display headings — a single viewport  */
/* observer on the parent drives all children via variant propagation,  */
/* which is far more reliable than one observer per word.               */
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
/* Small technical annotation anchored to the image frame              */
/* ------------------------------------------------------------------ */
function CornerNode({
  label,
  position,
  align = 'left',
  delay = 0.9,
}: {
  label: string;
  position: string;
  align?: 'left' | 'right';
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={`hidden sm:flex absolute ${position} items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF7A00]" />
      </span>
      <span
        className={`h-px w-8 bg-gradient-to-r ${
          align === 'right' ? 'from-[#FF7A00]/50 to-transparent' : 'from-transparent to-[#FF7A00]/50'
        }`}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1A1A2E]/50 dark:text-white/40 whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Premium interactive CTA — morphing label, self-drawing underline     */
/* ------------------------------------------------------------------ */
function KnowMoreCTA() {
  return (
    <Link href="/blogs" className="group relative inline-flex flex-col gap-2.5 w-fit">
      <span className="relative h-6 overflow-hidden">
        <span className="flex items-center gap-2 font-poppins font-bold text-sm uppercase tracking-wider text-[#1A1A2E] dark:text-white transition-transform duration-300 ease-out group-hover:-translate-y-6">
          Know More
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
        <span className="absolute inset-0 flex items-center gap-2 font-poppins font-bold text-sm uppercase tracking-wider text-[#FF7A00] translate-y-6 transition-transform duration-300 ease-out group-hover:translate-y-0">
          Explore Us
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
      transition={{ duration: 0.6, delay: 0.9 }}
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
    <section className="relative py-24 sm:py-32 lg:py-40 overflow-hidden bg-[var(--background)] transition-colors duration-300">
      {/* Backdrop — dot-grid, distinct from the hero's line grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Meta row */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-14 sm:mb-20 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#1A1A2E]/45 dark:text-white/35"
        >
          <span>About Us</span>
          <span className="hidden sm:inline">Student Developer Community</span>
        </motion.div>

        <div className="relative lg:grid lg:grid-cols-12 lg:gap-x-8">
          {/* Heading — line one */}
          <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1 relative z-20">
            <span className="block text-xs font-bold tracking-[0.3em] text-[#FF7A00] uppercase mb-4">About Us</span>
            <h2 className="font-poppins font-extrabold leading-[0.95] tracking-tight text-[clamp(2.25rem,6vw,4.25rem)] text-[#1A1A2E] dark:text-white">
              <RevealLine words={[{ text: 'Building' }, { text: 'Coders.' }]} baseDelay={0.15} />
            </h2>
          </div>

          {/* Image composition — tall, overlaps into the text column with a fade blend */}
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 relative mt-10 lg:mt-0 lg:-ml-14">
            {/* ambient glow, tight to the frame — not the hero's big blob */}
            <div
              className="absolute -inset-6 rounded-[2.5rem] blur-2xl opacity-70 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, var(--glow-mid), transparent)' }}
            />

            {/* offset secondary frame for layered depth */}
            <div className="absolute inset-4 -z-0 rounded-[2rem] border border-[#8B2E3B]/25 dark:border-[#FF7A00]/20 -rotate-2" />

            {/* connecting trace between the two corner nodes */}
            <svg className="hidden sm:block absolute -top-6 left-10 w-32 h-16 overflow-visible pointer-events-none" viewBox="0 0 120 60">
              <motion.path
                d="M2,58 C 40,58 40,2 118,2"
                fill="none"
                stroke="#FF7A00"
                strokeOpacity="0.4"
                strokeWidth="1"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, delay: 0.6, ease: 'easeInOut' }}
              />
            </svg>

            <CornerNode label="" position="-top-8 left-6" align="left" delay={0.7} />
            <CornerNode label="" position="-bottom-8 right-6" align="right" delay={1.0} />

            {/* frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 p-[2px] rounded-[2.5rem]"
              style={{ background: 'linear-gradient(135deg, #FFA500, #FF7A00 45%, #8B2E3B 85%)' }}
            >
              <div
                className="relative overflow-hidden bg-[var(--card-bg)]"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)',
                  borderRadius: '2.4rem',
                }}
              >
                <div
                  aria-hidden="true"
                  className="relative w-full h-[340px] sm:h-[420px] lg:h-[480px] flex items-center justify-center bg-blueprint-grid"
                  style={{
                    maskImage: 'linear-gradient(120deg, transparent 0%, black 20%)',
                    WebkitMaskImage: 'linear-gradient(120deg, transparent 0%, black 20%)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: 'radial-gradient(circle at 30% 40%, var(--glow-mid), transparent 65%)' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                  >
                    <BrainLogo size={140} showRays={true} animated={true} />
                  </motion.div>
                </div>
                {/* subtle grain */}
                <div
                  className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Heading line two + copy + CTA + micro steps */}
          <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2 relative z-20 mt-8 lg:mt-10 space-y-7">
            <h2 className="font-poppins font-extrabold leading-[0.95] tracking-tight text-[clamp(2.25rem,6vw,4.25rem)] text-[#1A1A2E] dark:text-white">
              <RevealLine words={[{ text: 'Creating' }, { text: 'Innovators.', className: 'ember-text' }]} baseDelay={0.45} />
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="max-w-sm text-slate-600 dark:text-slate-300 text-base leading-relaxed"
            >
              SRKR Coding Club is a student-driven community passionate about coding, development, and emerging
              technologies. We organize events, workshops, and challenges that inspire learners to explore,
              experiment, and excel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.85 }}
            >
              <KnowMoreCTA />
            </motion.div>

            <MicroSteps />
          </div>
        </div>
      </div>
    </section>
  );
}
