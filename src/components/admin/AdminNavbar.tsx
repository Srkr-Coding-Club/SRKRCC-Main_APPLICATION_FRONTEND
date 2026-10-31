'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
  Database,
  ListChecks,
  QrCode,
  Code,
  Megaphone,
  Flag,
  KeyRound,
  FileSpreadsheet,
  Wrench,
  Search,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BrainLogo from '../BrainLogo';
import ThemeToggle from '../ThemeToggle';
import { NotificationBell } from '../notifications/NotificationBell';
import { getStoredUser, AuthUser } from '@/lib/auth';
import { MobileDrawer, type DrawerItem } from '../nav/MobileDrawer';
import { ThemeSegmented } from '../nav/ThemeSegmented';
import { Avatar } from '../nav/Avatar';
import { AccountMenu } from '../nav/AccountMenu';
import { useSignOut } from '../nav/useSignOut';
import { AdminCommandPalette, hackathonEntries, type PaletteEntry } from './AdminCommandPalette';
import { fetchApi } from '@/lib/api-client';
import type { Hackathon } from '@/lib/types';
import { useLiveSection } from '@/lib/hooks/useLiveSection';
import { membershipApi } from '@/lib/clubMembership';
import { LogOut } from 'lucide-react';
import { useMaintenanceAttention } from '@/lib/maintenance';

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

// Child pages can have nested routes (e.g. /admin/hackathons/[slug]) that
// should still highlight their parent entry.
function matchesChild(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navItems: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'User Control', shortLabel: 'Users', href: '/admin/users', icon: Users },
  {
    label: 'Data Center',
    shortLabel: 'Data Center',
    href: '/admin/responses',
    icon: Database,
    hasDropdown: true,
    children: [
      { label: 'Data Management Center', shortLabel: 'DMC', href: '/admin/data-management', desc: 'Explore & export all platform data', icon: Database },
      { label: 'Responses', shortLabel: 'Responses', href: '/admin/responses', desc: 'View & export submissions', icon: Inbox },
      { label: 'Import Data', shortLabel: 'Import', href: '/admin/csv-ingestion', desc: 'Bulk CSV / Excel ingestion', icon: UploadCloud },
      { label: 'Data Health', shortLabel: 'Health', href: '/admin/data-health', desc: 'Stats, warnings & activity', icon: Activity },
      { label: 'Background Jobs', shortLabel: 'Jobs', href: '/admin/jobs', desc: 'Bulk email, export & import job status', icon: ListChecks },
      { label: 'Maintenance', shortLabel: 'Maintenance', href: '/admin/maintenance', desc: 'Clean-up tasks to run when needed', icon: Wrench },
      ],
  },
  {
    label: 'Forms',
    shortLabel: 'Forms',
    href: '/admin/builder',
    icon: FileText,
    hasDropdown: true,
    children: [
      { label: 'Forms Builder', shortLabel: 'Builder', href: '/admin/builder', desc: 'Drag & drop form canvas', icon: Plus },
      { label: 'Forms Registry', shortLabel: 'Forms', href: '/admin/forms', desc: 'Manage, close & bulk actions', icon: FileText },
      { label: 'Attendance Scanner', shortLabel: 'Attendance', href: '/admin/attendance/scan', desc: 'QR check-in scanning & reports', icon: QrCode },
      ],
  },
  {
    label: 'Modules',
    shortLabel: 'Modules',
    href: '/admin/members',
    icon: LayoutGrid,
    hasDropdown: true,
    children: [
      { label: 'Members', shortLabel: 'Members', href: '/admin/members', desc: 'Club member directory', icon: UserCheck },
      { label: 'Club IDs', shortLabel: 'Club IDs', href: '/admin/club-ids', desc: 'Look up, reserve, assign & count', icon: KeyRound },
      { label: 'Past Members', shortLabel: 'Past', href: '/admin/reconcile', desc: 'Compare an old sheet with accounts', icon: FileSpreadsheet },
      { label: 'Events & Workshops', shortLabel: 'Events', href: '/admin/events', desc: 'Workshops & Workshop Management', icon: Trophy },
      { label: 'Hackathon Management', shortLabel: 'Hackathons', href: '/admin/hackathons', desc: 'Teams, rounds, shortlisting & notices', icon: Flag },
      { label: 'Content Hub', shortLabel: 'Content', href: '/admin/content', desc: 'Blogs & career postings', icon: BookOpen },
      { label: 'Announcements', shortLabel: 'Announce', href: '/admin/announcements', desc: 'Landing page banner messages', icon: Megaphone },
      { label: 'Module Flags', shortLabel: 'Flags', href: '/admin/flags', desc: 'Feature toggles & windows', icon: Sliders },
    ],
  },
  { label: 'Audit Logs', shortLabel: 'Audit', href: '/admin/audit-logs', icon: History },
  { label: 'CodeQuest', shortLabel: 'CodeQuest', href: '/admin/codequest', icon: Code },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hackathonResults, setHackathonResults] = useState<PaletteEntry[]>([]);
  const hackathonsAsked = useRef(false);
  const [isMac, setIsMac] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Click/keyboard-driven dropdown, independent of the hover-only state above -
  // lets touch and keyboard users open a dropdown without a mouseenter event.
  const [clickedDropdown, setClickedDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  // Only administrators can see the Maintenance page, so only they ask what needs running.
  const maintenanceAttention = useMaintenanceAttention(currentUser?.role === 'ADMIN');
  // Club membership requests waiting for an answer: checked every minute while the tab is visible, quietly nothing when not allowed.
  const memberships = useLiveSection(() => membershipApi.queue({ status: 'PENDING' }), {
    interval: 60_000,
    enabled: currentUser?.role === 'ADMIN' || currentUser?.role === 'CLUB_LEAD',
  });
  const pendingMembers = memberships.data?.counts.PENDING ?? 0;
  const waitingFor = (href: string) => (href === '/admin/maintenance' ? maintenanceAttention : href === '/admin/club-ids' ? pendingMembers : 0);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Ctrl K (Cmd K on a Mac) opens the jump menu from anywhere in the admin area.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes an open dropdown and the phone menu; moving to another page closes both.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setClickedDropdown(null);
      setHovered(null);
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setClickedDropdown(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Click-outside closes a dropdown that was opened by click/keyboard (hover-opened
  // dropdowns already close via onMouseLeave on the nav).
  useEffect(() => {
    if (!clickedDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setClickedDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clickedDropdown]);

  const activeNavItem = navItems.find(
    (item) => pathname === item.href || (item.children?.some((c) => matchesChild(pathname, c.href)) ?? false),
  );
  // The sliding pill sits under the hovered tab, or the active tab when nothing
  // is hovered - so ONLY that tab gets white text. Previously the active tab
  // stayed white after the pill slid away to a hovered sibling.
  const pillLabel = hovered ?? activeNavItem?.label ?? null;

  // Breadcrumb trail derived from the same navItems hierarchy - skipped entirely
  // on the dashboard root or any path that doesn't map onto a known section.
  const activeChild = activeNavItem?.children?.find((c) => matchesChild(pathname, c.href));

  const drawerItems: DrawerItem[] = navItems.map((item) => ({
    key: item.label,
    label: item.label,
    href: item.href,
    icon: item.icon,
    current: activeNavItem?.label === item.label,
    children: item.children?.map((child) => ({
      label: child.label,
      href: child.href,
      desc: child.desc,
      current: matchesChild(pathname, child.href),
      badge: waitingFor(child.href) || undefined,
    })),
  }));

  // The hackathons are asked for once, the first time the jump menu opens; a failure just leaves the pages.
  useEffect(() => {
    if (!paletteOpen || hackathonsAsked.current) return;
    hackathonsAsked.current = true;
    fetchApi<Hackathon[]>('/hackathons/')
      .then((list) => setHackathonResults(hackathonEntries(list)))
      .catch(() => undefined);
  }, [paletteOpen]);

  const paletteEntries = useMemo<PaletteEntry[]>(
    () => [
      ...navItems.flatMap((item) =>
        item.children
          ? item.children.map((child) => ({ key: child.href, label: child.label, href: child.href, section: item.label, desc: child.desc, icon: child.icon, badge: waitingFor(child.href) || undefined }))
          : [{ key: item.href, label: item.label, href: item.href, section: 'Admin', icon: item.icon }],
      ),
      ...hackathonResults,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maintenanceAttention, pendingMembers, hackathonResults],
  );

  return (
    <>
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'bg-journey-bg/90 backdrop-blur-xl border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_0_rgba(0,0,0,0.02)]'
          : 'bg-journey-bg/70 backdrop-blur-md border-transparent'
      }`}
    >
      {/* persistent signature gradient hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        {/* A fixed height, so scrolling never changes the page height (see Navbar.tsx). */}
        <div className="flex h-14 items-center justify-between gap-4 lg:h-[72px]">
          {/* Logo - sits directly on the bar, no card wrapper */}
          <Link href="/admin" className="group flex items-center gap-2.5 flex-shrink-0" aria-label="Admin Control Room Home">
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
              <BrainLogo size={30} showRays={false} animated={false} />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-poppins font-extrabold text-[15px] bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] bg-clip-text text-transparent">
                SRKR
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#1A1A2E]/70 dark:text-white/65">
                Admin Panel
              </span>
            </div>
          </Link>

          {/* Center - segmented sliding-pill nav, mirrors the public navbar's silhouette */}
          <nav
            ref={navRef}
            aria-label="Admin"
            className="hidden lg:flex items-center gap-1 relative rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-1"
            onMouseLeave={() => setHovered(null)}
          >
            {navItems.map((item) => {
              const isHovered = hovered === item.label;
              const hasPill = item.label === pillLabel;
              const Icon = item.icon;
              const isDropdownOpen = !!item.hasDropdown && ((isHovered && dropdownOpen) || clickedDropdown === item.label);

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
                    onClick={(e) => {
                      if (!item.hasDropdown) return;
                      e.preventDefault();
                      setClickedDropdown((prev) => (prev === item.label ? null : item.label));
                    }}
                    onFocus={() => {
                      if (item.hasDropdown) setClickedDropdown(item.label);
                    }}
                    aria-haspopup={item.hasDropdown ? 'true' : undefined}
                    aria-expanded={item.hasDropdown ? isDropdownOpen : undefined}
                    aria-current={activeNavItem?.label === item.label ? 'page' : undefined}
                    aria-label={item.label}
                    title={item.label}
                    className={`relative z-10 flex min-h-10 min-w-10 justify-center items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition duration-200 active:scale-95 ${
                      hasPill
                        ? 'text-white'
                        : 'text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#1A1A2E] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className={activeNavItem?.label === item.label ? 'inline' : 'hidden xl:inline'}>{item.shortLabel}</span>
                    {(item.children?.reduce((sum, c) => sum + waitingFor(c.href), 0) ?? 0) > 0 && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" role="img" aria-label="something here needs attention" />
                    )}
                    {item.hasDropdown && (
                      <ChevronDown className={`hidden xl:block w-3 h-3 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </Link>

                  {hasPill && (
                    <motion.div
                      layoutId="admin-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full -z-0"
                      // #C2410C (not the brand's #FF7A00) - the lighter orange fails
                      // WCAG AA contrast against the white pill label (~2.6:1); this
                      // stop keeps white text readable (~5:1) at every point along the
                      // gradient while staying visually on-brand (maroon → burnt orange).
                      style={{ background: 'linear-gradient(120deg, #8B2E3B, #C2410C)' }}
                    />
                  )}

                  {item.hasDropdown && (
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-72 z-50"
                        >
                          <div className="p-1.5 rounded-2xl bg-[var(--card-bg)] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col gap-0.5 max-h-[75dvh] overflow-y-auto">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  onClick={() => setClickedDropdown(null)}
                                  aria-current={matchesChild(pathname, child.href) ? 'page' : undefined}
                                  className={`group/item flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition active:scale-[0.97] ${matchesChild(pathname, child.href) ? 'bg-orange-500/10' : ''}`}
                                >
                                  <div className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-[#1A1A2E]/60 dark:text-white/50 group-hover/item:text-journey-accent transition-colors">
                                    <ChildIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1A2E] dark:text-white group-hover/item:text-journey-accent transition-colors">
                                      {child.label}
                                      {waitingFor(child.href) > 0 && (
                                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black" aria-label={`${waitingFor(child.href)} need attention`}>{waitingFor(child.href)}</span>
                                      )}
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

          {/* Right cluster: the jump menu, the bell and one account menu (name, role, profile, main site, theme, sign out). */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={`Jump to a page, press ${isMac ? 'Command' : 'Control'} K`}
              aria-haspopup="dialog"
              className="flex min-h-11 items-center gap-2 rounded-full border border-black/[0.08] px-3.5 text-xs font-medium text-[#1A1A2E]/75 transition hover:bg-black/[0.04] hover:text-[#1A1A2E] active:scale-95 dark:border-white/[0.12] dark:text-white/75 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <kbd className="hidden font-mono text-[11px] xl:inline">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
            </button>
            <NotificationBell />
            <AccountMenu
              user={currentUser}
              onSignOut={signOut}
              nameClassName="hidden 2xl:inline"
              links={[
                { label: 'My profile', href: '/profile', icon: User },
                { label: 'Main site', href: '/', icon: ArrowLeft },
              ]}
            />
          </div>

          {/* Mobile trigger: bell and the menu; the theme switch is in the menu, and stays here from tablet width up. */}
          <div className="flex lg:hidden items-center gap-1.5">
            <NotificationBell />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="w-11 h-11 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform duration-100"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu"
            >
              <motion.span animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
              <motion.span animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="w-4 h-[1.5px] bg-[#1A1A2E] dark:bg-white" />
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* Breadcrumb strip - derived from navItems, hidden on the dashboard root  */}
      {/* and on any path that doesn't map onto a known top-level section.       */}
      {activeNavItem && pathname !== '/admin' && (
        <div className="w-full border-b border-black/[0.04] dark:border-white/[0.06] bg-journey-bg/80">
          <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-2">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[#1A1A2E]/70 dark:text-white/65">
              <Link href="/admin" className="inline-flex min-h-6 items-center hover:text-journey-accent transition active:scale-95">
                Admin
              </Link>
              <span aria-hidden="true" className="text-[#1A1A2E]/40 dark:text-white/40">/</span>
              {activeChild ? (
                <>
                  <Link href={activeNavItem.href} className="inline-flex min-h-6 items-center hover:text-journey-accent transition active:scale-95">
                    {activeNavItem.label}
                  </Link>
                  <span aria-hidden="true" className="text-[#1A1A2E]/40 dark:text-white/40">/</span>
                  <span className="text-[#1A1A2E]/70 dark:text-white/60">{activeChild.label}</span>
                </>
              ) : (
                <span className="text-[#1A1A2E]/70 dark:text-white/60">{activeNavItem.label}</span>
              )}
            </nav>
          </div>
        </div>
      )}

      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />

      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        id="admin-mobile-menu"
        label="Admin menu"
        items={drawerItems}
        identity={
          <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-black/[0.08] bg-black/[0.03] px-3 py-2.5 dark:border-white/[0.1] dark:bg-white/[0.05]">
            <Avatar user={currentUser} size={42} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-bold text-[#1A1A2E] dark:text-white">{currentUser?.first_name || currentUser?.username || 'Admin'}</span>
              <span className="truncate text-xs text-[#1A1A2E]/65 dark:text-white/65">{currentUser?.email}</span>
            </span>
            <span className="shrink-0 rounded-md bg-[#8B2E3B] px-2 py-1 text-[10px] font-bold text-white">{currentUser?.role || 'ADMIN'}</span>
          </div>
        }
        footer={
          <>
            <ThemeSegmented />
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.12] text-sm font-semibold text-[#1A1A2E] transition active:scale-[0.98] dark:border-white/[0.14] dark:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Main Site
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                aria-label="Sign out"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/[0.12] text-rose-600 transition active:scale-95 dark:border-white/[0.14] dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </>
        }
      />

    </>
  );
}
