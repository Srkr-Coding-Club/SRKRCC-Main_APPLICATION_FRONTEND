'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function AboutSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#FAFAFC] dark:bg-[#0D0E15] transition-colors duration-300 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Block */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">
              ABOUT US
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#1A1A2E] dark:text-white leading-tight">
              Building Coders. <br />
              Creating <span className="text-[#FF7A00]">Innovators.</span>
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
              SRKR Coding Club is a student-driven community passionate about coding, development, and emerging technologies. We organize events, workshops, and challenges that inspire learners to explore, experiment, and excel.
            </p>

            <div>
              <Link
                href="/blogs"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#8B2E3B] hover:bg-[#742530] text-white font-bold text-sm shadow-sm transition"
              >
                <span>Know More About Us</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Visual Image Block with Decorative Burgundy Layer */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            
            {/* Burgundy background decorative panel */}
            <div className="absolute left-3 top-3 w-4/5 h-full bg-[#8B2E3B] rounded-xl opacity-90"></div>

            {/* Bottom Orange offset block */}
            <div className="absolute right-2 -bottom-2 w-1/3 h-10 bg-[#FF7A00] rounded-md"></div>

            {/* Main Image Container */}
            <div className="relative z-10 rounded-xl overflow-hidden shadow-lg border-2 border-white dark:border-[#151722] max-w-md lg:max-w-full">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="SRKR Coding Club students collaborating on projects"
                className="w-full h-80 sm:h-96 object-cover"
              />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
