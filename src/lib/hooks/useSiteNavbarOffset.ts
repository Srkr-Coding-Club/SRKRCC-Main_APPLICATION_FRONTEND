'use client';

import { useLayoutEffect, useState } from 'react';

export function useSiteNavbarOffset(enabled: boolean) {
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) return;

    const navbar = document.querySelector<HTMLElement>('header[data-site-chrome]');
    if (!navbar) {
      setOffset(0);
      return;
    }

    const updateOffset = () => {
      setOffset(Math.ceil(Math.max(0, navbar.getBoundingClientRect().bottom)));
    };
    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    observer.observe(navbar);
    window.addEventListener('scroll', updateOffset, { passive: true });
    window.addEventListener('resize', updateOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateOffset);
      window.removeEventListener('resize', updateOffset);
    };
  }, [enabled]);

  return offset;
}
