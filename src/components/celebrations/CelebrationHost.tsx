'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PartyPopper, Sparkles, X } from 'lucide-react';
import type { CelebrationSize } from '@/lib/types';
import { useToast } from '@/context/ToastContext';
import { celebrationsApi } from '@/lib/api/celebrations';
import { burst, CELEBRATION_SIZES } from '@/lib/celebrate';
import { useCelebrations } from '@/lib/hooks/useCelebrations';
import { useSiteNavbarOffset } from '@/lib/hooks/useSiteNavbarOffset';

const FRAME: Record<CelebrationSize, string> = {
  SMALL: 'border-journey-accent/30',
  MEDIUM: 'border-journey-accent/50',
  BIG: 'border-journey-accent shadow-[0_0_60px_rgba(255,122,0,0.45)]',
};

/** Only an in-app path is followed; anything else the server might ever send is ignored. */
const safeLink = (url: string) => (url.startsWith('/') && !url.startsWith('//') ? url : '');

/**
 * The one place celebrations appear: mounted once in the root layout, it shows the next one for signed-in people.
 * A small or medium one is a card that floats under the navigation, out of the way of what the person is doing. A big one
 * takes the middle of the screen over a soft dimmed backdrop, so the moment feels like one; a tap on the backdrop closes it.
 */
export function CelebrationHost() {
  const { current, remaining, dismiss, clear } = useCelebrations();
  const { toast } = useToast();
  const reduced = useReducedMotion();
  // Measured when a card is on screen (not once at start-up), so it follows whichever navigation the page has now.
  const navbar = useSiteNavbarOffset(Boolean(current) && current?.size !== 'BIG');

  // Confetti and the self-closing timer belong to the card on screen.
  useEffect(() => {
    if (!current) return undefined;
    const stop = burst(current.size);
    const timer = window.setTimeout(dismiss, CELEBRATION_SIZES[current.size].stayMs);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => {
      stop();
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [current, dismiss]);

  const turnOff = async () => {
    try {
      await celebrationsApi.setEnabled(false);
      clear();
      toast.success('Celebrations are off', 'You can turn them back on in your profile.');
    } catch {
      toast.error('Could not change that', 'Try again from your profile.');
    }
  };

  const link = current ? safeLink(current.link_url) : '';
  const big = current?.size === 'BIG';
  const Icon = big ? PartyPopper : Sparkles;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-0 z-[210]">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={current.id} className="absolute inset-0" initial={false} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }}>
            {big && (
              <motion.div
                aria-hidden="true"
                data-celebration-backdrop=""
                onClick={dismiss}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              />
            )}
            <div
              className={`absolute inset-x-0 flex justify-center px-4 ${big ? 'inset-y-0 items-center' : 'items-start'}`}
              style={big ? undefined : { top: navbar + 12 }}
            >
              <motion.div
                data-celebration={current.size}
                initial={reduced ? false : { opacity: 0, y: big ? 24 : -20, scale: big ? 0.9 : 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 24 }}
                className={`pointer-events-auto relative w-full rounded-2xl border-2 bg-journey-surface text-journey-text shadow-2xl ${FRAME[current.size]} ${big ? 'max-w-lg p-6 text-center sm:p-8' : 'max-w-md p-4 sm:p-5'}`}
              >
                <div className={`flex gap-3 ${big ? 'flex-col items-center' : 'items-start'}`}>
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full bg-journey-accent/15 text-journey-accent ${big ? 'h-16 w-16' : 'h-11 w-11'}`}
                    aria-hidden="true"
                  >
                    <Icon className={big ? 'h-9 w-9' : 'h-6 w-6'} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    {reduced && <p aria-hidden="true" className="text-lg tracking-widest">✨ 🎉 ✨</p>}
                    <p className={`break-words font-extrabold leading-tight ${big ? 'text-2xl sm:text-3xl' : 'text-base'}`}>{current.title}</p>
                    {current.message && <p className={`break-words text-journey-text/80 ${big ? 'text-base' : 'text-sm'}`}>{current.message}</p>}
                    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 ${big ? 'justify-center' : ''}`}>
                      {link && (
                        <Link
                          href={link}
                          onClick={dismiss}
                          className={big
                            ? 'inline-flex min-h-11 items-center rounded-lg bg-journey-accent px-5 text-sm font-bold text-journey-on-accent hover:opacity-90'
                            : 'inline-flex min-h-11 items-center text-sm font-bold text-journey-accent hover:underline sm:min-h-0'}
                        >
                          Take me there
                        </Link>
                      )}
                      {remaining > 0 && <span className="text-xs text-journey-muted">{remaining} more waiting</span>}
                      <button type="button" onClick={() => void turnOff()} className="inline-flex min-h-11 items-center text-xs font-semibold text-journey-muted underline-offset-2 hover:underline sm:min-h-0">
                        Turn off celebrations
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Close"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-journey-muted hover:bg-journey-text/10 hover:text-journey-text sm:h-9 sm:w-9 ${big ? 'absolute right-3 top-3' : '-mr-1 -mt-1'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
