'use client';

import { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CardShowcaseProps {
  title?: string;
  cards: ReactNode[];
  layout?: 'carousel' | 'bounce-stack';
}

const CARD_WIDTH = 300;
const CARD_GAP = 20;
const STACK_PAGE_SIZE = 3;
const STACK_CARD_HEIGHT = 460;
const STACK_CARD_OVERLAP = 48;
const STACK_CARD_ROTATION = 7;

export default function CardShowcase({ title, cards, layout = 'carousel' }: CardShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const isExpandedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState(1);
  const [stackWidth, setStackWidth] = useState(0);
  const [stackCardWidth, setStackCardWidth] = useState(CARD_WIDTH);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    setStackWidth(width);
    setStackCardWidth(Math.min(CARD_WIDTH, Math.max(180, width - 24)));
    const fit = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    setCardsPerPage(fit);
  }, []);

  useLayoutEffect(() => {
  measure();
  const ro = new ResizeObserver(measure);
  if (containerRef.current) ro.observe(containerRef.current);
  return () => ro.disconnect();
}, [measure]);

  useEffect(() => {
    setPage(0);
  }, [cards, layout]);

  const pageSize =
    layout === 'bounce-stack'
      ? stackWidth <= 640
        ? 1
        : STACK_PAGE_SIZE
      : cardsPerPage;
  const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
  const canGoLeft = page > 0;
  const canGoRight = page < totalPages - 1;

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages - 1));
  }, [totalPages]);

  const isMeasured = stackWidth > 0;
const visibleCards = isMeasured
  ? cards.slice(page * pageSize, page * pageSize + pageSize)
  : [];

  const goLeft = () => canGoLeft && setPage((p) => p - 1);
  const goRight = () => canGoRight && setPage((p) => p + 1);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || layout !== 'bounce-stack' || stackWidth > 640) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    event.preventDefault();
    resetStack();
    if (deltaX < 0) goRight();
    else goLeft();
  };

  const getStackTransform = (index: number, expanded: boolean) => {
    const direction = index - (visibleCards.length - 1) / 2;
    const stackStep = stackCardWidth - STACK_CARD_OVERLAP;
    const expandedStep = Math.min(
      stackCardWidth + CARD_GAP,
      Math.max(0, (stackWidth - stackCardWidth) / 2),
    );
    const offset = direction * (expanded ? expandedStep : stackStep);
    const rotation = expanded ? 0 : -direction * STACK_CARD_ROTATION;

    return `translate(-50%, 0px) translateX(${offset}px) rotate(${rotation}deg)`;
  };

useLayoutEffect(() => {
  if (layout !== 'bounce-stack' || !stackRef.current || !isMeasured) return;

  isExpandedRef.current = false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set('.bounce-card', { scale: 1 });
    return;
  }

  const context = gsap.context(() => {
    gsap.fromTo(
      '.bounce-card',
      { scale: 0, y: 36, opacity: 0 },
      {
        scale: 1,
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.16,
        ease: 'elastic.out(1, 0.8)',
        scrollTrigger: {
          trigger: stackRef.current,
          start: 'top 78%',
          once: true,
        },
      },
    );
  }, stackRef);

  const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

  return () => {
    window.cancelAnimationFrame(refreshFrame);
    context.revert();
  };
}, [layout, page, pageSize, isMeasured]); // <-- pageSize + isMeasured added

  const expandStack = () => {
    if (layout !== 'bounce-stack' || !stackRef.current) return;
    if (isExpandedRef.current) return;

    isExpandedRef.current = true;
    const select = gsap.utils.selector(stackRef);
    visibleCards.forEach((_, index) => {
      const card = select(`.bounce-card-${index}`);
      gsap.killTweensOf(card);
      gsap.to(card, {
        transform: getStackTransform(index, true),
        duration: 0.4,
        ease: 'back.out(1.4)',
        overwrite: 'auto',
      });
    });
  };

  const resetStack = () => {
    if (layout !== 'bounce-stack' || !stackRef.current) return;
    if (!isExpandedRef.current) return;

    isExpandedRef.current = false;
    const select = gsap.utils.selector(stackRef);
    visibleCards.forEach((_, index) => {
      const card = select(`.bounce-card-${index}`);
      gsap.killTweensOf(card);
      gsap.to(card, {
        transform: getStackTransform(index, false),
        duration: 0.4,
        ease: 'back.out(1.4)',
        overwrite: 'auto',
      });
    });
  };

  return (
    <div className="relative">
      {title && <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>}

      {layout === 'bounce-stack' ? (
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            onClick={goLeft}
            disabled={!canGoLeft}
            className={`inline-flex shrink-0 rounded-full bg-white p-1.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 sm:p-2.5 ${
              canGoLeft
                ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
                : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
            }`}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <div ref={containerRef} className="col-span-1 min-w-0">
            <div
              ref={stackRef}
              className="relative mx-auto w-full touch-pan-y"
              style={{ height: STACK_CARD_HEIGHT }}
              onMouseLeave={resetStack}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {visibleCards.map((card, index) => (
                <div
                  key={`${page}-${index}`}
                  className={`bounce-card bounce-card-${index} absolute left-1/2 top-0 h-full`}
                  style={{
                    transform: `${getStackTransform(index, false)} translateY(${visibleCards.length === 3 && index !== 1 ? -20 : 0}px)`,
                    width: stackCardWidth,
                    zIndex: index + 1,
                  }}
                  onMouseEnter={expandStack}
                >
                  {card}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Next page"
            onClick={goRight}
            disabled={!canGoRight}
            className={`inline-flex shrink-0 rounded-full bg-white p-1.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 sm:p-2.5 ${
              canGoRight
                ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
                : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
            }`}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous page"
            onClick={goLeft}
            disabled={!canGoLeft}
            className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
              canGoLeft
                ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
                : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
            <div className="flex justify-center gap-5">
              {visibleCards.map((card, index) => (
                <div key={`${page}-${index}`} className="w-full max-w-[300px] shrink-0">
                  {card}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Next page"
            onClick={goRight}
            disabled={!canGoRight}
            className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
              canGoRight
                ? 'text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white'
                : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}