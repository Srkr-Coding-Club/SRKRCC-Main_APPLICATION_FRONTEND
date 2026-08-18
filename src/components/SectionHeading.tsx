import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeadingProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeading({ icon: Icon, eyebrow, title, description, action, className = '' }: SectionHeadingProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
      <div className="space-y-1">
        {eyebrow && (
          <span className="block text-xs font-bold tracking-widest text-[#FF7A00] uppercase">{eyebrow}</span>
        )}
        <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
          {Icon && <Icon className="w-5 h-5 text-[#FF7A00] flex-shrink-0" />}
          <span>{title}</span>
        </h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
