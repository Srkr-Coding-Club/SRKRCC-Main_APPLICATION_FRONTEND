'use client';

import { useRef, useEffect, MouseEvent, ReactNode } from 'react';
import gsap from 'gsap';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string; // base hue, e.g. '#FF7A00' — SpotlightCard builds the alpha stops itself
  onEnter?: () => void;
  onLeave?: () => void;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = '#FF7A00',
  onEnter,
  onLeave,
}: SpotlightCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, w: 1, h: 1 });

  useEffect(() => {
    if (rootRef.current) {
      gsap.set(rootRef.current, { transformPerspective: 900 });
    }
  }, []);

  const applyTilt = () => {
    frameRef.current = null;
    const root = rootRef.current;
    if (!root) return;
    const { x, y, w, h } = pointerRef.current;
    const px = x / w - 0.5;
    const py = y / h - 0.5;

    gsap.to(root, { rotateY: px * 10, rotateX: -py * 10, duration: 0.6, ease: 'power2.out' });

    if (glowRef.current) {
      gsap.to(glowRef.current, { x: px * 60, y: py * 60, duration: 0.8, ease: 'power2.out' });
    }

    root.style.setProperty('--mouse-x', `${x}px`);
    root.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(applyTilt);
  };

  const handleEnter = () => onEnter?.();

  const handleLeave = () => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (rootRef.current) {
      gsap.to(rootRef.current, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'power3.out' });
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, { x: 0, y: 0, duration: 1, ease: 'power3.out' });
    }
    onLeave?.();
  };

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group relative overflow-hidden rounded-2xl border will-change-transform [backface-visibility:hidden] ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Small, bright, genuinely round spotlight — tight core + soft falloff */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
        background: `radial-gradient(
            220px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            ${hexToRgba(spotlightColor, 0.2)} 0%,
            ${hexToRgba(spotlightColor, 0.06)} 45%,
            transparent 72%
        )`,
        }}
      />
      <div className="relative z-10 h-full w-full" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  );
}