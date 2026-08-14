'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Moon,
  Sun,
  User,
  ChevronDown,
  Sparkles,
  Terminal,
  Trophy,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainLogo from './BrainLogo';
import PillButton from './PillButton';

interface NavChild {
  label: string;
  href: string;
  desc?: string;
  icon?: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Events',
    href: '/events',
    hasDropdown: true,
    children: [
      {
        label: 'Upcoming Workshops',
        href: '/events',
        desc: 'Interactive hands-on sessions & masterclasses',
        icon: Calendar,
      },
      {
        label: 'Hackathons Engine',
        href: '/hackathons',
        desc: '48hr build sprints & competitive arena',
        icon: Terminal,
      },
      {
        label: 'IconCoders Flagship',
        href: '/iconcoders',
        desc: 'Annual premier algorithmic championship',
        icon: Trophy,
      },
      {
        label: 'Codequest Daily',
        href: '/codequest',
        desc: 'Bite-sized challenges to keep sharp daily',
        icon: Sparkles,
      },
    ],
  },
  { label: 'Forms', href: '/forms' },
  { label: 'Blogs', href: '/blogs' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-6xl mx-auto rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white/70 dark:bg-[#07090E]/70 backdrop-blur-2xl"
        style={{
          boxShadow: '0 8px 30px rgba(0,0,0,0.05), 0 0 40px var(--glow-soft)',
        }}
      >
        {/* top hairline accent, ties back to the hero's ember identity */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF7A00]/50 to-transparent" />

        <div className="flex items-center justify-between h-16 sm:h-[68px] px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3 relative z-10" aria-label="SRKR Coding Club Home">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="relative flex items-center justify-center p-1.5 rounded-xl bg-gradient-to-tr from-black/[0.03] to-transparent dark:from-white/[0.06] border border-black/5 dark:border-white/10"
            >
              <BrainLogo size={28} showRays={false} animated={false} />
            </motion.div>

            <div className="flex flex-col leading-none">
              <span className="font-poppins font-black text-base tracking-tight bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] bg-clip-text text-transparent">
                SRKR
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.24em] font-semibold text-[#1A1A2E]/50 dark:text-white/40 mt-0.5">
                Coding Club
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-1 relative"
            onMouseLeave={() => {
              setHoveredIndex(null);
              setActiveDropdown(null);
            }}
          >
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href || (item.children && item.children.some((c) => pathname === c.href));
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    setHoveredIndex(idx);
                    setActiveDropdown(item.hasDropdown ? item.label : null);
                  }}
                >
                  <Link
                    href={item.href}
                    className={`relative z-10 flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-[#1A1A2E] dark:text-white font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-[#1A1A2E] dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          activeDropdown === item.label ? 'rotate-180 text-[#FF7A00]' : 'opacity-60'
                        }`}
                      />
                    )}
                  </Link>

                  {isHovered && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                      className="absolute inset-0 z-0 rounded-xl bg-black/[0.04] dark:bg-white/[0.08]"
                    />
                  )}

                  {isActive && (
                    <span className="absolute -bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full bg-gradient-to-r from-[#8B2E3B] to-[#FF7A00]" />
                  )}

                  {item.hasDropdown && (
                    <AnimatePresence>
                      {activeDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="absolute left-1/2 top-full -translate-x-1/2 pt-2 w-80 z-50"
                        >
                          <div className="p-2 rounded-2xl bg-white/95 dark:bg-[#0C0E14]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl shadow-black/10 dark:shadow-black/60 flex flex-col gap-1 overflow-hidden">
                            {item.children?.map((child) => {
                              const IconComponent = child.icon || ArrowRight;
                              const isChildActive = pathname === child.href;

                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  className={`group/item flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 ${
                                    isChildActive ? 'bg-black/[0.04] dark:bg-white/[0.06]' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <div className="p-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-300 group-hover/item:text-[#FF7A00] group-hover/item:scale-105 transition-all">
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover/item:text-[#FF7A00] transition-colors">
                                      {child.label}
                                    </span>
                                    {child.desc && (
                                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5 line-clamp-1">
                                        {child.desc}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/profile"
              className="relative p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-[#1A1A2E] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
              aria-label="User Profile"
            >
              <User className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#1A1A2E] dark:hover:text-white px-2 py-1 transition-colors"
            >
              Login
            </Link>

            <PillButton href="/signup" variant="solid" size="sm">
              Join the Club
            </PillButton>

            <button
              onClick={toggleDarkMode}
              className="relative w-9 h-9 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 transition-all duration-300"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDarkMode ? 'sun' : 'moon'}
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-xl border border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <motion.span
                animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="w-4 h-[1.5px] bg-neutral-800 dark:bg-neutral-100 origin-center"
              />
              <motion.span
                animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-4 h-[1.5px] bg-neutral-800 dark:bg-neutral-100"
              />
              <motion.span
                animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="w-4 h-[1.5px] bg-neutral-800 dark:bg-neutral-100 origin-center"
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 top-0 bg-white/95 dark:bg-[#05060A]/97 backdrop-blur-2xl z-40 flex flex-col justify-between p-6 pt-24 overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="border-b border-black/[0.06] dark:border-white/[0.07] pb-3"
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-poppins font-bold text-2xl text-neutral-900 dark:text-neutral-100 flex items-center justify-between py-2"
                  >
                    {item.label}
                  </Link>

                  {item.hasDropdown && item.children && (
                    <div className="grid grid-cols-1 gap-2 pt-2 pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 active:text-[#FF7A00]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="pt-6 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-4">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-3 rounded-xl border border-black/10 dark:border-white/10 font-semibold text-sm text-neutral-800 dark:text-neutral-200"
                >
                  Login
                </Link>
                <div className="flex-1">
                  <PillButton href="/signup" variant="solid" onClick={() => setMobileMenuOpen(false)}>
                    Join the Club
                  </PillButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
