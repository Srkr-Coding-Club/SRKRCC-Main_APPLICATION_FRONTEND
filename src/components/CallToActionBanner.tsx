'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CallToActionBanner() {
  return (
    <section id="join" className="py-12 bg-white dark:bg-[#0D0E15] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Container */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#8B2E3B] via-[#742530] to-[#5C1C26] p-8 sm:p-12 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Decorative Code Brackets Watermark */}
          <div className="absolute left-6 text-7xl font-mono opacity-10 pointer-events-none select-none">
            &lt;/&gt;
          </div>
          <div className="absolute right-6 text-7xl font-mono opacity-10 pointer-events-none select-none">
            &lt;/&gt;
          </div>

          {/* Text Content */}
          <div className="relative z-10 max-w-xl text-center md:text-left space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to level up your coding journey?
            </h2>
            <p className="text-rose-100 text-sm sm:text-base leading-relaxed">
              Join SRKR Coding Club today and be part of a community that builds the future.
            </p>
          </div>

          {/* CTA Action Button */}
          <div className="relative z-10 flex-shrink-0">
            <Link
              href="#join"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#8B2E3B] font-extrabold text-base shadow-sm transition"
            >
              <span>Join Us Now</span>
              <ArrowRight className="w-5 h-5 text-[#FF7A00]" />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
