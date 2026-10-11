'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Building2, GraduationCap, Pause, Play, Sparkles } from 'lucide-react';
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
  const [isAutoplay, setIsAutoplay] = useState(true);

  const total = alumniList.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(interval);
  }, [isAutoplay, nextSlide]);

  const activeAlumni = alumniList[currentIndex];

  // Helper to calculate circular distance: -1, 0, 1
  const getDiff = (index: number) => {
    let diff = (index - currentIndex) % total;
    if (diff < -Math.floor(total / 2)) diff += total;
    if (diff > Math.floor(total / 2)) diff -= total;
    return diff;
  };

  return (
    <section className="space-y-8" data-reveal>
      <SectionHeading
        icon={GraduationCap}
        eyebrow="Alumni Voices"
        title="Stories & Guidance from Our Alumni"
        description="Hear from SRKR Coding Club graduates who are now creating impact across top tech companies worldwide."
      />

      <div
        className="relative overflow-hidden rounded-3xl border border-orange-500/20 dark:border-slate-800 glass-panel p-6 sm:p-10 shadow-2xl transition-all"
        onMouseEnter={() => setIsAutoplay(false)}
        onMouseLeave={() => setIsAutoplay(true)}
        style={{ perspective: '1000px' }}
      >
        {/* Animated Top Timer Progress Line */}
        {isAutoplay && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/40 dark:bg-slate-800 overflow-hidden z-30">
            <motion.div
              key={currentIndex}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5.5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-[#FF7A00] via-[#FFA500] to-[#8B2E3B]"
            />
          </div>
        )}

        {/* Ambient Center Spotlight Glow (Inspired by Streamingbar video) */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl opacity-35 dark:opacity-45 pointer-events-none transition-all duration-700"
          style={{ background: 'radial-gradient(circle, #FF7A00 0%, #8B2E3B 60%, transparent 80%)' }}
        />

        {/* 3D CARDS DECK (Coverflow Slider) */}
        <div className="relative z-10 h-[340px] sm:h-[380px] flex items-center justify-center">
          {alumniList.map((alumni, index) => {
            const diff = getDiff(index);
            const isCenter = diff === 0;

            // Simple responsive 3D card positioning
            return (
              <motion.div
                key={alumni.id}
                onClick={() => setCurrentIndex(index)}
                className="absolute w-52 h-72 sm:w-60 sm:h-80 rounded-2xl overflow-hidden cursor-pointer select-none"
                initial={false}
                animate={{
                  x: diff === 0 ? 0 : diff > 0 ? 190 : -190,
                  scale: isCenter ? 1.08 : 0.82,
                  rotateY: diff === 0 ? 0 : diff > 0 ? -16 : 16,
                  opacity: isCenter ? 1 : 0.45,
                  zIndex: isCenter ? 25 : 10,
                  filter: isCenter ? 'brightness(100%)' : 'brightness(60%)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 25,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glowing Card Border for Center Card */}
                <div
                  className={`relative w-full h-full rounded-2xl overflow-hidden border transition-all duration-500 ${
                    isCenter
                      ? 'border-orange-500/80 shadow-[0_15px_40px_rgba(255,122,0,0.35)] ring-2 ring-orange-500/50'
                      : 'border-white/10 shadow-lg'
                  }`}
                >
                  {/* Portrait Photo */}
                  <Image
                    src={alumni.image}
                    alt={alumni.name}
                    fill
                    sizes="(max-width: 640px) 208px, 240px"
                    className="object-cover"
                    priority={isCenter}
                  />

                  {/* Top-Left: Company Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm">
                      <Building2 className="w-3 h-3 text-[#FF7A00]" />
                      {alumni.company}
                    </span>
                  </div>

                  {/* Top-Right: Batch Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-black/60 backdrop-blur-md text-orange-400 border border-white/10 shadow-sm">
                      <Sparkles className="w-3 h-3 text-[#FF7A00]" />
                      {alumni.batch.replace('Batch of ', "'")}
                    </span>
                  </div>

                  {/* Bottom Gradient Scrim Overlay with Name & Role */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-12 flex flex-col justify-end">
                    <h4 className="font-poppins font-extrabold text-white text-lg sm:text-xl tracking-tight leading-snug">
                      {alumni.name}
                    </h4>
                    <p className="text-xs text-orange-400 font-semibold mt-0.5">{alumni.role}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ACTIVE ALUMNI MESSAGE / TESTIMONIAL */}
        <div className="relative z-10 mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/80 max-w-2xl mx-auto text-center space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAlumni.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <Quote className="w-6 h-6 text-[#FF7A00] mx-auto opacity-70" />
              <p className="text-slate-800 dark:text-slate-100 font-medium text-base sm:text-lg leading-relaxed italic">
                &ldquo;{activeAlumni.message}&rdquo;
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Controls: Prev, Play/Pause, Next & Dots */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
            {/* Slide Dots */}
            <div className="flex items-center gap-2">
              {alumniList.map((alumni, index) => (
                <button
                  key={alumni.id}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-gradient-to-r from-[#FF7A00] to-[#8B2E3B]'
                      : 'w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAutoplay(!isAutoplay)}
                aria-label={isAutoplay ? 'Pause Autoplay' : 'Start Autoplay'}
                title={isAutoplay ? 'Pause Carousel' : 'Play Carousel'}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 glass-panel flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#FF7A00] transition-colors shadow-sm"
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
      </div>
    </section>
  );
}
