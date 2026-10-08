'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

export default function StackDetailsDialog({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [navbarBottom, setNavbarBottom] = useState(74);
  useFocusTrap(dialogRef, true);

  useLayoutEffect(() => {
    const navbar = document.querySelector<HTMLElement>('[data-site-chrome]');
    if (!navbar) return;

    const measureNavbar = () => {
      setNavbarBottom(Math.max(0, navbar.getBoundingClientRect().bottom));
    };

    measureNavbar();
    const observer = new ResizeObserver(measureNavbar);
    observer.observe(navbar);
    window.addEventListener('scroll', measureNavbar, { passive: true });
    window.addEventListener('resize', measureNavbar);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', measureNavbar);
      window.removeEventListener('resize', measureNavbar);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center overflow-hidden bg-slate-950/45 px-2 py-3 pt-[var(--navbar-bottom)] backdrop-blur-md sm:px-4 sm:py-4"
      style={
        {
          top: 0,
          '--navbar-bottom': `${navbarBottom}px`,
          '--details-stack-max-height': `calc(100dvh - ${navbarBottom}px - 7rem)`,
        } as CSSProperties
      }
      onMouseDown={(event) => {
        if (
          !(event.target instanceof Element) ||
          !event.target.closest('[data-details-stack]')
        ) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative flex max-h-full w-full flex-col pt-4 sm:pt-16"
        initial={{ opacity: 0, scale: 0.86, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
