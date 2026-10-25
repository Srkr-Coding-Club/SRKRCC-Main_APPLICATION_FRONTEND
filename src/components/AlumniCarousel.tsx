'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, GraduationCap, Building2 } from 'lucide-react';

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
  const [direction, setDirection] = useState(1);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const activeIndex = alumniList.length ? currentIndex % alumniList.length : 0;

  const nextSlide = useCallback(() => {
    if (alumniList.length < 2) return;
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % alumniList.length);
  }, [alumniList.length]);

  const prevSlide = useCallback(() => {
    if (alumniList.length < 2) return;
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + alumniList.length) % alumniList.length);
  }, [alumniList.length]);

  useEffect(() => {
    if (!isAutoplay || alumniList.length < 2) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [alumniList.length, isAutoplay, nextSlide]);

  const activeAlumni = alumniList[activeIndex];

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

  if (!activeAlumni) return null;

  return (
    <section className="space-y-8" data-reveal>
      <div className="max-w-2xl space-y-3">
        <span className="block font-mono text-xs font-medium uppercase tracking-[0.18em] text-journey-accent">
          Alumni Voices
        </span>
        <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.7rem)] font-semibold leading-tight tracking-[-0.025em] text-journey-text [font-stretch:112%]">
          Stories and guidance from our alumni
        </h2>
        <p className="text-base leading-relaxed text-journey-muted">
          Hear from SRKR Coding Club graduates who are now creating impact across the tech industry.
        </p>
      </div>

      <div className="relative">
        {/* Arrows always on left & right of the card */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Previous arrow */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous alumni"
            disabled={alumniList.length < 2}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-journey-text/10 bg-journey-surface text-journey-text shadow-lg transition hover:border-journey-accent/40 hover:bg-journey-accent hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Card */}
          <div
            className="group relative min-w-0 flex-1 overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface/70 p-5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)] backdrop-blur-sm dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)] sm:p-8"
            onMouseEnter={() => setIsAutoplay(false)}
            onMouseLeave={() => setIsAutoplay(true)}
          >
            {isAutoplay && (
              <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-journey-text/5">
                <motion.div
                  key={activeIndex}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  className="h-full bg-journey-accent"
                />
              </div>
            )}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.14),transparent)] transition-transform duration-700 group-hover:scale-110"
            />
            <Quote
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-5 h-16 w-16 rotate-12 text-journey-accent/10 sm:right-8 sm:top-8 sm:h-24 sm:w-24"
            />

            <div className="relative z-10 flex min-h-[390px] items-center sm:min-h-[300px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={activeAlumni.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid w-full grid-cols-1 items-center gap-7 md:grid-cols-12 md:gap-8"
                >
                  <div className="flex flex-col items-center md:col-span-4">
                    <div className="relative">
                      <div className="absolute -inset-2 rounded-[28px] bg-journey-accent/20 blur-xl" />
                      <div className="relative h-36 w-36 overflow-hidden rounded-[24px] border border-journey-text/10 bg-journey-bg p-1 shadow-xl sm:h-48 sm:w-48">
                        <div className="relative h-full w-full overflow-hidden rounded-[20px]">
                          <Image
                            src={activeAlumni.image}
                            alt={activeAlumni.name}
                            fill
                            sizes="(max-width: 640px) 144px, 192px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                      </div>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-journey-accent/20 bg-journey-accent/10 px-3 py-1.5 text-xs font-medium text-journey-accent">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {activeAlumni.batch}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col justify-between gap-6 md:col-span-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-journey-accent">
                        <Quote className="h-5 w-5 shrink-0" />
                        Alumni Testimonial
                      </div>
                      <p className="font-display text-base font-medium leading-relaxed text-journey-text sm:text-lg lg:text-xl">
                        &ldquo;{activeAlumni.message}&rdquo;
                      </p>
                    </div>

                    <div className="border-t border-journey-text/10 pt-5">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-journey-text sm:text-2xl">
                        {activeAlumni.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-journey-accent">{activeAlumni.role}</span>
                        <span aria-hidden="true" className="text-journey-muted">
                          /
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-journey-text/10 bg-journey-bg/70 px-2.5 py-1 text-journey-muted">
                          <Building2 className="h-3.5 w-3.5 text-journey-accent" />
                          {activeAlumni.company}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots only */}
            <div className="relative z-10 mt-5 flex items-center justify-center border-t border-journey-text/10 pt-5">
              <div className="flex items-center justify-center gap-2">
                {alumniList.map((alumni, index) => (
                  <button
                    key={alumni.id}
                    type="button"
                    onClick={() => {
                      setDirection(index > activeIndex ? 1 : -1);
                      setCurrentIndex(index);
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    className={`h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface ${
                      index === activeIndex
                        ? 'w-8 bg-journey-accent'
                        : 'w-2.5 bg-journey-text/20 hover:bg-journey-text/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Next arrow */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next alumni"
            disabled={alumniList.length < 2}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-journey-text/10 bg-journey-surface text-journey-text shadow-lg transition hover:border-journey-accent/40 hover:bg-journey-accent hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}