'use client';

import React from 'react';
import { motion } from 'framer-motion';
import PillButton from './PillButton';
import BrainLogo from './BrainLogo';

export default function CallToActionBanner() {
  return (
    <section id="join" className="relative py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
          className="relative rounded-[2rem] p-[1.5px] overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #8B2E3B70, transparent 45%, transparent 65%, #FF7A0055)' }}
        >
          <div
            className="relative rounded-[2rem] overflow-hidden p-10 sm:p-16"
            style={{ background: 'linear-gradient(155deg, rgba(139,46,59,0.10), var(--card-bg) 55%)' }}
          >
            <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,#000_15%,transparent_100%)] pointer-events-none" />
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'var(--glow-mid)' }}
            />

            {/* Giant club-mark watermark */}
            <div className="absolute -right-10 -bottom-16 sm:-right-4 sm:-bottom-20 opacity-[0.06] dark:opacity-[0.08] pointer-events-none rotate-[-8deg]">
              <BrainLogo size={280} showRays={false} animated={false} />
            </div>

            {/* corner brackets */}
            <span className="absolute top-5 left-5 w-5 h-5 border-t border-l border-black/15 dark:border-white/15" />
            <span className="absolute top-5 right-5 w-5 h-5 border-t border-r border-black/15 dark:border-white/15" />
            <span className="absolute bottom-5 left-5 w-5 h-5 border-b border-l border-black/15 dark:border-white/15" />
            <span className="absolute bottom-5 right-5 w-5 h-5 border-b border-r border-black/15 dark:border-white/15" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-[#FF7A00]">
                  <span>&lt;/&gt;</span>
                  <span>Join the community</span>
                </div>

                <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold font-poppins tracking-tight text-[#1A1A2E] dark:text-white leading-[1.05]">
                  Ready to level up your <span className="ember-text">coding journey?</span>
                </h2>

                <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                  Join SRKR Coding Club today and be part of a community that builds the future — one commit at a time.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Applications open &middot; 500+ members already building
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
                <PillButton href="/signup" variant="solid">
                  Join Us Now
                </PillButton>
                <PillButton href="/events" variant="outline">
                  Explore Events
                </PillButton>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
