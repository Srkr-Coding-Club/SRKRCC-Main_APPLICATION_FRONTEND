import type { BannerCrop } from '@/lib/bannerCrop';
import { bannerCropStyle } from '@/lib/bannerCrop';

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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={onError}
      onLoad={(event) => onLoad?.({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      className={`h-full w-full select-none object-cover ${className}`}
      style={bannerCropStyle(crop)}
    />
  );
}
