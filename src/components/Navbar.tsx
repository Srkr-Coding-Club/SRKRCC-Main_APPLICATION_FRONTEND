'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  ChevronDown,
  Sparkles,
  Terminal,
  Trophy,
  Calendar,
  Laptop,
  Award,
  Home,
  BookOpen,
  FileText,
  Shield,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainLogo from './BrainLogo';
import PillButton from './PillButton';
import { getStoredUser, isAuthenticated, fetchAndSyncCurrentUser, subscribeToAuthResync, AuthUser, AUTH_CHANGE_EVENT } from '@/lib/auth';
import { NotificationBell } from './notifications/NotificationBell';
import { MobileDrawer, type DrawerItem } from './nav/MobileDrawer';
import { ThemeSegmented } from './nav/ThemeSegmented';
import { LampSwitch } from './nav/LampSwitch';
import { Avatar } from './nav/Avatar';
import { AccountMenu } from './nav/AccountMenu';
import { NextUpCard, pickNextUp } from './nav/NextUpCard';
import { useSignOut } from './nav/useSignOut';
import { fetchApi } from '@/lib/api-client';
import type { Hackathon } from '@/lib/types';

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
      { label: 'Workshops', href: '/events', desc: 'Interactive hands-on sessions & masterclasses', icon: Calendar },
      { label: 'Hackathons', href: '/hackathons', desc: '24hr build sprints & competitive arena', icon: Trophy },
      { label: 'IconCoders', href: '/iconcoders', desc: 'Annual premier algorithmic championship', icon: Award },
      { label: 'Codequest', href: '/codequest', desc: 'Bite-sized challenges to keep sharp daily', icon: Laptop },
    ],
  },
  { label: 'Forms', href: '/forms' },
  { label: 'Blogs', href: '/blogs' },
];

// Routes gated by an admin-toggleable module flag - Events itself and its
// "Upcoming Workshops" child stay unconditional per the club's own rules.
const GATED_ROUTES: Record<string, string> = {
  '/hackathons': 'hackathons',
  '/iconcoders': 'iconcoders',
  '/codequest': 'codequest',
};

interface NavbarProps {
  moduleFlags?: Record<string, boolean>;
}

// A route belongs to a tab when it is that page or sits under it (/hackathons/some-event is still "Hackathons"); "/" matches only itself.
const routeIs = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

export default function Navbar({ moduleFlags = {} }: NavbarProps) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setIsAuth(isAuthenticated());
      setCurrentUser(getStoredUser());
    };

    syncAuth();
    window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const syncFromServer = () => {
      fetchAndSyncCurrentUser().then((user) => {
        if (cancelled) return;
        setIsAuth(!!user);
        setCurrentUser(user);
      });
    };

    // The optimistic read above trusts localStorage + a plain role cookie, which
    // can outlive the real server session (expired/invalidated elsewhere) and
    // keep showing a signed-in navbar for a user who isn't actually authenticated.
    // Validate on mount, and again whenever this tab regains focus - otherwise a
    // role change made elsewhere (e.g. an admin promoting this member to
    // CLUB_LEAD) never reaches an already-open tab until a hard refresh.
    syncFromServer();
    const unsubscribe = subscribeToAuthResync(syncFromServer);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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
  const [nextUp, setNextUp] = useState<Hackathon | null>(null);
  const nextUpAsked = useRef(false);

  // The "Next up" card in the Events menu: one request, the first time the menu is opened, and only when hackathons are on.
  useEffect(() => {
    if (!(dropdownOpen && hovered === 'Events') || nextUpAsked.current || moduleFlags.hackathons === false) return;
    nextUpAsked.current = true;
    fetchApi<Hackathon[]>('/hackathons/')
      .then((list) => setNextUp(pickNextUp(list, new Date())))
      .catch(() => undefined);
  }, [dropdownOpen, hovered, moduleFlags.hackathons]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navRef = useRef<HTMLElement>(null);

  // Escape closes whatever is open; a press outside the bar closes a dropdown opened by touch or keyboard; leaving the page closes both.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setDropdownOpen(false);
      setHovered(null);
      setMobileMenuOpen(false);
    };
    const onPress = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setHovered(null);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPress);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPress);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setHovered(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const activeNavItem = visibleNavItems.find(
    (item) => routeIs(pathname, item.href) || (item.children?.some((c) => routeIs(pathname, c.href)) ?? false),
  );
  // The sliding pill sits under the hovered tab, or the active tab when nothing
  // is hovered - so ONLY that tab gets white text. Previously the active tab
  // stayed white after the pill slid away to a hovered sibling, making its
  // label read as invisible on the light bar.
  const pillLabel = hovered ?? activeNavItem?.label ?? null;

  const ICONS: Record<string, React.ElementType> = { Home, Events: Calendar, Forms: FileText, Blogs: BookOpen };
  const drawerItems: DrawerItem[] = [
    ...visibleNavItems.map((item) => ({
      key: item.label,
      label: item.label,
      href: item.href,
      icon: ICONS[item.label] ?? Home,
      current: activeNavItem?.label === item.label,
      defaultOpen: item.label === 'Events',
      children: item.children?.map((child) => ({ label: child.label, href: child.href, desc: child.desc, current: routeIs(pathname, child.href) })),
    })),
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD'
      ? [{ key: 'admin', label: 'Admin Room', href: '/admin', icon: Shield, accent: true } as DrawerItem]
      : []),
  ];

  return (
    <>
    <header
      data-site-chrome
      // True glass: blur is always-on (never transitioned - animating
      // backdrop-filter itself is what causes the janky/flickering repaints
      // glass navbars are notorious for), only the tint and shadow ease in
      // as the page scrolls under it.
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-2xl transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? 'bg-white/55 dark:bg-[#0D0E15]/55 border-white/40 dark:border-white/10 shadow-[0_8px_32px_-12px_rgba(139,46,59,0.28)]'
          : 'bg-white/20 dark:bg-white/[0.04] border-white/15 dark:border-white/[0.06] shadow-none'
      }`}
    >
      {/* persistent signature gradient hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />
      {/* glass sheen: a soft light-catch along the top edge of the panel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* A fixed height: a bar that shrinks on scroll shortens the page, which can scroll the person back above the
            threshold and make it grow again, so on a page barely taller than the window the bar shakes. */}
        <div className="flex h-14 items-center justify-between lg:h-[72px]">
          {/* Logo - CODING CLUB leads, in the landing page's own shimmering title
              treatment (.ember-text); SRKR rides above it as a small label, not
              the other way round. */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3" aria-label="SRKR Coding Club Home">
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <BrainLogo size={36} showRays animated />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.32em] text-[#1A1A2E]/70 dark:text-white/60">
                SRKR
              </span>
              <span className="ember-text font-poppins whitespace-nowrap text-lg min-[420px]:text-xl sm:text-2xl font-extrabold leading-[1.1] tracking-tight">
                Coding Club
              </span>
            </div>
          </Link>

          {/* Center - segmented sliding-pill nav, a different silhouette than an underline */}
          <nav
            ref={navRef}
            aria-label="Main"
            className="hidden lg:flex items-center gap-1 relative rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-1"
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
                    // A dropdown tab opens on hover, on keyboard focus, and on the first tap of a touch screen (a second tap goes to the page).
                    onFocus={() => {
                      if (item.hasDropdown) {
                        setHovered(item.label);
                        setDropdownOpen(true);
                      }
                    }}
                    onClick={(event) => {
                      if (!item.hasDropdown) return;
                      const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
                      if (touch && !(dropdownOpen && hovered === item.label)) {
                        event.preventDefault();
                        setHovered(item.label);
                        setDropdownOpen(true);
                      }
                    }}
                    aria-haspopup={item.hasDropdown ? 'true' : undefined}
                    aria-expanded={item.hasDropdown ? dropdownOpen && isHovered : undefined}
                    aria-current={activeNavItem?.label === item.label ? 'page' : undefined}
                    className={`relative z-10 flex min-h-10 items-center gap-1 px-4 py-2 rounded-full text-[13px] font-semibold transition duration-200 active:scale-95 ${
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
                      // See AdminNavbar.tsx - #FF7A00 fails WCAG AA contrast against
                      // white pill text (~2.6:1); #C2410C keeps it readable (~5:1).
                      // The glow mirrors ActionLink's primary-CTA hover shadow, so
                      // the live tab reads with the same brand "lit" energy as the
                      // rest of the site rather than sitting flat against the bar.
                      style={{
                        background: 'linear-gradient(120deg, #8B2E3B, #C2410C)',
                        boxShadow: '0 0 20px rgba(255,122,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
                      }}
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
                          className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 ${item.label === 'Events' && nextUp ? 'w-[560px]' : 'w-72'}`}
                        >
                          <div className="p-1.5 rounded-2xl bg-[var(--card-bg)] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex gap-1.5">
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            {item.children?.map((child) => {
                              const Icon = child.icon;
                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  aria-current={routeIs(pathname, child.href) ? 'page' : undefined}
                                  className={`group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] active:bg-black/[0.06] dark:active:bg-white/[0.08] transition-colors ${routeIs(pathname, child.href) ? 'bg-orange-500/10' : ''}`}
                                >
                                  {Icon && (
                                    <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#1A1A2E]/60 dark:text-white/50 group-hover/item:text-journey-accent transition-colors">
                                      <Icon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-semibold text-[#1A1A2E] dark:text-white group-hover/item:text-journey-accent transition-colors">
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
                            {item.label === 'Events' && nextUp && <NextUpCard hackathon={nextUp} now={new Date()} signedIn={isAuth} onNavigate={() => { setDropdownOpen(false); setHovered(null); }} />}
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
          <div className="hidden lg:flex items-center gap-3">
            {isAuth ? (
              <>
                <NotificationBell />
                <AccountMenu
                  user={currentUser}
                  onSignOut={signOut}
                  links={[
                    { label: 'My profile', href: '/profile', icon: User },
                    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD' ? [{ label: 'Admin Room', href: '/admin', icon: Shield, accent: true }] : []),
                  ]}
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13px] font-semibold text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white transition active:scale-95 duration-100 inline-flex min-h-10 items-center px-1"
                >
                  Login
                </Link>

                <PillButton href="/signup" variant="solid" size="sm" className="min-h-10">
                  Join the Club
                </PillButton>
              </>
            )}

            {/* The lamp hangs from the top edge of the bar; its bead hangs a little below it. */}
            <div className="relative h-10 w-[68px] shrink-0">
              <LampSwitch size="desk" hint className="absolute left-0 -top-[18px]" />
            </div>
          </div>

          {/* Mobile trigger: bell and avatar when signed in, the menu always. The theme switch sits in the menu too. */}
          <div className="flex lg:hidden items-center gap-1">
            <div className="relative hidden h-10 w-[52px] shrink-0 min-[390px]:block">
              <LampSwitch size="bar" className="absolute left-0 -top-[10px]" />
            </div>
            {isAuth && <NotificationBell />}
            {isAuth && (
              <Link href="/profile" aria-label="My profile" className="hidden h-11 w-11 items-center justify-center rounded-full transition active:scale-95 min-[360px]:flex">
                <Avatar user={currentUser} size={34} />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-11 h-11 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform duration-100"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="site-mobile-menu"
            >
              <motion.span animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
            </button>
          </div>
        </div>
      </div>
    </header>

      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        id="site-mobile-menu"
        label="Site menu"
        lamp={<LampSwitch size="drawer" />}
        items={drawerItems}
        identity={
          isAuth ? (
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-black/[0.08] bg-black/[0.03] px-3 py-2.5 transition active:scale-[0.98] dark:border-white/[0.1] dark:bg-white/[0.05]"
            >
              <Avatar user={currentUser} size={42} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-bold text-[#1A1A2E] dark:text-white">{currentUser?.first_name || currentUser?.username || 'My profile'}</span>
                {currentUser?.club_id && <span className="font-mono text-xs text-orange-600 dark:text-orange-300">{currentUser.club_id}</span>}
              </span>
              <User className="h-4 w-4 shrink-0 text-[#1A1A2E]/55 dark:text-white/55" aria-hidden="true" />
            </Link>
          ) : null
        }
        footer={
          <>
            <ThemeSegmented />
            {isAuth ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/[0.12] text-sm font-semibold text-rose-600 transition active:scale-[0.98] dark:border-white/[0.14] dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-black/[0.12] text-sm font-semibold text-[#1A1A2E] transition active:scale-95 dark:border-white/[0.14] dark:text-white"
                >
                  Login
                </Link>
                <div className="flex-1">
                  <PillButton href="/signup" variant="solid" onClick={() => setMobileMenuOpen(false)} className="min-h-12 w-full justify-center">
                    Join the Club
                  </PillButton>
                </div>
              </div>
            )}
          </>
        }
      />

    </>
  );
}
