'use client';

import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignEndVertical,
  Eye,
  Image as ImageIcon,
  ImageOff,
  Maximize2,
  Move,
  RotateCcw,
} from 'lucide-react';
import BannerImage from '@/components/ui/BannerImage';
import {
  BANNER_ZOOM_MAX,
  BANNER_ZOOM_MIN,
  DEFAULT_BANNER_CROP,
  isDefaultBannerCrop,
  normalizeBannerCrop,
  type BannerCrop,
} from '@/lib/bannerCrop';
import { isGoogleDriveUrl, isUnsplashPageUrl, normalizeImageUrl } from '@/lib/imageUrl';
import { BTN_GHOST, LABEL } from './shared';

interface BannerCropEditorProps {
  imageUrl: string;
  value: BannerCrop;
  onChange: (crop: BannerCrop) => void;
  fileInfo?: { name?: string; size?: number } | null;
}

const KEYBOARD_STEP = 2;
/** Fraction of the frame a drag must cover to sweep the whole range when the image has no spare edge to pan over. */
const MIN_PAN_SPAN = 0.4;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: BannerCrop;
}

/**
 * Enhanced Banner Crop & Framing Editor:
 * - Detects natural width & height and aspect ratio
 * - Toggles between '16:6 Framing Preview' (public header view) and 'Full Image View' (complete uncropped image)
 * - Quick alignment presets (Center, Top, Bottom, Left, Right)
 * - Drag-to-reposition and zoom controls with precision sliders
 */
export function BannerCropEditor({ imageUrl, value, onChange, fileInfo }: BannerCropEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const crop = normalizeBannerCrop(value);
  const currentMode = crop.mode ?? 'crop';
  const normalized = normalizeImageUrl(imageUrl);
  const failed = failedUrl === imageUrl;

  const update = (patch: Partial<BannerCrop>) => onChange(normalizeBannerCrop({ ...crop, ...patch }));

  /** Pixels of drag that sweep one axis of the crop range from 0 to 100%. */
  const panSpan = (frame: number, imageExtent: number) =>
    Math.max(imageExtent - frame, frame * (crop.zoom - 1), frame * MIN_PAN_SPAN);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed || currentMode === 'full') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: crop };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !frame) return;
    const { width, height } = frame.getBoundingClientRect();
    const scale = naturalSize ? Math.max(width / naturalSize.width, height / naturalSize.height) : 1;
    const imageWidth = naturalSize ? naturalSize.width * scale : width;
    const imageHeight = naturalSize ? naturalSize.height * scale : height;
    onChange(
      normalizeBannerCrop({
        ...drag.origin,
        x: drag.origin.x - ((event.clientX - drag.startX) / panSpan(width, imageWidth)) * 100,
        y: drag.origin.y - ((event.clientY - drag.startY) / panSpan(height, imageHeight)) * 100,
      }),
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (currentMode === 'full') return;
    const moves: Record<string, Partial<BannerCrop>> = {
      ArrowLeft: { x: crop.x + KEYBOARD_STEP },
      ArrowRight: { x: crop.x - KEYBOARD_STEP },
      ArrowUp: { y: crop.y + KEYBOARD_STEP },
      ArrowDown: { y: crop.y - KEYBOARD_STEP },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    update(move);
  };

  // Calculate aspect ratio string
  const getAspectRatioStr = () => {
    if (!naturalSize) return '';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(naturalSize.width, naturalSize.height);
    const rW = Math.round(naturalSize.width / divisor);
    const rH = Math.round(naturalSize.height / divisor);
    // If standard ratio
    if ((rW === 16 && rH === 9) || (rW === 4 && rH === 3) || (rW === 1 && rH === 1) || (rW === 16 && rH === 6)) {
      return `${rW}:${rH}`;
    }
    const ratio = (naturalSize.width / naturalSize.height).toFixed(2);
    return `${ratio}:1`;
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className={`${LABEL} mb-0`}>Banner Framing & Crop Editor</p>
          {naturalSize && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ImageIcon className="h-3 w-3 text-journey-accent" />
              {naturalSize.width} × {naturalSize.height} px
              <span className="text-slate-400 dark:text-slate-500">({getAspectRatioStr()})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher: 16:6 Framing vs Full Image */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => update({ mode: 'crop' })}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                currentMode === 'crop'
                  ? 'bg-journey-accent text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Crop banner into a 16:6 header strip"
            >
              <Eye className="h-3.5 w-3.5" />
              16:6 Preview
            </button>
            <button
              type="button"
              onClick={() => update({ mode: 'full' })}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                currentMode === 'full'
                  ? 'bg-journey-accent text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Display complete uncropped poster on the hackathon page"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Full Image
            </button>
          </div>

          <button
            type="button"
            onClick={() => onChange(DEFAULT_BANNER_CROP)}
            disabled={isDefaultBannerCrop(crop)}
            className={BTN_GHOST}
            title="Reset crop to center (50% / 50% / 1x)"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      {currentMode === 'crop' ? (
        <div
          ref={frameRef}
          role="group"
          tabIndex={failed ? -1 : 0}
          aria-label="Banner preview. Drag, or use the arrow keys, to choose what stays visible."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          className={`relative aspect-[16/6] w-full touch-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] dark:border-slate-800 dark:bg-white/5 ${
            failed ? '' : dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {failed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <ImageOff className="h-6 w-6 text-rose-500/80" aria-hidden="true" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Could not load image{isGoogleDriveUrl(imageUrl) ? ' from Google Drive' : isUnsplashPageUrl(imageUrl) ? ' from Unsplash' : ''}.
              </span>
              {isGoogleDriveUrl(imageUrl) ? (
                <span className="max-w-md text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                  In Google Drive, click <strong>Share</strong> and set General Access to <strong>&ldquo;Anyone with the link&rdquo;</strong> (Viewer). If set to &ldquo;Restricted&rdquo;, Google blocks external access.
                </span>
              ) : isUnsplashPageUrl(imageUrl) ? (
                <span className="max-w-md text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                  You entered an Unsplash page link instead of the direct image. Right-click the photo on Unsplash and choose <strong>&ldquo;Copy Image Address&rdquo;</strong> (starts with <code>https://images.unsplash.com/...</code>).
                </span>
              ) : (
                <span>Check that the URL is public, points straight to an image file, and allows embedding.</span>
              )}
              <button
                type="button"
                onClick={() => setFailedUrl(null)}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3 w-3" /> Retry Loading
              </button>
            </div>
          ) : (
            <>
              <BannerImage
                key={normalized}
                src={normalized}
                alt="Banner preview"
                crop={crop}
                onLoad={(size) => {
                  setNaturalSize(size);
                  setFailedUrl(null);
                }}
                onError={() => setFailedUrl(imageUrl)}
              />
              <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white shadow backdrop-blur-sm">
                <Move className="h-3 w-3" aria-hidden="true" /> Drag to reposition
              </span>
              <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-sm">
                16:6 Header Aspect Ratio
              </span>
            </>
          )}
        </div>
      ) : (
        /* Full Image View: Shows the full image fitted inside a dark canvas */
        <div className="relative flex max-h-80 min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900 p-2 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized}
            alt="Full original banner"
            className="max-h-72 w-auto max-w-full rounded-lg object-contain shadow-lg"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
              setFailedUrl(null);
            }}
            onError={() => setFailedUrl(imageUrl)}
          />
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white shadow backdrop-blur-sm">
            <span>Full Image Display</span>
            {naturalSize && <span>• {naturalSize.width} × {naturalSize.height} px</span>}
          </div>
        </div>
      )}

      {currentMode === 'full' ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
          <p className="font-semibold">Full Image Mode Active</p>
          <p className="mt-0.5 text-[11px] text-emerald-700/90 dark:text-emerald-400">
            The complete original poster will be displayed on the public hackathon page without cropping.
          </p>
        </div>
      ) : (
        <>
          {/* Alignment Presets Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Quick Alignment:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => update({ x: 50, y: 50 })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Center focal point"
              >
                <AlignCenter className="h-3 w-3 text-journey-accent" /> Center
              </button>
              <button
                type="button"
                onClick={() => update({ y: 0 })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Align to top edge"
              >
                <AlignStartVertical className="h-3 w-3" /> Top
              </button>
              <button
                type="button"
                onClick={() => update({ y: 100 })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Align to bottom edge"
              >
                <AlignEndVertical className="h-3 w-3" /> Bottom
              </button>
              <button
                type="button"
                onClick={() => update({ x: 0 })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Align to left edge"
              >
                <AlignStartHorizontal className="h-3 w-3" /> Left
              </button>
              <button
                type="button"
                onClick={() => update({ x: 100 })}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Align to right edge"
              >
                <AlignEndHorizontal className="h-3 w-3" /> Right
              </button>
            </div>
          </div>

          {/* Precision Sliders */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
            <CropSlider
              label="Horizontal (X)"
              value={crop.x}
              min={0}
              max={100}
              step={1}
              unit="%"
              disabled={failed}
              onChange={(x) => update({ x })}
            />
            <CropSlider
              label="Vertical (Y)"
              value={crop.y}
              min={0}
              max={100}
              step={1}
              unit="%"
              disabled={failed}
              onChange={(y) => update({ y })}
            />
            <CropSlider
              label="Zoom Level"
              value={crop.zoom}
              min={BANNER_ZOOM_MIN}
              max={BANNER_ZOOM_MAX}
              step={0.05}
              unit="×"
              disabled={failed}
              onChange={(zoom) => update({ zoom })}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface CropSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled: boolean;
  onChange: (value: number) => void;
}

function CropSlider({ label, value, min, max, step, unit, disabled, onChange }: CropSliderProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-slate-900 dark:text-white">
          {Math.round(value * 100) / 100}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-journey-accent disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700"
      />
    </div>
  );
}
