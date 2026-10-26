'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { hackathonApi } from '@/lib/api/hackathons';
import { sendToStorage } from '@/lib/fileUpload';
import { isGoogleDriveUrl, isUnsplashPageUrl, normalizeImageUrl } from '@/lib/imageUrl';
import { useToast } from '@/context/ToastContext';
import { INPUT, LABEL } from './shared';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  slug?: string | null;
  aspectHint?: string;
  isSquare?: boolean;
  error?: string;
  id?: string;
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      return resolve({ width: 0, height: 0 });
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
};

export function ImageUploadField({
  label,
  value,
  onChange,
  slug,
  aspectHint,
  isSquare = false,
  error,
  id,
}: ImageUploadFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedDetails, setUploadedDetails] = useState<{
    name?: string;
    size?: number;
    width?: number | null;
    height?: number | null;
  } | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', 'Please choose an image under 10 MB.');
      return;
    }

    // Validate format
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast.error('Unsupported image', 'Please upload a PNG, JPG, WebP, or SVG image.');
      return;
    }

    setUploading(true);
    try {
      const dimensions = await getImageDimensions(file);
      const presigned = await hackathonApi.admin.getAssetUploadPresigned({
        filename: file.name,
        content_type: file.type,
        size: file.size,
        slug,
      });

      if (presigned.mode === 's3' && presigned.post && presigned.public_url) {
        await sendToStorage(
          {
            upload: { id: presigned.key || '' },
            post: presigned.post,
            max_bytes: presigned.max_bytes || 10 * 1024 * 1024,
          },
          file,
          () => { },
        );
        onChange(presigned.public_url);
        setUploadedDetails({
          name: file.name,
          size: file.size,
          width: dimensions.width || null,
          height: dimensions.height || null,
        });
        toast.success('Image Uploaded to S3', `${file.name} uploaded successfully.`);
      } else {
        // Local disk fallback
        const res = await hackathonApi.admin.uploadAsset(slug, file);
        onChange(res.url);
        setUploadedDetails({
          name: res.name,
          size: res.size,
          width: res.width,
          height: res.height,
        });
        toast.success('Image Uploaded', `${res.name} uploaded successfully.`);
      }
    } catch (err: any) {
      toast.error('Upload failed', err?.message || 'Could not upload image. Please try again or use a URL.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className={`${LABEL} mb-0`} htmlFor={id}>
          {label}
        </label>
        {/* Toggle between Upload File and Image URL */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${mode === 'upload'
                ? 'bg-journey-accent text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <UploadCloud className="h-3 w-3" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${mode === 'url'
                ? 'bg-journey-accent text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <LinkIcon className="h-3 w-3" />
            Paste URL
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${dragOver
                ? 'border-journey-accent bg-journey-accent/5'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-white/[0.02] dark:hover:border-slate-700'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="h-7 w-7 animate-spin text-journey-accent" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Uploading to secure media storage...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="rounded-full bg-slate-200/80 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <UploadCloud className="h-5 w-5 text-journey-accent" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Click to choose image or drag & drop here
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  PNG, JPG, WebP, SVG · up to 10 MB {aspectHint ? `· ${aspectHint}` : ''}
                </p>
              </div>
            )}
          </div>

          {/* Uploaded File Details / Status */}
          {value && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 overflow-hidden">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  {uploadedDetails?.name || value.split('/').pop() || 'Uploaded image'}
                </span>
                {uploadedDetails?.size && (
                  <span className="text-[11px] text-slate-500">({formatBytes(uploadedDetails.size)})</span>
                )}
                {uploadedDetails?.width && uploadedDetails?.height && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {uploadedDetails.width} × {uploadedDetails.height} px
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  setUploadedDetails(null);
                }}
                className="inline-flex items-center gap-1 rounded p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                title="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* URL Input Mode */
        <div className="space-y-1">
          <input
            id={id}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              const normalized = normalizeImageUrl(value);
              if (normalized && normalized !== value.trim()) {
                onChange(normalized);
              }
            }}
            placeholder="https://..."
            className={INPUT}
          />
          {isGoogleDriveUrl(value) && (
            <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">
              ℹ️ Google Drive link detected. Converted to direct image format. Ensure sharing is set to &ldquo;Anyone with the link&rdquo; (Viewer).
            </p>
          )}
          {isUnsplashPageUrl(value) && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              ⚠️ Unsplash page URL detected. Right-click the photo on Unsplash and choose &ldquo;Copy Image Address&rdquo; (starts with https://images.unsplash.com/...).
            </p>
          )}
        </div>
      )}

      {/* Square logo preview (if requested and present) */}
      {isSquare && value && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalizeImageUrl(value)}
            alt="Logo Preview"
            className="h-14 w-14 rounded-lg object-contain border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950"
            referrerPolicy="no-referrer"
          />
          <div className="text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Logo Preview (1:1)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Shown next to the title on the public page</p>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
