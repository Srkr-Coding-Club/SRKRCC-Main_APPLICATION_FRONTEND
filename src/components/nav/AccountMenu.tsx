'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown, Copy, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { ThemeSegmented } from './ThemeSegmented';

export interface AccountLink {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Brand colour, for the way into the admin room. */
  accent?: boolean;
}

interface AccountUser {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
  club_id?: string;
}

interface AccountMenuProps {
  user: AccountUser | null;
  links: AccountLink[];
  onSignOut: () => void;
  /** Classes for the first name beside the avatar, written out in full so Tailwind sees them (e.g. "hidden 2xl:inline"); shown always when omitted. */
  nameClassName?: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', CLUB_LEAD: 'Club lead', AFFILIATE: 'Member', NON_AFFILIATE: 'Member', VOLUNTEER: 'Volunteer', JUDGE: 'Judge',
};

/**
 * One account button instead of a row of pills: who you are, your club ID (one click copies it), your role, the way to
 * your profile (and the admin room), the theme and sign out. Closes on Escape, on a press outside and on a page change.
 */
export function AccountMenu({ user, links, onSignOut, nameClassName = 'inline' }: AccountMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(true); }
    };
    const onPress = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPress);
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPress);
    };
  }, [open, close]);

  // Arrow keys walk the entries, the way a menu does.
  const onPanelKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const entries = Array.from(panel.current?.querySelectorAll<HTMLElement>('a, button') ?? []);
    const at = entries.indexOf(document.activeElement as HTMLElement);
    if (!entries.length) return;
    event.preventDefault();
    entries[(at + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length].focus();
  };

  const copyClubId = async () => {
    if (!user?.club_id) return;
    try {
      await navigator.clipboard.writeText(user.club_id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the ID is on screen to copy by hand.
    }
  };

  const name = user?.first_name || user?.username || 'Account';

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu, ${name}`}
        className={`flex min-h-11 items-center gap-2 rounded-full border py-[3px] pl-[3px] pr-2.5 text-xs font-semibold text-[#1A1A2E] shadow-sm transition active:scale-95 dark:text-white ${
          open ? 'border-orange-500/50 bg-orange-500/[0.08]' : 'border-black/[0.08] hover:bg-black/[0.04] dark:border-white/[0.12] dark:hover:bg-white/[0.06]'
        }`}
      >
        <Avatar user={user} size={34} />
        <span className={`${nameClassName} max-w-[110px] truncate`}>{name}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            role="menu"
            aria-label="Account"
            onKeyDown={onPanelKey}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-3 w-[300px] rounded-2xl border border-black/[0.08] bg-[var(--card-bg)] p-2 shadow-2xl dark:border-white/[0.12]"
          >
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2.5">
              <Avatar user={user} size={46} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#1A1A2E] dark:text-white">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || name}</p>
                {user?.email && <p className="truncate text-xs text-[#1A1A2E]/70 dark:text-white/70">{user.email}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-2.5 pb-3">
              {user?.club_id && (
                <button
                  type="button"
                  onClick={copyClubId}
                  aria-label={copied ? 'Club ID copied' : `Copy club ID ${user.club_id}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 font-mono text-xs font-medium text-orange-700 transition active:scale-95 dark:text-orange-300"
                >
                  {user.club_id}
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              )}
              {user?.role && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{ROLE_LABEL[user.role] ?? user.role}</span>
              )}
            </div>

            <div className="border-t border-black/[0.08] pt-1.5 dark:border-white/[0.1]">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition hover:bg-black/[0.05] active:scale-[0.98] dark:hover:bg-white/[0.06] ${
                      link.accent ? 'text-orange-700 dark:text-orange-300' : 'text-[#1A1A2E] dark:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${link.accent ? '' : 'text-[#1A1A2E]/60 dark:text-white/65'}`} aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-1.5 border-t border-black/[0.08] px-1 pb-2 pt-3 dark:border-white/[0.1]">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1A2E]/65 dark:text-white/65">Theme</p>
              <ThemeSegmented />
            </div>

            <div className="border-t border-black/[0.08] pt-1.5 dark:border-white/[0.1]">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onSignOut(); }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 active:scale-[0.98] dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
