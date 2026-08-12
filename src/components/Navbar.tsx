'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Moon, Sun, Menu, X, User } from 'lucide-react';
import BrainLogo from './BrainLogo';

export default function Navbar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);

  useEffect(() => {
    // Check initial dark mode preference
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const nextState = !prev;
      if (nextState) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return nextState;
    });
  };

  const navItems = [
    { label: 'Home', href: '/' },
    {
      label: 'Events',
      href: '/events',
      hasDropdown: true,
      children: [
        { label: 'Upcoming Workshops', href: '/events' },
        { label: 'Hackathons Engine', href: '/hackathons' },
        { label: 'IconCoders Flagship', href: '/iconcoders' },
        { label: 'Codequest Daily', href: '/codequest' },
      ],
    },
    { label: 'Forms', href: '/forms' },
    { label: 'Blogs', href: '/blogs' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0D0E15]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group" aria-label="SRKR Coding Club Home">
            <BrainLogo size={36} showRays={true} animated={false} />
            <div className="flex flex-col">
              <div className="flex items-center space-x-1 font-extrabold text-xl tracking-tight text-[#8B2E3B] dark:text-white">
                <span>SRKR</span>
                <span className="text-[#FF7A00] font-mono">&lt;CODING CLUB&gt;</span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              if (item.hasDropdown) {
                return (
                  <div key={item.label} className="relative group">
                    <button
                      onClick={() => setEventsDropdownOpen(!eventsDropdownOpen)}
                      className={`inline-flex items-center space-x-1 text-sm font-semibold transition ${
                        isActive
                          ? 'text-[#FF7A00] border-b-2 border-[#FF7A00] pb-1'
                          : 'text-slate-700 dark:text-slate-300 hover:text-[#FF7A00] dark:hover:text-[#FF7A00]'
                      }`}
                      aria-expanded={eventsDropdownOpen}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-52 rounded-lg bg-white dark:bg-[#151722] shadow-lg border border-slate-200 dark:border-slate-800 py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
                      {item.children?.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-[#FFE5CC]/50 dark:hover:bg-[#8B2E3B]/20 hover:text-[#FF7A00] transition"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`text-sm font-semibold transition ${
                    isActive
                      ? 'text-[#FF7A00] border-b-2 border-[#FF7A00] pb-1'
                      : 'text-slate-700 dark:text-slate-300 hover:text-[#FF7A00] dark:hover:text-[#FF7A00]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Theme Toggle, Profile & Login/Join Button */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link
              href="/profile"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1"
              aria-label="User Profile"
            >
              <User className="w-5 h-5 text-[#FF7A00]" />
            </Link>

            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FF7A00] px-3 py-2 transition"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-sm shadow-sm transition"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 dark:text-slate-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#151722] border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-slate-800 dark:text-slate-200 hover:text-[#FF7A00]"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="#join"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center py-3 rounded-lg bg-[#FF7A00] text-white font-bold"
            >
              Join Us
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
