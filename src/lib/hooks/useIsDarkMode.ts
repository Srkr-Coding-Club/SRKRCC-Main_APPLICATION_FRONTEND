'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks the `dark` class on <html> (toggled by the root layout's theme
 * script). Shared by the CodeQuest charts so each one doesn't reinvent the
 * MutationObserver wiring used in ResponseTimelineChart.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default useIsDarkMode;
