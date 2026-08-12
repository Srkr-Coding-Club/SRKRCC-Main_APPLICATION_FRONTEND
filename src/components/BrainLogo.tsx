'use client';

import React from 'react';
import Image from 'next/image';

interface BrainLogoProps {
  className?: string;
  size?: number;
  showRays?: boolean;
  animated?: boolean;
}

export default function BrainLogo({
  className = '',
  size = 48,
  showRays = true,
  animated = true,
}: BrainLogoProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Radiating Rays / Glow Layer */}
      {showRays && (
        <div
          className={`absolute rounded-full bg-gradient-to-r from-[#FF7A00]/30 to-[#8B2E3B]/20 blur-md pointer-events-none ${
            animated ? 'animate-pulse-ray' : ''
          }`}
          style={{ width: size * 1.5, height: size * 1.5 }}
          aria-hidden="true"
        />
      )}

      {/* Official logonobg Image */}
      <img
        src="/logonobg.png"
        alt="SRKR Coding Club Logo"
        width={size}
        height={size}
        className="relative z-10 object-contain h-auto"
        style={{ width: `${size}px` }}
      />
    </div>
  );
}

