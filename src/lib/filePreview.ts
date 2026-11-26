export type PreviewKind = 'pdf' | 'image';

/** Microsoft's free web viewer for Office files. It downloads the file itself, so it needs a link that works without a session. */
export const OFFICE_VIEWER_ORIGIN = 'https://view.officeapps.live.com';

/** PowerPoint slides: the browser cannot show them, but a saved idea deck can open in the Office viewer. */
export function isPowerPoint(name: string | undefined): boolean {
  return /\.pptx?$/i.test(name || '');
}

export function officeViewerUrl(fileUrl: string): string {
  return `${OFFICE_VIEWER_ORIGIN}/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

const PDF_TYPE = 'application/pdf';

/** What the browser can show for a file: PDFs and images. Anything else (PowerPoint, Word...) is download-only. */
export function previewKindOf(type: string | undefined, name: string | undefined): PreviewKind | null {
  const mime = (type || '').toLowerCase();
  const lower = (name || '').toLowerCase();
  if (mime === PDF_TYPE || lower.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') && mime !== 'image/svg+xml') return 'image';
  if (!mime && /\.(png|jpe?g|webp|gif)$/.test(lower)) return 'image';
  return null;
}
