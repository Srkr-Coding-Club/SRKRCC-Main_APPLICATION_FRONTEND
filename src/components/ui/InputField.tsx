'use client';

/**
 * Aceternity "signup-form" style primitives, recreated for this project's theme.
 * Source of the original pattern: https://ui.aceternity.com/components/signup-form
 *
 * Two ingredients from that component are reproduced here:
 *  1. A radial "spotlight" that follows the mouse over the input's container
 *     (implemented with framer-motion's useMotionValue/useMotionTemplate).
 *  2. A `BottomGradient` glow that fades in under a button on hover.
 *
 * Requires: `npm install framer-motion`
 * (If your project already has `motion` installed instead, swap the import
 * below to `from "motion/react"` — same API.)
 */

import React, { useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SPOTLIGHT_RADIUS = 140;
// Orange spotlight instead of Aceternity's default blue.
const SPOTLIGHT_COLOR = 'rgba(255, 122, 0, 0.5)';

/** Shared classNames so every field type (input/textarea/select) looks identical. */
const fieldBaseClass =
  'flex w-full rounded-md border-none bg-[#FAFAFC] dark:bg-[#0D0E15] px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white ' +
  'shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] ' +
  'dark:shadow-[0px_0px_1px_1px_rgba(255,255,255,0.08)] ' +
  'transition duration-300 group-hover/input:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/60 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Wraps any field (input/textarea/select) in the mouse-tracking spotlight
 * container. This is the direct equivalent of Aceternity's `input.tsx`
 * `motion.div` wrapper, just generalized to hold any child field.
 */
function SpotlightWrapper({
  children,
  className,
  hasError,
}: {
  children: React.ReactNode;
  className?: string;
  hasError?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <motion.div
      style={{
        background: useMotionTemplate`
          radial-gradient(
            ${visible ? `${SPOTLIGHT_RADIUS}px` : '0px'} circle at ${mouseX}px ${mouseY}px,
            ${SPOTLIGHT_COLOR},
            transparent 80%
          )
        `,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className={cn(
        'group/input rounded-lg p-[1.5px] transition duration-300',
        hasError && 'ring-1 ring-rose-500 rounded-lg',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export const SpotlightInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <SpotlightWrapper hasError={hasError}>
    <input ref={ref} className={cn(fieldBaseClass, 'h-11', className)} {...props} />
  </SpotlightWrapper>
));
SpotlightInput.displayName = 'SpotlightInput';

export const SpotlightTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <SpotlightWrapper hasError={hasError}>
    <textarea ref={ref} className={cn(fieldBaseClass, 'resize-none', className)} {...props} />
  </SpotlightWrapper>
));
SpotlightTextarea.displayName = 'SpotlightTextarea';

export const SpotlightSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }
>(({ className, hasError, children, ...props }, ref) => (
  <SpotlightWrapper hasError={hasError}>
    <select ref={ref} className={cn(fieldBaseClass, 'h-11 appearance-none', className)} {...props}>
      {children}
    </select>
  </SpotlightWrapper>
));
SpotlightSelect.displayName = 'SpotlightSelect';

/** Static field label, matched to Aceternity's label.tsx weight/size. */
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-bold text-[#1A1A2E] dark:text-white"
    >
      {children} {required && <span className="text-[#8B2E3B] dark:text-rose-400">*</span>}
    </label>
  );
}

/**
 * The glowing underline that fades in under a button on hover — lifted
 * directly from Aceternity's `BottomGradient`, recolored to the orange theme.
 * Parent button needs `group/btn relative` in its className.
 */
export function BottomGradient() {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-[#FF7A00] to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-[#FFB066] to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
}