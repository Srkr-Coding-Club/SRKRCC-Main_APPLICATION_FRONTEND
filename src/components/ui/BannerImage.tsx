'use client';

import { useState } from 'react';
import type { BannerCrop } from '@/lib/bannerCrop';
import { bannerCropStyle } from '@/lib/bannerCrop';
import { getGoogleDriveFallbackUrl, normalizeImageUrl } from '@/lib/imageUrl';

interface BannerImageProps {
  src: string;
  alt: string;
  crop?: Partial<BannerCrop> | null;
  className?: string;
  onError?: () => void;
  onLoad?: (size: { width: number; height: number }) => void;
}

/** A banner that fills its (overflow-hidden) parent and honours the admin-chosen crop. */
export default function BannerImage({ src, alt, crop, className = '', onError, onLoad }: BannerImageProps) {
  const normalizedSrc = normalizeImageUrl(src);
  const fallbackSrc = getGoogleDriveFallbackUrl(src);
  const [usingFallback, setUsingFallback] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);

  if (src !== lastSrc) {
    setLastSrc(src);
    setUsingFallback(false);
  }

  const activeSrc = usingFallback && fallbackSrc ? fallbackSrc : normalizedSrc;

  const handleError = () => {
    if (!usingFallback && fallbackSrc && fallbackSrc !== activeSrc) {
      setUsingFallback(true);
      return;
    }
    onError?.();
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeSrc}
      alt={alt}
      draggable={false}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={(event) => onLoad?.({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      className={`h-full w-full select-none object-cover ${className}`}
      style={bannerCropStyle(crop)}
    />
  );
}
