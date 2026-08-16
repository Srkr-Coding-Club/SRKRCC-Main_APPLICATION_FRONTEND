'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Instagram, Linkedin, Github, Youtube, ArrowUp } from 'lucide-react';
import BrainLogo from './BrainLogo';

const SOCIALS = [
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
];

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events' },
  { label: 'Career', href: '/career' },
  { label: 'Blogs', href: '/blogs' },
];

const RESOURCES = [
  { label: 'IconCoders', href: '/iconcoders' },
  { label: 'Codequest', href: '/codequest' },
  { label: 'Forms', href: '/forms' },
  { label: 'Admin', href: '/admin' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[var(--background)] transition-colors duration-300 overflow-hidden">
      {/* persistent signature gradient hairline, matches the navbar's */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />

      <div className="relative pt-16 pb-8 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="absolute inset-0 bg-dot-grid opacity-20 [mask-image:linear-gradient(to_bottom,#000,transparent)] pointer-events-none" />

        {/* Giant background wordmark watermark */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden pointer-events-none select-none"
        >
          <span
            className="font-poppins font-extrabold leading-none whitespace-nowrap text-[16vw] sm:text-[11vw] translate-y-[28%] text-[#1A1A2E]/[0.04] dark:text-white/[0.045]"
          >
             CODING CLUB
          </span>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-black/[0.06] dark:border-white/[0.08]"
          >
            {/* Brand */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <BrainLogo size={30} showRays={false} animated={false} />
                <div className="flex flex-col leading-none">
                  <span className="font-poppins font-extrabold text-[15px] bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] bg-clip-text text-transparent">
                    SRKR
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#1A1A2E]/45 dark:text-white/40">
                    Coding Club
                  </span>
                </div>
              </div>

              <p className="font-mono text-xs text-[#FF7A00]">// Learn &middot; Build &middot; Innovate</p>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                Building a vibrant ecosystem for student developers to learn core fundamentals, collaborate on real
                projects, and compete globally.
              </p>

              <div className="flex items-center gap-3 pt-2">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 transition-colors"
                    aria-label={label}
                  >
                    <span className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300 bg-[#FF7A00] -z-10" />
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1A1A2E]/50 dark:text-white/40">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                {QUICK_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-[#FF7A00] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1A1A2E]/50 dark:text-white/40">
                Resources
              </h4>
              <ul className="space-y-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                {RESOURCES.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-[#FF7A00] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1A1A2E]/50 dark:text-white/40">
                Contact Us
              </h4>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
                  <span className="break-all">srkrcodingclub@srkr.ac.in</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
                  <span>+91 12345 67890</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#FF7A00] flex-shrink-0 mt-0.5" />
                  <span>SRKR Campus, Bhimavaram, Andhra Pradesh &ndash; 534204</span>
                </li>
              </ul>
            </div>
          </motion.div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              &copy; {currentYear} SRKR Coding Club. All rights reserved.
            </span>

            <div className="flex items-center gap-5">
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                built by students, for students
              </span>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-8 h-8 rounded-full border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 transition-colors"
                aria-label="Back to top"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
