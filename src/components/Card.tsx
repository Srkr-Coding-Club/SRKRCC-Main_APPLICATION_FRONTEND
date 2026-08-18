import React from 'react';

interface CardProps {
  image?: string;
  imageAlt?: string;
  imageHeightClassName?: string;
  topLeftBadge?: React.ReactNode;
  topRightBadges?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function Card({
  image,
  imageAlt = '',
  imageHeightClassName = 'h-48',
  topLeftBadge,
  topRightBadges,
  children,
  footer,
  className = '',
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${className}`}
    >
      <div>
        {image && (
          <div className={`relative w-full overflow-hidden bg-slate-900 ${imageHeightClassName}`}>
            <img
              src={image}
              alt={imageAlt}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
            />
            {topLeftBadge && <div className="absolute top-4 left-4 flex items-center gap-2">{topLeftBadge}</div>}
            {topRightBadges && <div className="absolute top-4 right-4 flex items-center gap-2">{topRightBadges}</div>}
          </div>
        )}

        <div className="p-6 space-y-4">{children}</div>
      </div>

      {footer && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}
