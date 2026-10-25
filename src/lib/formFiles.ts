import { fetchApi } from '@/lib/api-client';
import { uploadFile } from '@/lib/fileUpload';

/** A file attached to a response, as the admin Files tab lists it. */
export interface FormFile {
  id: string;
  name: string;
  size: number;
  type: string;
  is_image: boolean;
  state: string;
  scan_status: string;
  uploaded_at: string;
  field: { id: number; label: string } | null;
  response_id: number | null;
  uploader: { id: number; name: string; email: string } | null;
  replaced_a_file: boolean;
}

export interface FormFilesPage {
  count: number;
  next: string | null;
  previous: string | null;
  total_bytes: number;
  results: FormFile[];
}

export interface FormFilesQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  field?: string;
  kind?: '' | 'images' | 'documents';
}

const base = (slug: string) => `/forms/${encodeURIComponent(slug)}`;

export function listFiles(slug: string, query: FormFilesQuery): Promise<FormFilesPage> {
  const params = new URLSearchParams();
  params.set('page', String(query.page || 1));
  params.set('page_size', String(query.pageSize || 24));
  if (query.search) params.set('search', query.search);
  if (query.field) params.set('field', query.field);
  if (query.kind) params.set('kind', query.kind);
  return fetchApi<FormFilesPage>(`${base(slug)}/files/?${params}`);
}

interface Link { url: string; expires_in: number; inline: boolean }
const links = new Map<string, { link: Link; fetchedAt: number }>();
const REUSE_MS = 40_000; // links last 60 seconds on the server

/** A short-lived link to view or download a file; reused briefly so a grid of thumbnails does not ask twice. */
export async function fileLink(slug: string, id: string, inline: boolean): Promise<Link> {
  const key = `${slug}/${id}/${inline}`;
  const cached = links.get(key);
  if (cached && Date.now() - cached.fetchedAt < REUSE_MS) return cached.link;
  const link = await fetchApi<Link>(`${base(slug)}/files/${id}/link/${inline ? '?inline=1' : ''}`);
  links.set(key, { link, fetchedAt: Date.now() });
  return link;
}

export const forgetLinks = () => links.clear();

export function deleteFiles(slug: string, ids: string[]): Promise<{ removed: number; responses_missing_required_file: number[] }> {
  return fetchApi(`${base(slug)}/files/delete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

/** Upload the replacement the same way a respondent would, then swap it in for the old file. */
export async function replaceFile(slug: string, old: FormFile, file: File, onProgress: (fraction: number) => void): Promise<FormFile> {
  if (!old.field) throw new Error('This file no longer belongs to a question.');
  const uploaded = await uploadFile(slug, old.field.id, file, onProgress);
  const done = await fetchApi<{ file: FormFile }>(`${base(slug)}/files/${old.id}/replace/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploaded.upload_id }),
  });
  forgetLinks();
  return done.file;
}
