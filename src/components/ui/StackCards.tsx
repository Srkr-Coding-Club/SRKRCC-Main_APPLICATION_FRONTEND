'use client';

import { useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface DetailsStackItem {
  id: string | number;
  content: ReactNode;
}

export default function DetailsStack({
  items,
  initialItemId,
}: {
  items: DetailsStackItem[];
  initialItemId: string | number;
}) {
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === initialItemId));
  const [stack, setStack] = useState(() => [
    ...items.filter((_, index) => index !== initialIndex).map((item) => item.id),
    items[initialIndex]?.id,
  ].filter((id): id is string | number => id !== undefined));
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const sendTopToBack = () => {
    setStack((current) =>
      current.length < 2 ? current : [current[current.length - 1], ...current.slice(0, -1)],
    );
  };

  const bringBottomToTop = () => {
    setStack((current) =>
      current.length < 2 ? current : [...current.slice(1), current[0]],
    );
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || stack.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 65 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    event.preventDefault();
    // Same behavior as the arrow buttons: reorder instantly, cards spring into place
    if (deltaX < 0) sendTopToBack();
    else bringBottomToTop();
  };

  if (stack.length === 0) return null;
  const topItemId = stack[stack.length - 1];

  return (
    <div
      data-details-stack
      className="relative mx-auto grid w-full max-w-[480px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:max-w-[720px] lg:gap-3"
    >
      <button
        type="button"
        aria-label="Previous card"
        onClick={bringBottomToTop}
        disabled={stack.length < 2}
        className="hidden shrink-0 rounded-full bg-white p-2.5 text-slate-700 shadow-lg transition hover:scale-110 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-white sm:inline-flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        className="col-start-2 row-start-1 grid w-full min-w-0 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {stack.map((itemId, index) => {
          const item = items.find((candidate) => candidate.id === itemId);
          if (!item) return null;
          const isTop = itemId === topItemId;
          const depth = stack.length - index - 1;

          return (
            <motion.div
              key={itemId}
              className="col-start-1 row-start-1 min-w-0"
              aria-hidden={!isTop}
              inert={!isTop}
              initial={false}
              animate={{
                rotateZ: depth * 1.5,
                scale: 1 - depth * 0.03,
                y: depth * -10,
                opacity: depth > 2 ? 0 : 1,
              }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ zIndex: index + 1, transformOrigin: '90% 90%' }}
            >
              {item.content}
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next card"
        onClick={sendTopToBack}
        disabled={stack.length < 2}
        className="hidden shrink-0 rounded-full bg-white p-2.5 text-slate-700 shadow-lg transition hover:scale-110 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-white sm:inline-flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}