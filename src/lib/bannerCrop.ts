import type { CSSProperties } from 'react';

/** Focal point in percent (0-100) and zoom (1-3). Mirrors Hackathon.banner_crop on the API. */
export interface BannerCrop {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_BANNER_CROP: BannerCrop = { x: 50, y: 50, zoom: 1 };
export const BANNER_ZOOM_MIN = 1;
export const BANNER_ZOOM_MAX = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeBannerCrop(crop?: Partial<BannerCrop> | null): BannerCrop {
  return {
    x: clamp(crop?.x ?? DEFAULT_BANNER_CROP.x, 0, 100),
    y: clamp(crop?.y ?? DEFAULT_BANNER_CROP.y, 0, 100),
    zoom: clamp(crop?.zoom ?? DEFAULT_BANNER_CROP.zoom, BANNER_ZOOM_MIN, BANNER_ZOOM_MAX),
  };
}

export function isDefaultBannerCrop(crop: BannerCrop): boolean {
  return crop.x === DEFAULT_BANNER_CROP.x && crop.y === DEFAULT_BANNER_CROP.y && crop.zoom === DEFAULT_BANNER_CROP.zoom;
}

/** Inline style for an `object-cover` <img> inside an overflow-hidden frame. */
export function bannerCropStyle(crop?: Partial<BannerCrop> | null): CSSProperties {
  const { x, y, zoom } = normalizeBannerCrop(crop);
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
  };
}
