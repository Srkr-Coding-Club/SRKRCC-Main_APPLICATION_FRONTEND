'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface PillButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md';
  icon?: 'arrow' | 'code' | 'none';
  onClick?: () => void;
  className?: string;
}

export default function PillButton({
  href,
  children,
  variant = 'solid',
  size = 'md',
  icon = 'arrow',
  onClick,
  className = '',
}: PillButtonProps) {
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm';

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 ${sizeClasses} ${
        variant === 'solid'
          ? 'text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:shadow-[0_0_28px_rgba(255,122,0,0.45)]'
          : 'text-[#1A1A2E] dark:text-white border border-[#8B2E3B]/40 dark:border-[#FF7A00]/40 hover:border-[#FF7A00] hover:shadow-[0_0_20px_rgba(255,122,0,0.25)]'
      } ${className}`}
    >
      {variant === 'solid' && (
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] -z-10" />
      )}
      <span>{children}</span>
      {icon === 'arrow' && (
        <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
      {icon === 'code' && (
        <span className="font-mono text-xs opacity-70 group-hover:opacity-100 transition-opacity">{'</>'}</span>
      )}
    </Link>
  );
}
