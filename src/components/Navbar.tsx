'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  ChevronDown,
  X,
  Sparkles,
  Terminal,
  Trophy,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainLogo from './BrainLogo';
import PillButton from './PillButton';
import ThemeToggle from './ThemeToggle';
import LoginCard from '@/components/LoginCard';
import { getStoredUser, isAuthenticated, loginUser, AuthUser } from '@/lib/auth';

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
      { label: 'Upcoming Workshops', href: '/events', desc: 'Interactive hands-on sessions & masterclasses', icon: Calendar },
      { label: 'Hackathons Engine', href: '/hackathons', desc: '48hr build sprints & competitive arena', icon: Terminal },
      { label: 'IconCoders Flagship', href: '/iconcoders', desc: 'Annual premier algorithmic championship', icon: Trophy },
      { label: 'Codequest Daily', href: '/codequest', desc: 'Bite-sized challenges to keep sharp daily', icon: Sparkles },
    ],
  },
  { label: 'Forms', href: '/forms' },
  { label: 'Blogs', href: '/blogs' },
];

// Routes gated by an admin-toggleable module flag — Events itself and its
// "Upcoming Workshops" child stay unconditional per the club's own rules.
const GATED_ROUTES: Record<string, string> = {
  '/hackathons': 'hackathons',
  '/iconcoders': 'iconcoders',
  '/codequest': 'codequest',
};

interface NavbarProps {
  moduleFlags?: Record<string, boolean>;
}

export default function Navbar({ moduleFlags = {} }: NavbarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(isAuthenticated());
    setCurrentUser(getStoredUser());
  }, [pathname]);

  const visibleNavItems: NavItem[] = navItems.map((item) =>
    item.children
      ? {
          ...item,
          children: item.children.filter((child) => {
            const key = GATED_ROUTES[child.href];
            return !key || (moduleFlags[key] ?? true);
          }),
        }
      : item
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || loginModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, loginModalOpen]);

  useEffect(() => {
    if (!loginModalOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLoginModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loginModalOpen]);

  const activeNavItem = visibleNavItems.find(
    (item) => pathname === item.href || (item.children?.some((c) => pathname === c.href) ?? false),
  );
  // The sliding pill sits under the hovered tab, or the active tab when nothing
  // is hovered — so ONLY that tab gets white text. Previously the active tab
  // stayed white after the pill slid away to a hovered sibling, making its
  // label read as invisible on the light bar.
  const pillLabel = hovered ?? activeNavItem?.label ?? null;

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

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
          {/* Logo — sits directly on the bar, no card wrapper */}
          <Link href="/" className="group flex items-center gap-2.5" aria-label="SRKR Coding Club Home">
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <BrainLogo size={30} showRays={false} animated={false} />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-poppins font-extrabold text-[15px] bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] bg-clip-text text-transparent">
                SRKR
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#1A1A2E]/45 dark:text-white/40">
                Coding Club
              </span>
            </div>
          </Link>

          {/* Center — segmented sliding-pill nav, a different silhouette than an underline */}
          <nav
            className="hidden md:flex items-center gap-1 relative rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-1"
            onMouseLeave={() => setHovered(null)}
          >
            {visibleNavItems.map((item) => {
              const isHovered = hovered === item.label;
              const hasPill = item.label === pillLabel;

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
                    className={`relative z-10 flex items-center gap-1 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors duration-200 ${
                      hasPill
                        ? 'text-white'
                        : 'text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${dropdownOpen && isHovered ? 'rotate-180' : ''}`} />
                    )}
                  </Link>

                  {hasPill && (
                    <motion.div
                      layoutId="nav-pill"
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
                          <div className="p-1.5 rounded-2xl bg-[var(--card-bg)] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col gap-0.5">
                            {item.children?.map((child) => {
                              const Icon = child.icon;
                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  className="group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
                                >
                                  {Icon && (
                                    <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#1A1A2E]/60 dark:text-white/50 group-hover/item:text-[#FF7A00] transition-colors">
                                      <Icon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-semibold text-[#1A1A2E] dark:text-white group-hover/item:text-[#FF7A00] transition-colors">
                                      {child.label}
                                    </span>
                                    {child.desc && (
                                      <span className="text-[11px] text-[#1A1A2E]/50 dark:text-white/40 leading-snug mt-0.5">
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

          {/* Right cluster */}
          <div className="hidden md:flex items-center gap-3">
            {isAuth ? (
              <>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD') && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/30 transition"
                  >
                    Admin Room
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1A1A2E] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] transition shadow-sm"
                  aria-label="User Profile"
                >
                  <User className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>{currentUser?.first_name || currentUser?.username || 'Profile'}</span>
                  {currentUser?.club_id && (
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-[10px]">
                      {currentUser.club_id}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={(event) => {
                    if (pathname === '/') {
                      event.preventDefault();
                      setLoginModalOpen(true);
                    }
                  }}
                  className="text-[13px] font-semibold text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white transition-colors"
                >
                  Login
                </Link>

                <PillButton href="/signup" variant="solid" size="sm">
                  Join the Club
                </PillButton>
              </>
            )}

            <ThemeToggle />
          </div>

          {/* Mobile trigger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
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
      {/* descendant, because the header's backdrop-blur creates a new           */}
      {/* containing block for fixed-position children (per the CSS spec, any    */}
      {/* ancestor with backdrop-filter/filter/transform does this), which would */}
      {/* otherwise squash this fixed overlay into the header's own small box    */}
      {/* instead of the full viewport.                                         */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 top-0 bg-[var(--background)]/98 backdrop-blur-2xl z-40 flex flex-col p-6 pt-24 overflow-y-auto"
          >
            <div className="flex flex-col gap-1">
              {visibleNavItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="border-b border-black/[0.06] dark:border-white/[0.08] py-3"
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-poppins font-bold text-2xl text-[#1A1A2E] dark:text-white"
                  >
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
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-3">
              {isAuth ? (
                <>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 text-center py-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] font-semibold text-sm text-[#1A1A2E] dark:text-white flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4 text-[#FF7A00]" />
                      <span>{currentUser?.first_name || currentUser?.username || 'My Profile'}</span>
                    </Link>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD') && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md transition"
                      >
                        Admin Room
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    onClick={(event) => {
                  setMobileMenuOpen(false);
                  if (pathname === '/') {
                    event.preventDefault();
                    setLoginModalOpen(true);
                  }
                }}
                    className="flex-1 text-center py-3 rounded-full border border-black/[0.1] dark:border-white/[0.12] font-semibold text-sm text-[#1A1A2E] dark:text-white"
                  >
                    Login
                  </Link>
                  <div className="flex-1">
                    <PillButton href="/signup" variant="solid" onClick={() => setMobileMenuOpen(false)} className="w-full justify-center">
                      Join the Club
                    </PillButton>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loginModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLoginModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-4xl">
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                aria-label="Close sign in dialog"
                className="absolute right-3 top-3 z-10 rounded-full bg-black/10 p-2 text-hero-foreground transition-colors hover:bg-black/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <X className="size-4" />
              </button>
              <LoginCard
                onSubmit={async (values) => {
                  const result = await loginUser(values.email, values.password);
                  setCurrentUser(result.user);
                  setIsAuth(true);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
