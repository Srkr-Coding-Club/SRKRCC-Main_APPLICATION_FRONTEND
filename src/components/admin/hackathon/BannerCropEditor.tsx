'use client';

import React, { useRef, useState } from 'react';
import { ImageOff, Move, RotateCcw } from 'lucide-react';
import BannerImage from '@/components/ui/BannerImage';
import {
  BANNER_ZOOM_MAX,
  BANNER_ZOOM_MIN,
  DEFAULT_BANNER_CROP,
  isDefaultBannerCrop,
  normalizeBannerCrop,
  type BannerCrop,
} from '@/lib/bannerCrop';
import { BTN_GHOST, LABEL } from './shared';

interface BannerCropEditorProps {
  imageUrl: string;
  value: BannerCrop;
  onChange: (crop: BannerCrop) => void;
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

/** Drag-to-reposition and zoom, shown in the same 16:6 frame the public hackathon page uses. */
export function BannerCropEditor({ imageUrl, value, onChange }: BannerCropEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const crop = normalizeBannerCrop(value);
  const failed = failedUrl === imageUrl;

  const update = (patch: Partial<BannerCrop>) => onChange(normalizeBannerCrop({ ...crop, ...patch }));

  /** Pixels of drag that sweep one axis of the crop range from 0 to 100%. */
  const panSpan = (frame: number, imageExtent: number) =>
    Math.max(imageExtent - frame, frame * (crop.zoom - 1), frame * MIN_PAN_SPAN);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (failed) return;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`${LABEL} mb-0`}>Banner framing</p>
        <button type="button" onClick={() => onChange(DEFAULT_BANNER_CROP)} disabled={isDefaultBannerCrop(crop)} className={BTN_GHOST}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

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
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            Could not load this image. Check the URL is public and points straight to an image.
          </div>
        ) : (
          <>
            <BannerImage
              key={imageUrl}
              src={imageUrl}
              alt="Banner preview"
              crop={crop}
              onLoad={setNaturalSize}
              onError={() => setFailedUrl(imageUrl)}
            />
            <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
              <Move className="h-3 w-3" aria-hidden="true" /> Drag to reposition
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CropSlider label="Horizontal" value={crop.x} min={0} max={100} step={1} unit="%" disabled={failed} onChange={(x) => update({ x })} />
        <CropSlider label="Vertical" value={crop.y} min={0} max={100} step={1} unit="%" disabled={failed} onChange={(y) => update({ y })} />
        <CropSlider
          label="Zoom"
          value={crop.zoom}
          min={BANNER_ZOOM_MIN}
          max={BANNER_ZOOM_MAX}
          step={0.05}
          unit="×"
          disabled={failed}
          onChange={(zoom) => update({ zoom })}
        />
      </div>
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
    <label className="block text-xs font-bold text-[#1A1A2E] dark:text-white">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-6 w-full accent-[#FF7A00] disabled:opacity-40"
      />
    </label>
  );
}
