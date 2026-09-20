/**
 * src/lib/dmc-api.ts
 * DMC API client — thin wrapper over fetchApi for all DMC endpoints.
 */

import { fetchApi } from './api-client';
import type {
  DatasetCatalogResponse,
  DatasetSchemaResponse,
  ExportJobStatus,
  ExportRequest,
  QueryRequest,
  QueryResponse,
} from './types/dmc';

const BASE = 'admin/dmc';

export const dmcApi = {
  /** GET /api/admin/dmc/datasets/ */
  getCatalog: () =>
    fetchApi<DatasetCatalogResponse>(`${BASE}/datasets/`),

  /** GET /api/admin/dmc/datasets/<id>/schema/ */
  getSchema: (datasetId: string) =>
    fetchApi<DatasetSchemaResponse>(`${BASE}/datasets/${datasetId}/schema/`),

  /** POST /api/admin/dmc/datasets/<id>/query/ */
  query: (datasetId: string, req: QueryRequest) =>
    fetchApi<QueryResponse>(`${BASE}/datasets/${datasetId}/query/`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** POST /api/admin/dmc/datasets/<id>/export/ */
  export: async (datasetId: string, req: ExportRequest): Promise<{ mode: 'sync'; blob: Blob; filename: string } | { mode: 'async'; jobId: number }> => {
    const isClient = typeof window !== 'undefined';
    const cleanEndpoint = `admin/dmc/datasets/${datasetId}/export/`;
    const apiBaseUrl = (process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');
    const url = isClient ? `/api/proxy/${cleanEndpoint}` : `${apiBaseUrl}/${cleanEndpoint}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Export failed: ${res.status}`);
    }

    if (res.status === 202) {
      const json = await res.json();
      return { mode: 'async', jobId: json.job_id };
    }

    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `${datasetId}_export.csv`;
    const blob = await res.blob();
    return { mode: 'sync', blob, filename };
  },

  /** GET /api/admin/dmc/exports/<jobId>/ */
  getExportJobStatus: (jobId: number) =>
    fetchApi<ExportJobStatus>(`${BASE}/exports/${jobId}/`),

  /** Direct download URL for async export */
  getExportDownloadUrl: (jobId: number) =>
    `/api/proxy/admin/dmc/exports/${jobId}/download/`,
};
