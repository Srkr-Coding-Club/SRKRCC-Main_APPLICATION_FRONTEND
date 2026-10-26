import type { CSSProperties } from 'react';

/** Focal point in percent (0-100), zoom (1-3), and display mode ('crop' | 'full'). Mirrors Hackathon.banner_crop on the API. */
export interface BannerCrop {
  x: number;
  y: number;
  zoom: number;
  mode?: 'crop' | 'full';
}

export const DEFAULT_BANNER_CROP: BannerCrop = { x: 50, y: 50, zoom: 1, mode: 'crop' };
export const BANNER_ZOOM_MIN = 1;
export const BANNER_ZOOM_MAX = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeBannerCrop(crop?: Partial<BannerCrop> | null): BannerCrop {
  return {
    x: clamp(crop?.x ?? DEFAULT_BANNER_CROP.x, 0, 100),
    y: clamp(crop?.y ?? DEFAULT_BANNER_CROP.y, 0, 100),
    zoom: clamp(crop?.zoom ?? DEFAULT_BANNER_CROP.zoom, BANNER_ZOOM_MIN, BANNER_ZOOM_MAX),
    mode: crop?.mode === 'full' ? 'full' : 'crop',
  };
}

export function isDefaultBannerCrop(crop: BannerCrop): boolean {
  return (
    crop.x === DEFAULT_BANNER_CROP.x &&
    crop.y === DEFAULT_BANNER_CROP.y &&
    crop.zoom === DEFAULT_BANNER_CROP.zoom &&
    (crop.mode === undefined || crop.mode === 'crop')
  );
}

/** Inline style for an `object-cover` or `object-contain` <img> inside an overflow-hidden frame. */
export function bannerCropStyle(crop?: Partial<BannerCrop> | null): CSSProperties {
  const { x, y, zoom, mode } = normalizeBannerCrop(crop);
  if (mode === 'full') {
    return {
      objectPosition: 'center',
      objectFit: 'contain',
    };
  }
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    objectFit: 'cover',
  };
}
