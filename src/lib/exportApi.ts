import { fetchApiBlob } from '@/lib/api-client';
import { dmcApi } from '@/lib/dmc-api';
import { saveBlob } from '@/lib/dataManagement';

/** The formats every export in the app offers. The server renders them all through one serializer. */
export type ExportFormat = 'csv' | 'xlsx' | 'json';

export const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'json', label: 'JSON (.json)' },
];

type Params = Record<string, string | number | null | undefined>;

const EXPORT_JOB_POLL_MS = 2000;
const EXPORT_JOB_MAX_POLLS = 150;

function query(params: Params, format: ExportFormat): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  search.set('export_format', format);
  return search.toString();
}

/** Downloads a server-rendered export (`endpoint` plus ?export_format=) and saves it under the name the server chose. */
export async function downloadServerExport(endpoint: string, format: ExportFormat, params: Params = {}, fallbackName = `export.${format}`): Promise<void> {
  const { blob, filename } = await fetchApiBlob(`${endpoint}?${query(params, format)}`);
  saveBlob(blob, filename ?? fallbackName);
}

/**
 * Exports chosen rows of a Data Management Center dataset in every column the viewer may see. Small exports come back
 * at once; big ones are prepared in the background, so this waits for the job and then saves the finished file.
 */
export async function downloadDatasetRows(datasetId: string, recordIds: string[], format: ExportFormat): Promise<void> {
  const result = await dmcApi.export(datasetId, {
    format, row_scope: 'selected', column_scope: 'all_permitted', selected_record_ids: recordIds,
    visible_column_keys: [], search: '', sort: { field: 'created_at', direction: 'desc' }, filters: [],
  });
  if (result.mode === 'sync') {
    saveBlob(result.blob, result.filename);
    return;
  }
  for (let attempt = 0; attempt < EXPORT_JOB_MAX_POLLS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, EXPORT_JOB_POLL_MS));
    const job = await dmcApi.getExportJobStatus(result.jobId);
    if (job.status === 'FAILED') throw new Error(job.error_message ?? 'The export failed.');
    if (job.downloadable) {
      const { blob, filename } = await fetchApiBlob(`admin/dmc/exports/${result.jobId}/download/`);
      saveBlob(blob, filename ?? `${datasetId}-export.${format}`);
      return;
    }
  }
  throw new Error('The export is taking longer than expected. Try again in a moment.');
}
