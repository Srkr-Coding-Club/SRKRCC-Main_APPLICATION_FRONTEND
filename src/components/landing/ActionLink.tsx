import React from 'react';
import Link from 'next/link';

const VARIANTS = {
  primary:
    'min-h-[52px] rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] px-8 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(255,122,0,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-journey-bg motion-reduce:transition-none',
  text: 'min-h-[44px] rounded-md text-[15px] text-journey-text underline decoration-journey-accent decoration-2 underline-offset-[6px] transition-colors hover:text-journey-accent',
} as const;

/* The journey's two action styles: the brand gradient pill (one per screen at most), and underlined text links for everything else. */
export default function ActionLink({
  href,
  variant = 'text',
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent ${VARIANTS[variant]}`}
    >
      {children}
    </Link>
  );
}
