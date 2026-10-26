import { describe, expect, it } from 'vitest';
import {
  getGoogleDriveFallbackUrl,
  getGoogleDriveFileId,
  isGoogleDriveUrl,
  isUnsplashPageUrl,
  normalizeImageUrl,
} from '../imageUrl';

describe('imageUrl utility', () => {
  describe('getGoogleDriveFileId & isGoogleDriveUrl', () => {
    it('detects and extracts file ID from standard /file/d/ URLs', () => {
      const url = 'https://drive.google.com/file/d/13P3gwdVKZ29hqByYw2TestId123/view?usp=sharing';
      expect(isGoogleDriveUrl(url)).toBe(true);
      expect(getGoogleDriveFileId(url)).toBe('13P3gwdVKZ29hqByYw2TestId123');
    });

    it('extracts ID from open?id= URLs', () => {
      const url = 'https://drive.google.com/open?id=13P3gwdVKZ29hqByYw2TestId123';
      expect(isGoogleDriveUrl(url)).toBe(true);
      expect(getGoogleDriveFileId(url)).toBe('13P3gwdVKZ29hqByYw2TestId123');
    });

    it('extracts ID from uc?id= URLs', () => {
      const url = 'https://drive.google.com/uc?export=view&id=13P3gwdVKZ29hqByYw2TestId123';
      expect(isGoogleDriveUrl(url)).toBe(true);
      expect(getGoogleDriveFileId(url)).toBe('13P3gwdVKZ29hqByYw2TestId123');
    });

    it('returns false/null for non-Google Drive URLs', () => {
      const url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c';
      expect(isGoogleDriveUrl(url)).toBe(false);
      expect(getGoogleDriveFileId(url)).toBeNull();
    });
  });

  describe('isUnsplashPageUrl', () => {
    it('detects Unsplash photo page links', () => {
      expect(isUnsplashPageUrl('https://unsplash.com/photos/a-laptop-on-a-desk-7BjmDICVloE')).toBe(true);
      expect(isUnsplashPageUrl('https://unsplash.com/photos/7BjmDICVloE')).toBe(true);
    });

    it('returns false for direct Unsplash image links and other URLs', () => {
      expect(isUnsplashPageUrl('https://images.unsplash.com/photo-1555066931-4365d14bab8c')).toBe(false);
      expect(isUnsplashPageUrl('https://plus.unsplash.com/premium_photo-1681487762234-a0c5c3275751')).toBe(false);
      expect(isUnsplashPageUrl('')).toBe(false);
      expect(isUnsplashPageUrl(null)).toBe(false);
    });
  });

  describe('normalizeImageUrl', () => {
    it('converts Google Drive share link into direct CDN image URL', () => {
      const shareUrl = 'https://drive.google.com/file/d/13P3gwdVKZ29hqByYw2TestId123/view?usp=sharing';
      expect(normalizeImageUrl(shareUrl)).toBe(
        'https://lh3.googleusercontent.com/d/13P3gwdVKZ29hqByYw2TestId123',
      );
    });

    it('converts Dropbox share links by setting raw=1', () => {
      const dbUrl = 'https://www.dropbox.com/s/xyz123/banner.jpg?dl=0';
      const normalized = normalizeImageUrl(dbUrl);
      expect(normalized).toContain('raw=1');
      expect(normalized).not.toContain('dl=0');
    });

    it('preserves direct image URLs untouched (e.g. Unsplash)', () => {
      const unsplashUrl =
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200';
      expect(normalizeImageUrl(unsplashUrl)).toBe(unsplashUrl);
    });

    it('handles empty and null values safely', () => {
      expect(normalizeImageUrl('')).toBe('');
      expect(normalizeImageUrl(null)).toBe('');
      expect(normalizeImageUrl(undefined)).toBe('');
    });
  });

  describe('getGoogleDriveFallbackUrl', () => {
    it('generates a thumbnail fallback URL for Google Drive files', () => {
      const url = 'https://drive.google.com/file/d/abc123xyz/view';
      expect(getGoogleDriveFallbackUrl(url)).toBe(
        'https://drive.google.com/thumbnail?id=abc123xyz&sz=w2000',
      );
    });
  });
});
