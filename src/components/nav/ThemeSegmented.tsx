'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Light and Dark side by side, for places with room to say which is on (the phone menus). Same storage as the round toggle. */
export function ThemeSegmented() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'));
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => watch.disconnect();
  }, []);

  const choose = (next: boolean) => {
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Storage blocked: the choice just will not persist.
    }
    setDark(next);
  };

  const option = (isDark: boolean, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => choose(isDark)}
      aria-pressed={dark === isDark}
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13px] font-semibold transition active:scale-95 ${
        dark === isDark ? 'bg-journey-surface text-[#1A1A2E] shadow-sm dark:text-white' : 'text-[#1A1A2E]/70 dark:text-white/70'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="Theme" className="flex gap-0.5 rounded-xl bg-black/[0.06] p-[3px] dark:bg-white/[0.08]">
      {option(false, 'Light', Sun)}
      {option(true, 'Dark', Moon)}
    </div>
  );
}
