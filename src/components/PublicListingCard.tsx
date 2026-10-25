'use client';

import { useLayoutEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import gsap from 'gsap';
import SpotlightCard from '@/components/ui/SpotlightCard';

interface PublicListingCardProps {
  accent?: string;
  index?: number;
  entryAnimation?: 'slide' | 'none';
  className?: string;
  category: ReactNode;
  status?: ReactNode;
  schedule?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  descriptionClassName?: string;
  details?: ReactNode;
  footer?: ReactNode;
  onCardClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

export default function PublicListingCard({
  accent = '#FF7A00',
  index = 0,
  entryAnimation = 'slide',
  className = '',
  category,
  status,
  schedule,
  title,
  description,
  descriptionClassName = '',
  details,
  footer,
  onCardClick,
}: PublicListingCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const context = gsap.context(() => {
      if (entryAnimation === 'none') return;

      gsap.fromTo(
        wrapperRef.current,
        { x: 90, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          delay: index * 0.12,
          ease: 'power3.out',
        },
      );
    }, wrapperRef);

    return () => context.revert();
  }, [entryAnimation, index]);

  const handleHoverEnter = () => {
    const leftElements = [
      categoryRef.current,
      scheduleRef.current,
      detailsRef.current,
    ].filter((element) => element !== null);
    const rightElements = [titleRef.current, descriptionRef.current].filter(
      (element) => element !== null,
    );

    gsap.fromTo(
      leftElements,
      { x: -70, opacity: 0.35 },
      { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', overwrite: 'auto' },
    );
    gsap.fromTo(
      rightElements,
      { x: 70, opacity: 0.35 },
      { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', overwrite: 'auto' },
    );
  };

  return (
    <div ref={wrapperRef} className={`h-full py-2 ${className || 'w-full'}`}>
      <SpotlightCard
        spotlightColor={accent}
        onEnter={handleHoverEnter}
        className="h-full w-full border border-journey-text/10 bg-journey-surface/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-journey-accent/40"
      >
        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden p-5 sm:p-6 [&>*]:shrink-0 ${onCardClick ? 'cursor-pointer' : ''}`}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a, button')) return;
            onCardClick?.(event);
          }}
        >
          <div ref={categoryRef} className="flex min-h-7 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-journey-accent/30 bg-journey-accent/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-journey-accent">
              {category}
            </span>
            {status}
          </div>

          {schedule && (
            <div ref={scheduleRef} className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[11px] text-journey-muted">
              {schedule}
            </div>
          )}

          <div className="mt-6 overflow-hidden">
            <h3 ref={titleRef} className="line-clamp-2 min-h-14 font-display text-lg font-semibold leading-snug tracking-tight text-journey-text">
              {title}
            </h3>
            <div ref={descriptionRef} className={`mt-2 line-clamp-3 min-h-16 text-[13px] leading-relaxed text-journey-muted ${descriptionClassName}`}>
              {description}
            </div>
          </div>

          {details && (
            <>
              <div className="my-2 h-px w-full bg-journey-text/10" />
              <div ref={detailsRef} className="text-[13px] text-journey-text/80">{details}</div>
            </>
          )}

          {footer && <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">{footer}</div>}
        </div>
      </SpotlightCard>
    </div>
  );
}