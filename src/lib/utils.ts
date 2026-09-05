import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Some legacy form image_url records have an erroneous "https://" prefix
 * concatenated onto what is actually a data: URI (e.g. from an older upload
 * path), which makes the string an invalid, unloadable URL. Strips it back
 * to a valid data URI; passes through any normal http(s) URL unchanged.
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\/data:/i.test(trimmed) ? trimmed.replace(/^https?:\/\//i, "") : trimmed;
}
