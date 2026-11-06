import { hackathonApi } from '@/lib/api/hackathons';
import { asUploadError, sendToStorage, type UploadedFile } from '@/lib/fileUpload';
import type { IdeaFileKind } from '@/lib/types';

/** What the picker allows for each kind of idea file. The server checks the same rules again. */
export const IDEA_FILE_RULES: Record<IdeaFileKind, { allowedFileTypes: string; maxFileSizeMB: number; label: string }> = {
  DECK: { allowedFileTypes: '.ppt,.pptx,.pdf', maxFileSizeMB: 25, label: 'slides' },
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

/** The screenshot of the fee paid to register: sent to storage before the team exists, then used when the team is created. */
export async function uploadRegistrationPayment(
  slug: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  let grant;
  try {
    grant = await hackathonApi.paymentFileUpload(slug, { name: file.name, size: file.size });
  } catch (error) {
    throw asUploadError(error, 'Could not start the upload.');
  }
  try {
    await sendToStorage({ upload: { id: grant.file.id }, post: grant.post, max_bytes: grant.max_bytes }, file, onProgress, signal);
  } catch (error) {
    await hackathonApi.paymentFileDiscard(slug, grant.file.id).catch(() => undefined);
    throw asUploadError(error, 'The upload failed.');
  }
  try {
    const done = await hackathonApi.paymentFileComplete(slug, grant.file.id);
    return { upload_id: done.file.id, name: done.file.name, size: done.file.size, type: done.file.type };
  } catch (error) {
    throw asUploadError(error, 'We could not confirm the upload.');
  }
}

/** A saved file as the picker shows it. */
export const asUploaded = (file: { id: string; name: string; size: number; type: string } | null | undefined): UploadedFile | null =>
  file ? { upload_id: file.id, name: file.name, size: file.size, type: file.type } : null;

/** What the template picker allows. The server checks the same rules again. */
export const IDEA_TEMPLATE_RULES = { allowedFileTypes: '.ppt,.pptx,.pdf,.doc,.docx', maxFileSizeMB: 25, label: 'template' };

type OrganizerGrant = Awaited<ReturnType<typeof hackathonApi.ideaQrUpload>>;
type OrganizerDone = { file: { id: string; name: string; size: number; type: string } };

/** Organizers: send a hackathon-wide file to storage and have the server make it the hackathon's file. */
async function uploadOrganizerFile(
  file: File,
  progress: (fraction: number) => void,
  signal: AbortSignal | undefined,
  api: { grant: () => Promise<OrganizerGrant>; complete: (fileId: string) => Promise<OrganizerDone>; completeFailure: string },
): Promise<UploadedFile> {
  let grant;
  try {
    grant = await api.grant();
  } catch (error) {
    throw asUploadError(error, 'Could not start the upload.');
  }
  try {
    await sendToStorage({ upload: { id: grant.file.id }, post: grant.post, max_bytes: grant.max_bytes }, file, progress, signal);
  } catch (error) {
    throw asUploadError(error, 'The upload failed.');
  }
  try {
    const done = await api.complete(grant.file.id);
    return { upload_id: done.file.id, name: done.file.name, size: done.file.size, type: done.file.type };
  } catch (error) {
    throw asUploadError(error, api.completeFailure);
  }
}

/** Organizers: send the payment QR image to storage and have the server make it the hackathon's QR code. */
export const uploadIdeaQr = (slug: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal) =>
  uploadOrganizerFile(file, onProgress, signal, {
    grant: () => hackathonApi.ideaQrUpload(slug, { name: file.name, size: file.size, type: file.type }),
    complete: (fileId) => hackathonApi.ideaQrComplete(slug, fileId),
    completeFailure: 'We could not save the QR code.',
  });

/** Organizers: send the idea template to storage and have the server make it the hackathon's template. */
export const uploadIdeaTemplate = (slug: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal) =>
  uploadOrganizerFile(file, onProgress, signal, {
    grant: () => hackathonApi.ideaTemplateUpload(slug, { name: file.name, size: file.size, type: file.type }),
    complete: (fileId) => hackathonApi.ideaTemplateComplete(slug, fileId),
    completeFailure: 'We could not save the template.',
  });
