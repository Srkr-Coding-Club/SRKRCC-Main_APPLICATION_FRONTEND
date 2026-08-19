'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  // Default matches the blocking inline script in layout.tsx (dark-by-default),
  // so there's no icon flash for a first-time visitor. Corrected on mount below
  // for a returning visitor who previously chose light.
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        // localStorage unavailable (private mode, etc.) — theme just won't persist
      }
      return next;
    });
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`relative w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-[#1A1A2E]/65 dark:text-white/55 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDarkMode ? 'sun' : 'moon'}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
