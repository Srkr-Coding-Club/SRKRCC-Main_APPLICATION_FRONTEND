'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Moon,
  Sun,
  ArrowLeft,
  ChevronDown,
  BarChart3,
  Users,
  Plus,
  FileText,
  Trophy,
  BookOpen,
  Sliders,
  History,
  LayoutGrid,
  Inbox,
  UserCheck,
  UploadCloud,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainLogo from '../BrainLogo';

interface NavChild {
  label: string;
  shortLabel: string;
  href: string;
  desc: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: React.ElementType;
  hasDropdown?: boolean;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'User Control', shortLabel: 'Users', href: '/admin/users', icon: Users },
  {
    label: 'Modules',
    shortLabel: 'Modules',
    href: '/admin/builder',
    icon: LayoutGrid,
    hasDropdown: true,
    children: [
      { label: 'Forms Builder', shortLabel: 'Builder', href: '/admin/builder', desc: 'Drag & drop form canvas', icon: Plus },
      { label: 'Forms Registry', shortLabel: 'Forms', href: '/admin/forms', desc: 'Manage, close & bulk actions', icon: FileText },
      { label: 'Responses', shortLabel: 'Responses', href: '/admin/responses', desc: 'View & export submissions', icon: Inbox },
      { label: 'Members', shortLabel: 'Members', href: '/admin/members', desc: 'Club member directory', icon: UserCheck },
      { label: 'Import Data', shortLabel: 'Import', href: '/admin/csv-ingestion', desc: 'Bulk CSV / Excel ingestion', icon: UploadCloud },
      { label: 'Data Health', shortLabel: 'Health', href: '/admin/data-health', desc: 'Stats, warnings & activity', icon: Activity },
      { label: 'Events & Hackathons', shortLabel: 'Events', href: '/admin/events', desc: 'Workshops & hackathon engine', icon: Trophy },
      { label: 'Content Hub', shortLabel: 'Content', href: '/admin/content', desc: 'Blogs & career postings', icon: BookOpen },
      { label: 'Module Flags', shortLabel: 'Flags', href: '/admin/flags', desc: 'Feature toggles & windows', icon: Sliders },
    ],
  },
  { label: 'Audit Logs', shortLabel: 'Audit', href: '/admin/audit-logs', icon: History },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    <>
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--background)]/90 backdrop-blur-xl border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_0_rgba(0,0,0,0.02)]'
          : 'bg-[var(--background)]/40 backdrop-blur-md border-transparent'
      }`}
    >
      {/* persistent signature gradient hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        <div className={`flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
          {/* Logo — sits directly on the bar, no card wrapper */}
          <Link href="/admin" className="group flex items-center gap-2.5 flex-shrink-0" aria-label="Admin Control Room Home">
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <BrainLogo size={30} showRays={false} animated={false} />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-poppins font-extrabold text-[15px] bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] bg-clip-text text-transparent">
                SRKR
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#1A1A2E]/45 dark:text-white/40">
                Admin Panel
              </span>
            </div>
          </Link>

          {/* Center — segmented sliding-pill nav, mirrors the public navbar's silhouette */}
          <nav
            className="hidden lg:flex items-center gap-1 relative rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-1"
            onMouseLeave={() => setHovered(null)}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.children?.some((c) => pathname === c.href) ?? false);
              const isHovered = hovered === item.label;
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    setHovered(item.label);
                    setDropdownOpen(!!item.hasDropdown);
                  }}
                >
                  <Link
                    href={item.href}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive || isHovered
                        ? 'text-white'
                        : 'text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.shortLabel}
                    {item.hasDropdown && (
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${dropdownOpen && isHovered ? 'rotate-180' : ''}`} />
                    )}
                  </Link>

                  {(isActive || isHovered) && (
                    <motion.div
                      layoutId="admin-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full -z-0"
                      style={{ background: 'linear-gradient(120deg, #8B2E3B, #FF7A00)' }}
                    />
                  )}

                  {item.hasDropdown && (
                    <AnimatePresence>
                      {isHovered && dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-72 z-50"
                        >
                          <div className="p-1.5 rounded-2xl bg-[var(--card-bg)] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col gap-0.5 max-h-[75vh] overflow-y-auto">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  className="group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                                >
                                  <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#1A1A2E]/60 dark:text-white/50 group-hover/item:text-[#FF7A00] transition-colors">
                                    <ChildIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-semibold text-[#1A1A2E] dark:text-white group-hover/item:text-[#FF7A00] transition-colors">
                                      {child.label}
                                    </span>
                                    <span className="text-[11px] text-[#1A1A2E]/50 dark:text-white/40 leading-snug mt-0.5">
                                      {child.desc}
                                    </span>
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

          {/* Right cluster */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#8B2E3B] text-white whitespace-nowrap">
              ADMIN
            </span>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Main Site
            </Link>

            <button
              onClick={toggleDarkMode}
              className="relative w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 transition-colors"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDarkMode ? 'sun' : 'moon'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {/* Mobile trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#1A1A2E]/70 dark:text-white/60"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex flex-col items-center justify-center gap-1.5"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <motion.span animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* Fullscreen mobile menu — rendered as a sibling of <header>, not a       */}
      {/* descendant, for the same backdrop-filter containing-block reason       */}
      {/* documented in the public Navbar.                                      */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed inset-0 top-0 bg-[var(--background)]/98 backdrop-blur-2xl z-40 flex flex-col justify-between p-6 pt-24 overflow-y-auto"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.children?.some((c) => pathname === c.href) ?? false);
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                    className="border-b border-black/[0.06] dark:border-white/[0.08] py-3"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 font-poppins font-bold text-xl ${
                        isActive ? 'text-[#FF7A00]' : 'text-[#1A1A2E] dark:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                    {item.hasDropdown && item.children && (
                      <div className="mt-3 flex flex-col gap-2.5 pl-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 text-sm font-medium text-[#1A1A2E]/55 dark:text-white/45"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#FF7A00]" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="pt-6 flex items-center gap-4">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-[#8B2E3B] text-white">
                ADMIN
              </span>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 text-center py-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] font-semibold text-sm text-[#1A1A2E] dark:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Main Site
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
