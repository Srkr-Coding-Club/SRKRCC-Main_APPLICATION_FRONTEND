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

/**
 * Formats a raw student year number (1, 2, 3, 4, ...) as an ordinal
 * "Nth Year" label (e.g. 1 -> "1st Year", 2 -> "2nd Year", 11 -> "11th Year").
 * Numbers ending in 11-13 always take "th"; otherwise the last digit decides.
 */
export function ordinalYear(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th Year`;
  switch (n % 10) {
    case 1:
      return `${n}st Year`;
    case 2:
      return `${n}nd Year`;
    case 3:
      return `${n}rd Year`;
    default:
      return `${n}th Year`;
  }
}
