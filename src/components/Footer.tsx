'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Instagram, Linkedin, Github, Youtube } from 'lucide-react';
import BrainLogo from './BrainLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-white dark:bg-[#0D0E15] border-t border-slate-200 dark:border-slate-800/80 pt-16 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-100 dark:border-slate-800/80">
          
          {/* Brand Info & Socials */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center space-x-3">
              <BrainLogo size={32} showRays={true} animated={false} />
              <div className="font-extrabold text-lg text-[#8B2E3B] dark:text-white">
                SRKR <span className="text-[#FF7A00] font-mono">&lt;CODING CLUB&gt;</span>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Learn • Build • Innovate
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Building a vibrant ecosystem for student developers to learn core fundamentals, collaborate on real projects, and compete globally.
            </p>

            <div className="flex items-center space-x-4 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] hover:bg-orange-50 transition"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] hover:bg-orange-50 transition"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] hover:bg-orange-50 transition"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] hover:bg-orange-50 transition"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="hover:text-[#FF7A00] transition">Home</Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-[#FF7A00] transition">Events</Link>
              </li>
              <li>
                <Link href="/career" className="hover:text-[#FF7A00] transition">Affiliates</Link>
              </li>
              <li>
                <Link href="/blogs" className="hover:text-[#FF7A00] transition">Alumni</Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-[#FF7A00] transition">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              Resources
            </h4>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/iconcoders" className="hover:text-[#FF7A00] transition">Gallery</Link>
              </li>
              <li>
                <Link href="/blogs" className="hover:text-[#FF7A00] transition">Blogs</Link>
              </li>
              <li>
                <Link href="/codequest" className="hover:text-[#FF7A00] transition">FAQs</Link>
              </li>
              <li>
                <Link href="#code-of-conduct" className="hover:text-[#FF7A00] transition">Code of Conduct</Link>
              </li>
            </ul>
          </div>

          {/* Contact Details Column */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
                <span className="break-all">srkrcodingclub@srkr.ac.in</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
                <span>+91 12345 67890</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-[#FF7A00] flex-shrink-0 mt-0.5" />
                <span>SRKR Campus, Bhimavaram, Andhra Pradesh – 534204</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Notice */}
        <div className="pt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          © {currentYear} SRKR Coding Club. All rights reserved.
        </div>

      </div>
    </footer>
  );
}
