'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, GraduationCap, Building2, Sparkles, Pause, Play } from 'lucide-react';
import SectionHeading from './SectionHeading';

export interface Alumni {
  id: string;
  name: string;
  role: string;
  company: string;
  batch: string;
  image: string;
  message: string;
}

// ============================================================================
// DEFAULT INITIAL ALUMNI DATA (Placeholder Photos & Messages)
// Update photos & messages here when ready!
// ============================================================================
export const INITIAL_ALUMNI: Alumni[] = [
  {
    id: 'alumni-1',
    name: 'Rajesh',
    role: 'Software Engineer',
    company: 'Tech Alum',
    batch: 'Batch of 2022',
    image: '/alumni/alumni-1.png',
    message:
      'SRKR Coding Club was the turning point in my college life. Building real projects with peers gave me the exact hands-on experience and confidence needed to crack top tech interviews.',
  },
  {
    id: 'alumni-2',
    name: 'Vijay Babu',
    role: 'Product Engineer',
    company: 'Tech Alum',
    batch: 'Batch of 2023',
    image: '/alumni/alumni-2.png',
    message:
      'Leading hackathons and participating in daily CodeQuest challenges taught me resilience and leadership. The network of supportive seniors is the club’s greatest strength.',
  },
  {
    id: 'alumni-3',
    name: 'Sidhartha',
    role: 'Full Stack Developer',
    company: 'Tech Alum',
    batch: 'Batch of 2021',
    image: '/alumni/alumni-3.png',
    message:
      'From learning my first line of code at a club workshop to deploying microservices at scale, SRKRCC provided the ultimate launchpad for my software engineering career.',
  },
];

interface AlumniCarouselProps {
  alumniList?: Alumni[];
}

export default function AlumniCarousel({ alumniList = INITIAL_ALUMNI }: AlumniCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = Next, -1 = Prev
  const [isAutoplay, setIsAutoplay] = useState(true);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % alumniList.length);
  }, [alumniList.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + alumniList.length) % alumniList.length);
  }, [alumniList.length]);

  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoplay, nextSlide]);

  const activeAlumni = alumniList[currentIndex];

  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.35 },
        scale: { duration: 0.35 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 },
      },
    }),
  };

  return (
    <section className="space-y-8" data-reveal>
      <SectionHeading
        icon={GraduationCap}
        eyebrow="Alumni Voices"
        title="Stories & Guidance from Our Alumni"
        description="Hear from SRKR Coding Club graduates who are now creating impact across top tech companies worldwide."
      />

      {/* Main Glassmorphism Glowing Container */}
      <div
        className="relative overflow-hidden rounded-3xl border border-orange-500/20 dark:border-slate-800 glass-panel p-6 sm:p-10 shadow-[0_20px_50px_rgba(255,122,0,0.12)] dark:shadow-[0_20px_50px_rgba(255,122,0,0.22)] transition-all group"
        onMouseEnter={() => setIsAutoplay(false)}
        onMouseLeave={() => setIsAutoplay(true)}
      >
        {/* Animated Top Progress Bar when Autoplay is Active */}
        {isAutoplay && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/40 dark:bg-slate-800 overflow-hidden">
            <motion.div
              key={currentIndex}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 6, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#8B2E3B]"
            />
          </div>
        )}

        {/* Ambient Soft Background Elements */}
        <div
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-transform duration-1000 group-hover:scale-110"
          style={{ background: 'radial-gradient(circle, #FF7A00, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none transition-transform duration-1000 group-hover:scale-110"
          style={{ background: 'radial-gradient(circle, #8B2E3B, transparent 70%)' }}
        />

        {/* Giant Watermark Quote Icon */}
        <Quote className="absolute top-6 right-8 text-orange-500/10 dark:text-orange-500/15 w-28 h-28 pointer-events-none transform rotate-12 transition-transform duration-700 group-hover:rotate-6" />

        {/* AnimatePresence for Smooth Card Content Switching */}
        <div className="relative z-10 min-h-[300px] flex items-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeAlumni.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid md:grid-cols-12 gap-8 items-center w-full"
            >
              {/* Alumni Photo Frame with Gradient Border & Soft Glow */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="relative group/avatar">
                  {/* Balanced Soft Glow Ring */}
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#FF7A00] via-[#FFA500] to-[#8B2E3B] opacity-45 blur-md group-hover/avatar:opacity-75 transition-opacity duration-500" />

                  {/* Image Holder with Crisp Gradient Border */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden p-[3px] bg-gradient-to-tr from-[#FF7A00] via-[#FFA500] to-[#8B2E3B] shadow-xl shadow-orange-500/20">
                    <div className="relative w-full h-full rounded-[13px] overflow-hidden bg-slate-900">
                      <Image
                        src={activeAlumni.image}
                        alt={activeAlumni.name}
                        fill
                        sizes="(max-width: 768px) 208px, 240px"
                        className="object-cover transition-transform duration-700 group-hover/avatar:scale-110"
                        priority
                      />
                    </div>
                  </div>

                  {/* Floating Sparkle Badge */}
                  <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-[#FF7A00] to-[#8B2E3B] text-white p-2 rounded-xl shadow-lg border border-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                </div>

                {/* Batch Badge */}
                <div className="mt-5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 dark:bg-orange-500/20 text-[#FF7A00] dark:text-orange-400 border border-orange-500/30 backdrop-blur-md shadow-sm">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {activeAlumni.batch}
                  </span>
                </div>
              </div>

              {/* Quote Content & Details */}
              <div className="md:col-span-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Quote className="w-8 h-8 text-[#FF7A00] shrink-0" />
                    <span className="text-xs font-bold tracking-widest text-[#FF7A00] uppercase">
                      Alumni Testimonial
                    </span>
                  </div>

                  <p className="text-slate-800 dark:text-slate-100 font-medium text-base sm:text-lg lg:text-xl leading-relaxed italic">
                    &ldquo;{activeAlumni.message}&rdquo;
                  </p>
                </div>

                {/* Profile Card Footer */}
                <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-poppins font-extrabold text-xl sm:text-2xl text-[#1A1A2E] dark:text-white tracking-tight">
                      {activeAlumni.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-[#FF7A00]">{activeAlumni.role}</span>
                      <span className="text-slate-400">•</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                        <Building2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                        {activeAlumni.company}
                      </span>
                    </div>
                  </div>

                  {/* Slider Control Buttons */}
                  <div className="flex items-center gap-2.5">
                    {/* Pause/Play Toggle Button */}
                    <button
                      onClick={() => setIsAutoplay(!isAutoplay)}
                      aria-label={isAutoplay ? 'Pause Autoplay' : 'Start Autoplay'}
                      title={isAutoplay ? 'Pause Carousel' : 'Play Carousel'}
                      className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 glass-panel flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#FF7A00] transition-colors"
                    >
                      {isAutoplay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={prevSlide}
                      aria-label="Previous Alumni"
                      className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 glass-panel flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-[#FF7A00] hover:text-white hover:border-[#FF7A00] transition-all shadow-md active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      aria-label="Next Alumni"
                      className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 glass-panel flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-[#FF7A00] hover:text-white hover:border-[#FF7A00] transition-all shadow-md active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators / Expandable Bullets */}
        <div className="mt-8 flex justify-center items-center gap-2">
          {alumniList.map((alumni, index) => (
            <button
              key={alumni.id}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2.5 rounded-full transition-all duration-500 ${index === currentIndex
                ? 'w-10 bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#8B2E3B] shadow-sm'
                : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
