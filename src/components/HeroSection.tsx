'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Users, Code, Hammer, Lightbulb } from 'lucide-react';
import BrainLogo from './BrainLogo';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:py-20 bg-gradient-to-b from-white via-[#FAFAFC] to-[#F5F5F5] dark:from-[#0D0E15] dark:via-[#11131F] dark:to-[#0D0E15] transition-colors duration-300">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#FF7A00]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#8B2E3B]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline & Action Controls */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Tagline Pill */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold bg-[#FFE5CC]/70 dark:bg-[#FF7A00]/20 text-[#FF7A00] border border-[#FF7A00]/30 shadow-sm">
              <span>Learn • Build • Innovate</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1A1A2E] dark:text-white leading-[1.15]">
              SRKR <br className="hidden sm:inline" />
              <span className="text-[#8B2E3B] dark:text-[#E05263]">&lt;Coding </span>
              <span className="text-[#FF7A00]">Club&gt;</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Empowering students to enhance their coding skills, foster innovation, and build a thriving community of tech enthusiasts.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/events"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-base shadow-sm transition"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              
              <Link
                href="#join"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-white dark:bg-[#151722] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base border border-slate-200 dark:border-slate-800 shadow-sm transition"
              >
                <span>Join Us</span>
                <Users className="w-4 h-4 text-[#8B2E3B] dark:text-[#FF7A00]" />
              </Link>
            </div>

            {/* Student Avatar Stack & Stat */}
            <div className="flex items-center space-x-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 max-w-md">
              <div className="flex -space-x-3 overflow-hidden">
                <img
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#151722] object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Student member"
                />
                <img
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#151722] object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Student member"
                />
                <img
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#151722] object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                  alt="Student member"
                />
                <img
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#151722] object-cover"
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                  alt="Student member"
                />
                <img
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-[#151722] object-cover"
                  src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80"
                  alt="Student member"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">500+ Students</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Growing Together</p>
              </div>
            </div>

          </div>

          {/* Right Column: Signature Brain Rays Graphic & Floating Cards */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px]">
            
            {/* Background concentric glowing circles */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-dashed border-[#FF7A00]/20 animate-spin-slow"></div>
            <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-[#8B2E3B]/10"></div>

            {/* Central Signature Brain Rays Logo */}
            <div className="relative z-10 p-6 rounded-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
              <BrainLogo size={140} showRays={true} animated={true} />
            </div>

            {/* Floating Badge 1: Top Right (Learn) */}
            <div className="absolute -top-2 right-2 sm:right-6 z-20 bg-white dark:bg-[#151722] p-3 sm:p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="p-2 rounded-md bg-[#FFE5CC] dark:bg-[#8B2E3B]/30 text-[#8B2E3B] dark:text-[#FF7A00]">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#8B2E3B] dark:text-[#FF7A00]">Learn</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Skills</p>
              </div>
            </div>

            {/* Floating Badge 2: Middle Left (Build) */}
            <div className="absolute bottom-24 -left-2 sm:-left-6 z-20 bg-white dark:bg-[#151722] p-3 sm:p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-950/40 text-[#FF7A00]">
                <Hammer className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#FF7A00]">Build</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real Projects</p>
              </div>
            </div>

            {/* Floating Badge 3: Bottom Right (Innovate) */}
            <div className="absolute -bottom-4 right-6 sm:right-10 z-20 bg-white dark:bg-[#151722] p-3 sm:p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <div className="p-2 rounded-md bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400">Innovate</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Together</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
