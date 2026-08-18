import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeroProps {
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  className?: string;
}

export default function PageHero({ icon: Icon, eyebrow, title, description, className = '' }: PageHeroProps) {
  return (
    <div
      className={`relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden ${className}`}
    >
      <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
          <Icon className="w-4 h-4 text-[#FF7A00]" />
          <span>{eyebrow}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">{title}</h1>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
