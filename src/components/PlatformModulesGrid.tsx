'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trophy, Sparkles, Terminal, Briefcase, BookOpen, ArrowRight, Zap, ChevronDown, LucideIcon } from 'lucide-react';

interface ModuleItem {
  key: string;
  title: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  bullets: string[];
  statValue: string;
  statLabel: string;
}

const MODULES: ModuleItem[] = [
  {
    key: 'events',
    title: 'Events & Workshops',
    desc: 'Workshops, tech talks, seminars, and club meetups.',
    href: '/events',
    icon: Calendar,
    accent: '#FF7A00',
    bullets: ['Hands-on coding workshops', 'Guest speaker sessions', 'Monthly club meetups'],
    statValue: '50+',
    statLabel: 'events hosted',
  },
  {
    key: 'hackathons',
    title: 'Hackathons Engine',
    desc: 'Multi-round hackathons with team formation and judging.',
    href: '/hackathons',
    icon: Trophy,
    accent: '#FFA500',
    bullets: ['Team formation tools', 'Live leaderboard & judging', 'Sponsor-backed prizes'],
    statValue: '12',
    statLabel: 'hackathons run',
  },
  {
    key: 'iconcoders',
    title: 'IconCoders Flagship',
    desc: 'Flagship annual hackathon landing & Hall of Fame.',
    href: '/iconcoders',
    icon: Sparkles,
    accent: '#8B2E3B',
    bullets: ['Annual flagship event', 'Hall of Fame showcase', 'Industry mentor panels'],
    statValue: '3rd',
    statLabel: 'edition live',
  },
  {
    key: 'codequest',
    title: 'Codequest Daily',
    desc: 'Daily coding problem of the day and streak tracker.',
    href: '/codequest',
    icon: Terminal,
    accent: '#C2410C',
    bullets: ['New problem every day', 'Streak & XP tracking', 'Difficulty-based tiers'],
    statValue: '365',
    statLabel: 'day streaks',
  },
  {
    key: 'career',
    title: 'Career Opportunities',
    desc: 'Internships, job drives, and referral applications.',
    href: '/career',
    icon: Briefcase,
    accent: '#FF7A00',
    bullets: ['Verified internship listings', 'Referral fast-track', 'Resume review support'],
    statValue: '80+',
    statLabel: 'placements',
  },
  {
    key: 'blogs',
    title: 'Blogs & Write-ups',
    desc: 'Member articles, technical tutorials, and club updates.',
    href: '/blogs',
    icon: BookOpen,
    accent: '#FFA500',
    bullets: ['Member-written tutorials', 'Weekly tech digest', 'Open contribution model'],
    statValue: '120+',
    statLabel: 'articles',
  },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

function RailColumn({ m, isActive, enabled, onActivate }: { m: ModuleItem; isActive: boolean; enabled: boolean; onActivate: () => void }) {
  const Icon = m.icon;
  return (
    <div
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className="relative h-[26rem] rounded-3xl overflow-hidden transition-[flex-grow] duration-500 ease-out"
      style={{ flexGrow: isActive ? 5 : 1, flexBasis: 0, minWidth: isActive ? undefined : 88 }}
    >
      <Link href={enabled ? m.href : '#'} className={`absolute inset-0 ${enabled ? '' : 'pointer-events-none'}`} tabIndex={0}>
        <div
          className="relative h-full p-[1.5px] rounded-3xl transition-opacity duration-300"
          style={
            enabled
              ? { background: `linear-gradient(155deg, ${m.accent}55, transparent 45%, transparent 70%, ${m.accent}25)` }
              : { background: 'rgba(128,128,128,0.15)' }
          }
        >
          <div className={`relative h-full rounded-3xl bg-[var(--card-bg)] overflow-hidden ${enabled ? '' : 'opacity-55'}`}>
            {/* ambient glow when active */}
            {isActive && enabled && (
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: m.accent }} />
            )}

            {/* Giant watermark icon — premium background texture when expanded */}
            <motion.div
              className="absolute -right-6 -bottom-6 pointer-events-none"
              animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.85 }}
              transition={{ duration: 0.5 }}
            >
              <Icon className="w-40 h-40" strokeWidth={0.75} style={{ color: m.accent, opacity: 0.08 }} />
            </motion.div>

            {/* Icon — always present, slides position */}
            <div
              className="absolute rounded-full flex items-center justify-center border transition-all duration-500"
              style={{
                width: 56,
                height: 56,
                top: 28,
                left: isActive ? 28 : '50%',
                transform: isActive ? 'none' : 'translateX(-50%)',
                background: `linear-gradient(135deg, ${m.accent}20, transparent)`,
                borderColor: `${m.accent}45`,
                color: m.accent,
              }}
            >
              <Icon className="w-6 h-6" strokeWidth={1.75} />
            </div>

            {/* Collapsed spine label */}
            <div
              className="absolute inset-x-0 bottom-8 flex items-center justify-center transition-opacity duration-300"
              style={{ opacity: isActive ? 0 : 1 }}
            >
              <span
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1A1A2E]/55 dark:text-white/45 whitespace-nowrap"
                style={{ writingMode: 'vertical-rl' }}
              >
                {m.title}
              </span>
            </div>

            {/* Expanded content */}
            <motion.div
              className="absolute inset-x-0 top-24 bottom-0 px-7 flex flex-col"
              animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
              transition={{ duration: 0.3, delay: isActive ? 0.15 : 0 }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: m.accent }}>
                Module
              </span>
              <h3 className="mt-1.5 text-xl font-bold font-poppins text-[#1A1A2E] dark:text-white whitespace-nowrap">{m.title}</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-[240px]">{m.desc}</p>

              <ul className="mt-5 space-y-2.5">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: m.accent }} />
                    <span className="whitespace-nowrap">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pb-7">
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="text-2xl font-extrabold font-poppins" style={{ color: m.accent }}>
                    {m.statValue}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {m.statLabel}
                  </span>
                </div>

                {enabled ? (
                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                      style={{ borderColor: `${m.accent}40`, backgroundColor: `${m.accent}12`, color: m.accent }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: m.accent }} />
                      Live
                    </span>
                    <ArrowRight className="w-4 h-4" style={{ color: m.accent }} />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic font-mono">Disabled by admin</span>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function AccordionRow({ m, isOpen, enabled, onToggle }: { m: ModuleItem; isOpen: boolean; enabled: boolean; onToggle: () => void }) {
  const Icon = m.icon;
  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.08]">
      <button onClick={onToggle} className="w-full flex items-center gap-4 py-5 text-left">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center border flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${m.accent}20, transparent)`, borderColor: `${m.accent}45`, color: m.accent }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <span className="flex-1 font-bold font-poppins text-[#1A1A2E] dark:text-white">{m.title}</span>
        <ChevronDown
          className="w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pb-5 ml-[60px]">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{m.desc}</p>
              <ul className="space-y-2 mb-4">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: m.accent }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-lg font-extrabold font-poppins" style={{ color: m.accent }}>
                  {m.statValue}
                </span>
                <span className="text-xs font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {m.statLabel}
                </span>
              </div>
              {enabled ? (
                <Link href={m.href} className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: m.accent }}>
                  Open module <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-xs text-slate-400 italic font-mono">Disabled by admin</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlatformModulesGrid({ enabledMap }: { enabledMap: Record<string, boolean> }) {
  const [activeKey, setActiveKey] = useState(MODULES[0].key);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="relative py-20 sm:py-28 bg-[var(--background)] transition-colors duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,#000_15%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#FF7A00] border border-[#FF7A00]/30 px-3.5 py-1.5 rounded-full mb-5"
          >
            <Zap className="w-3 h-3" />
            Platform Ecosystem
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-3xl sm:text-5xl font-extrabold font-poppins text-[#1A1A2E] dark:text-white leading-tight max-w-3xl"
          >
            Explore every <span className="ember-text">module.</span> Expand your <span className="ember-text">horizons.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-5 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed"
          >
            Hover a module to open it up. Every tool controlled dynamically via feature flags.
          </motion.p>
        </div>

        {/* Desktop — expanding rail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex gap-3"
        >
          {MODULES.map((m) => (
            <RailColumn
              key={m.key}
              m={m}
              isActive={activeKey === m.key}
              enabled={enabledMap[m.key] ?? true}
              onActivate={() => setActiveKey(m.key)}
            />
          ))}
        </motion.div>

        {/* Mobile / tablet — accordion */}
        <div className="lg:hidden border-t border-black/[0.06] dark:border-white/[0.08]">
          {MODULES.map((m) => (
            <AccordionRow
              key={m.key}
              m={m}
              isOpen={openKey === m.key}
              enabled={enabledMap[m.key] ?? true}
              onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
            />
          ))}
        </div>

        {/* Footer stat row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-14 pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {MODULES.length} modules &middot; dynamically managed via feature flags
          </p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500/60" />
              Disabled
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
