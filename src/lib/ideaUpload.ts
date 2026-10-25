import { hackathonApi } from '@/lib/api/hackathons';
import { asUploadError, sendToStorage, type UploadedFile } from '@/lib/fileUpload';
import type { IdeaFileKind } from '@/lib/types';

/** What the picker allows for each kind of idea file. The server checks the same rules again. */
export const IDEA_FILE_RULES: Record<IdeaFileKind, { allowedFileTypes: string; maxFileSizeMB: number; label: string }> = {
  DECK: { allowedFileTypes: '.ppt,.pptx', maxFileSizeMB: 25, label: 'slides' },
  PAYMENT: { allowedFileTypes: '.png,.jpg,.jpeg,.webp', maxFileSizeMB: 5, label: 'payment screenshot' },
};

/** Ask for permission, send the file straight to storage, and have the server confirm it. The result is kept as the idea's file. */
export async function uploadIdeaFile(
  slug: string,
  kind: IdeaFileKind,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  let grant;
  try {
    grant = await hackathonApi.ideaFileUpload(slug, { kind, name: file.name, size: file.size, type: file.type });
  } catch (error) {
    throw asUploadError(error, 'Could not start the upload.');
  }
  try {
    await sendToStorage({ upload: { id: grant.file.id }, post: grant.post, max_bytes: grant.max_bytes }, file, onProgress, signal);
  } catch (error) {
    await hackathonApi.ideaFileDiscard(slug, grant.file.id).catch(() => undefined);
    throw asUploadError(error, 'The upload failed.');
  }
  try {
    const done = await hackathonApi.ideaFileComplete(slug, grant.file.id);
    return { upload_id: done.file.id, name: done.file.name, size: done.file.size, type: done.file.type };
  } catch (error) {
    throw asUploadError(error, 'We could not confirm the upload.');
  }
}

/** A saved file as the picker shows it. */
export const asUploaded = (file: { id: string; name: string; size: number; type: string } | null | undefined): UploadedFile | null =>
  file ? { upload_id: file.id, name: file.name, size: file.size, type: file.type } : null;

/** Organizers: send the payment QR image to storage and have the server make it the hackathon's QR code. */
export async function uploadIdeaQr(
  slug: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  let grant;
  try {
    grant = await hackathonApi.ideaQrUpload(slug, { name: file.name, size: file.size, type: file.type });
  } catch (error) {
    throw asUploadError(error, 'Could not start the upload.');
  }
  try {
    await sendToStorage({ upload: { id: grant.file.id }, post: grant.post, max_bytes: grant.max_bytes }, file, onProgress, signal);
  } catch (error) {
    throw asUploadError(error, 'The upload failed.');
  }
  try {
    const done = await hackathonApi.ideaQrComplete(slug, grant.file.id);
    return { upload_id: done.file.id, name: done.file.name, size: done.file.size, type: done.file.type };
  } catch (error) {
    throw asUploadError(error, 'We could not save the QR code.');
  }
}
