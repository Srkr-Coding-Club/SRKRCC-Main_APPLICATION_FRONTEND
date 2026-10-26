/**
 * Utility to extract Google Drive file IDs and convert cloud storage share links
 * (Google Drive, Dropbox) into direct, embeddable image URLs.
 */

/**
 * Extracts the file ID from various Google Drive sharing URL formats:
 * - https://drive.google.com/file/d/{id}/view...
 * - https://drive.google.com/file/d/{id}
 * - https://drive.google.com/open?id={id}
 * - https://drive.google.com/uc?id={id}...
 * - https://docs.google.com/file/d/{id}...
 * - https://lh3.googleusercontent.com/d/{id}
 */
export function getGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const fileDMatch = trimmed.match(/(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  const paramMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i);
  if (paramMatch && paramMatch[1]) return paramMatch[1];

  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  return null;
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(?:drive|docs)\.google\.com|lh3\.googleusercontent\.com\/d\//i.test(url);
}

export function isUnsplashPageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(?:https?:\/\/)?(?:www\.)?unsplash\.com\/photos\//i.test(url.trim());
}

/**
 * Converts a share link into a direct raw image URL that browsers can render inside an <img> tag.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Google Drive: Convert web viewer URL to direct Google UserContent CDN URL
  const driveId = getGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // Dropbox: Convert preview page to direct binary by setting raw=1
  if (/(?:https?:\/\/)?(?:www\.)?dropbox\.com\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      parsed.searchParams.set('raw', '1');
      parsed.searchParams.delete('dl');
      return parsed.toString();
    } catch {
      return trimmed.replace(/[?&]dl=0/, '').concat(trimmed.includes('?') ? '&raw=1' : '?raw=1');
    }
  }

  return trimmed;
}

/**
 * Returns alternative fallback direct URL for Google Drive images if lh3 fails.
 */
export function getGoogleDriveFallbackUrl(url: string | null | undefined): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
}
