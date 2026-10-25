import { fetchApi } from '@/lib/api-client';

/** A file already sent to storage, as it is kept in the answer. */
export interface UploadedFile {
  upload_id: string;
  name: string;
  size: number;
  type: string;
}

export interface Grant {
  upload: { id: string };
  post: { url: string; fields: Record<string, string> };
  max_bytes: number;
}

export class UploadError extends Error {
  constructor(message: string, readonly code: string, readonly retryable: boolean) {
    super(message);
  }
}

const BYTES_PER_MB = 1024 * 1024;

export const formatSize = (bytes: number): string =>
  bytes >= BYTES_PER_MB ? `${(bytes / BYTES_PER_MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const isImageType = (type: string | undefined, name: string | undefined): boolean =>
  typeof type === 'string' && type ? type.startsWith('image/') && type !== 'image/svg+xml' : /\.(png|jpe?g|gif|webp)$/i.test(name || '');

/** What the browser can check before asking the server: the size limit and the chosen file types. */
export function checkBeforeUpload(file: File, rules: { maxFileSizeMB?: number | string; allowedFileTypes?: string } | undefined, defaultMb: number): string | null {
  const limitMb = Number(rules?.maxFileSizeMB) > 0 ? Number(rules?.maxFileSizeMB) : defaultMb;
  if (file.size > limitMb * BYTES_PER_MB) return `"${file.name}" is ${formatSize(file.size)}. The limit is ${limitMb} MB.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  const allowed = String(rules?.allowedFileTypes || '').split(',').map((e) => e.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (allowed.length && !allowed.includes(ext)) return `"${file.name}" is not an allowed type. Allowed: ${allowed.map((e) => `.${e}`).join(', ')}.`;
  return null;
}

export function asUploadError(error: unknown, fallback: string): UploadError {
  if (error instanceof UploadError) return error;
  const e = error as { message?: string; status?: number; body?: { code?: string } };
  const code = e?.body?.code || 'UPLOAD_FAILED';
  const retryable = !e?.status || e.status >= 500 || e.status === 429 || code === 'UPLOAD_MISSING';
  return new UploadError(e?.message || fallback, code, retryable);
}

export function sendToStorage(grant: Grant, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();
    Object.entries(grant.post.fields).forEach(([name, value]) => form.append(name, value));
    form.append('file', file); // the file part must come last
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) return resolve();
      const tooBig = request.status === 400 && /EntityTooLarge|content-length-range/i.test(request.responseText);
      reject(new UploadError(tooBig ? 'That file is larger than allowed.' : 'The upload was refused. Please try again.', tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_REFUSED', !tooBig && request.status >= 500));
    };
    request.onerror = () => reject(new UploadError('The connection dropped. Check your internet and retry.', 'NETWORK', true));
    request.ontimeout = () => reject(new UploadError('The upload took too long. Please retry.', 'NETWORK', true));
    request.onabort = () => reject(new UploadError('Upload cancelled.', 'CANCELLED', false));
    signal?.addEventListener('abort', () => request.abort(), { once: true });
    request.open('POST', grant.post.url);
    request.send(form);
  });
}

/** Ask for permission, send the file straight to storage, and have the server confirm it. */
export async function uploadFile(
  slug: string,
  fieldId: number,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  let grant: Grant;
  try {
    grant = await fetchApi<Grant>(`/forms/${encodeURIComponent(slug)}/uploads/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, name: file.name, size: file.size, type: file.type }),
    });
  } catch (error) {
    throw asUploadError(error, 'Could not start the upload.');
  }
  try {
    await sendToStorage(grant, file, onProgress, signal);
  } catch (error) {
    await discardUpload(slug, grant.upload.id).catch(() => undefined);
    throw asUploadError(error, 'The upload failed.');
  }
  try {
    const done = await fetchApi<{ upload: { id: string; name: string; size: number; type: string } }>(
      `/forms/${encodeURIComponent(slug)}/uploads/${grant.upload.id}/complete/`,
      { method: 'POST' },
    );
    return { upload_id: done.upload.id, name: done.upload.name, size: done.upload.size, type: done.upload.type };
  } catch (error) {
    throw asUploadError(error, 'We could not confirm the upload.');
  }
}

/** Remove a file that was picked but not submitted. Failing quietly is fine: the server clears abandoned files. */
export async function discardUpload(slug: string, uploadId: string): Promise<void> {
  await fetchApi(`/forms/${encodeURIComponent(slug)}/uploads/${uploadId}/`, { method: 'DELETE' });
}
