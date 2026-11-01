'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

export interface DrawerChild {
  label: string;
  href: string;
  desc?: string;
  current?: boolean;
  /** A count worth noticing next to the label (tasks waiting). */
  badge?: number;
}

export interface DrawerItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  current?: boolean;
  /** An item that deserves the brand colour (the admin room link). */
  accent?: boolean;
  children?: DrawerChild[];
  /** Open even when it is not the current section. */
  defaultOpen?: boolean;
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  id: string;
  label: string;
  /** Who is signed in, shown above the list. */
  identity?: React.ReactNode;
  /** A lamp (or anything playful) hung from the top edge of the panel, with room under it for its cord. */
  lamp?: React.ReactNode;
  items: DrawerItem[];
  /** Pinned under the list: theme, sign in or out, back to the other site. */
  footer: React.ReactNode;
}

/**
 * The phone menu: a panel sliding in from the right over a dimmed page (not a full-screen sheet), grouped rows with
 * icons, the current page marked, sections that expand in place, and a footer that stays put while the list scrolls.
 * Escape and the page-change close are handled by the bar that owns it.
 */
export function MobileDrawer({ open, onClose, id, label, identity, lamp, items, footer }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Each time the menu opens, the section you are in is open and the rest are folded away.
  useEffect(() => {
    if (open) setExpanded(new Set(items.filter((item) => item.current || item.defaultOpen).map((item) => item.key)));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-[2px]"
          />
          <motion.div
            key="panel"
            id={id}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed bottom-0 right-0 top-0 z-[60] flex w-[min(344px,88vw)] flex-col border-l border-black/[0.08] bg-journey-bg shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.6)] outline-none dark:border-white/[0.1]"
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />
            <div className="flex h-14 shrink-0 items-center justify-between pl-5 pr-2">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-[#1A1A2E]/70 dark:text-white/70">Menu</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#1A1A2E]/80 transition active:scale-95 dark:text-white/80"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {lamp && (
              <div className="relative mb-2 h-[108px] shrink-0 border-b border-black/[0.07] dark:border-white/[0.07]">
                <span className="absolute left-5 top-3.5 font-mono text-[11px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#1A1A2E]/75 dark:text-white/75">
                  Pull<br />to switch<br />the lights
                </span>
                <div className="absolute left-[176px] top-[-56px] z-10">{lamp}</div>
              </div>
            )}

            {identity && <div className="shrink-0 px-3.5 pb-3">{identity}</div>}

            <nav aria-label={label} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3">
              {items.map((item) => {
                const Icon = item.icon;
                const isOpen = expanded.has(item.key);
                const hasChildren = !!item.children?.length;
                return (
                  <div key={item.key}>
                    <div className={`flex items-center rounded-xl ${item.current ? 'bg-orange-500/[0.12] shadow-[inset_3px_0_0_#FF7A00]' : ''}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={item.current ? 'page' : undefined}
                        className={`flex min-h-12 min-w-0 flex-1 items-center gap-3.5 rounded-xl px-3.5 text-base font-semibold transition active:scale-[0.98] ${
                          item.accent ? 'text-orange-600 dark:text-orange-300' : 'text-[#1A1A2E] dark:text-white'
                        }`}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${item.current || item.accent ? 'text-journey-accent' : 'text-[#1A1A2E]/60 dark:text-white/65'}`} aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => toggle(item.key)}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Fold' : 'Open'} ${item.label}`}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[#1A1A2E]/65 transition active:scale-95 dark:text-white/65"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {hasChildren && isOpen && (
                      <div className="mb-1 ml-[1.65rem] mt-0.5 flex flex-col border-l border-black/[0.08] pl-2 dark:border-white/[0.1]">
                        {item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            aria-current={child.current ? 'page' : undefined}
                            className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition active:scale-[0.98] ${
                              child.current ? 'bg-orange-500/[0.1] font-semibold text-journey-accent' : 'font-medium text-[#1A1A2E]/80 dark:text-white/80'
                            }`}
                          >
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">{child.label}</span>
                              {child.desc && <span className="truncate text-[11px] font-normal text-[#1A1A2E]/60 dark:text-white/60">{child.desc}</span>}
                            </span>
                            {!!child.badge && (
                              <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black" aria-label={`${child.badge} need attention`}>{child.badge}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="flex shrink-0 flex-col gap-3 border-t border-black/[0.08] bg-journey-bg px-3.5 pb-5 pt-3.5 dark:border-white/[0.1]">{footer}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
