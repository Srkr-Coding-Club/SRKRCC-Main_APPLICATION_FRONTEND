export type PreviewKind = 'pdf' | 'image';

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
