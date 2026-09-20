'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab-key focus inside a modal/drawer container while it is open, and
 * returns focus to whatever element triggered it once it closes.
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(containerRef, isOpen);
 *   <div ref={containerRef} role="dialog" tabIndex={-1}>...</div>
 */
export function useFocusTrap<T extends HTMLElement>(containerRef: React.RefObject<T | null>, isOpen: boolean) {
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Move focus into the container on open, and remember what to restore focus to.
  useEffect(() => {
    if (!isOpen) return;

    triggerElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (container) {
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container.focus();
      }
    }

    return () => {
      triggerElementRef.current?.focus?.();
    };
  }, [isOpen, containerRef]);

  // Cycle Tab/Shift+Tab focus between the first and last focusable elements.
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, containerRef]);
}
