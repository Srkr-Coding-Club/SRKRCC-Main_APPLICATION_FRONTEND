'use client';

import React from 'react';
import { BookOpen, Monitor, Users, Rocket } from 'lucide-react';

export default function WhatWeDoSection() {
  const pillars = [
    {
      title: 'Learn',
      desc: 'Workshops, sessions & resources to strengthen your coding fundamentals.',
      icon: BookOpen,
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Build',
      desc: 'Build real-world projects and sharpen your problem-solving skills.',
      icon: Monitor,
      iconBg: 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]',
    },
    {
      title: 'Collaborate',
      desc: 'Collaborate with like-minded peers and grow together through teamwork.',
      icon: Users,
      iconBg: 'bg-[#8B2E3B]/10 text-[#8B2E3B] dark:text-[#E05263]',
    },
    {
      title: 'Innovate',
      desc: 'Participate in hackathons & competitions to turn ideas into impact.',
      icon: Rocket,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-500',
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-[#0D0E15] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">
          WHAT WE DO
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-[#1A1A2E] dark:text-white mt-2 mb-12">
          We Learn. We Build. We Innovate.
        </h2>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="bg-white dark:bg-[#151722] p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center text-center group"
              >
                <div className={`p-3.5 rounded-lg ${p.iconBg} mb-6 transition`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white mb-3">
                  {p.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
