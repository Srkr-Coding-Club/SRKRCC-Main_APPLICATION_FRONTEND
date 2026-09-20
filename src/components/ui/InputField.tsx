'use client';

/**
 * Plain form-field primitives. Same exported API as before
 * (SpotlightInput / SpotlightTextarea / SpotlightSelect / FieldLabel /
 * BottomGradient) so callers don't change — but no mouse-tracking spotlight,
 * no motion, no glow. Just a labelled input that looks like a form.
 */

import React from 'react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const fieldBaseClass =
  'block w-full rounded-md border bg-white dark:bg-[#0D0E15] px-3 py-2 text-sm ' +
  'text-[#1A1A2E] dark:text-white border-slate-300 dark:border-slate-700 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:border-[#FF7A00] focus:ring-1 focus:ring-[#FF7A00] ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const errorClass = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500';

export const SpotlightInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(({ className, hasError, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'h-10', hasError && errorClass, className)}
    {...props}
  />
));
SpotlightInput.displayName = 'SpotlightInput';

export const SpotlightTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'resize-y', hasError && errorClass, className)}
    {...props}
  />
));
SpotlightTextarea.displayName = 'SpotlightTextarea';

export const SpotlightSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }
>(({ className, hasError, children, 'aria-invalid': ariaInvalid, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={ariaInvalid ?? hasError ?? undefined}
    className={cn(fieldBaseClass, 'h-10', hasError && errorClass, className)}
    {...props}
  >
    {children}
  </select>
));
SpotlightSelect.displayName = 'SpotlightSelect';

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
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-[#1A1A2E] dark:text-white">
      {children}
      {required && (
        <>
          <span className="text-rose-500" aria-hidden="true"> *</span>
          <span className="sr-only">(required)</span>
        </>
      )}
    </label>
  );
}

/** No-op kept for API compatibility (used to render a hover glow line). */
export function BottomGradient() {
  return null;
}
