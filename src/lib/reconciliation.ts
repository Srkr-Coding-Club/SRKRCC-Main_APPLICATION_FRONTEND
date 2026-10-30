import { fetchApi } from '@/lib/api-client';
import { downloadServerExport, type ExportFormat } from '@/lib/exportApi';
import type { DirectoryPage } from '@/lib/userDirectory';

export type Outcome =
  | 'MATCH' | 'NAME_DIFFERS' | 'ID_MISSING_IN_APP' | 'ID_MISMATCH' | 'ID_HELD_BY_OTHER' | 'EMAIL_MISMATCH' | 'ID_RESERVED' | 'ID_RETIRED'
  | 'NO_ACCOUNT' | 'NO_ACCOUNT_NO_ID' | 'NO_ID_IN_SHEET' | 'INVALID' | 'DUPLICATE';
export type Resolution = 'PENDING' | 'LINKED' | 'KEPT_APP' | 'USED_SHEET' | 'FOLLOW_UP' | 'INVITED' | 'DISMISSED';
export type GroupKey = 'matched' | 'link' | 'mismatch' | 'no_account' | 'sheet';
export type RowAction = 'link' | 'link_retired' | 'use_sheet' | 'keep_app' | 'follow_up' | 'invite' | 'dismiss';

export const GROUPS: { key: GroupKey; label: string; hint: string; outcomes: Outcome[] }[] = [
  { key: 'matched', label: 'Matches', hint: 'Email and Club ID agree with an account', outcomes: ['MATCH', 'NAME_DIFFERS'] },
  { key: 'link', label: 'Link a Club ID', hint: 'The account exists and has no Club ID', outcomes: ['ID_MISSING_IN_APP'] },
  { key: 'mismatch', label: 'Mismatches', hint: 'The sheet and the app disagree', outcomes: ['ID_MISMATCH', 'ID_HELD_BY_OTHER', 'EMAIL_MISMATCH', 'ID_RESERVED', 'ID_RETIRED'] },
  { key: 'no_account', label: 'No account', hint: 'Nobody has signed up with this email', outcomes: ['NO_ACCOUNT', 'NO_ACCOUNT_NO_ID'] },
  { key: 'sheet', label: 'Check the sheet', hint: 'Unreadable, repeated or without an id', outcomes: ['INVALID', 'DUPLICATE', 'NO_ID_IN_SHEET'] },
];

export interface SheetInfo { name: string; rows: number }
export interface ColumnMapping { name: string; email: string; club_id: string }
export interface Inspection { sheets: SheetInfo[]; sheet: string; headers: string[]; suggested: ColumnMapping; total_rows: number; sample: Record<string, string>[] }

export interface RunSummary {
  id: string;
  filename: string;
  sheet: string;
  mapping: ColumnMapping;
  total: number;
  created_at: string;
  created_by: string;
  by_outcome: Record<Outcome, number>;
  by_resolution: Record<Resolution, number>;
  open: number;
}

export interface Person { id: number; name: string; email: string; club_id: string | null; role: string }

export interface ReconRow {
  id: number;
  row_number: number;
  name: string;
  email: string;
  club_id: string;
  outcome: Outcome;
  outcome_label: string;
  detail: string;
  resolution: Resolution;
  resolution_label: string;
  note: string;
  matched_user: Person | null;
  other_user: Person | null;
  resolved_by: string;
  resolved_at: string | null;
  invited_at: string | null;
  actions: RowAction[];
}

export interface RowPage { count: number; next: string | null; previous: string | null; results: ReconRow[] }
export interface BulkResult { done: number; failed: { row_number: number; error: string }[] }

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
};
const post = (body: unknown = {}): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function upload(file: File, extra: Record<string, string | undefined>): FormData {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(extra)) if (value) form.append(key, value);
  return form;
}

export const reconciliationApi = {
  inspect: (file: File, sheet?: string) => fetchApi<Inspection>('/auth/reconciliation/inspect/', { method: 'POST', body: upload(file, { sheet }) }),
  create: (file: File, sheet: string | undefined, mapping: ColumnMapping) =>
    fetchApi<RunSummary>('/auth/reconciliation/runs/', { method: 'POST', body: upload(file, { sheet, mapping: JSON.stringify(mapping) }) }),
  runs: () => fetchApi<{ results: RunSummary[] }>('/auth/reconciliation/runs/'),
  summary: (id: string) => fetchApi<RunSummary>(`/auth/reconciliation/runs/${id}/`),
  remove: (id: string) => fetchApi<unknown>(`/auth/reconciliation/runs/${id}/`, { method: 'DELETE' }),
  rows: (id: string, params: { group?: GroupKey; q?: string; open?: boolean; outcome?: string; page?: number }) =>
    fetchApi<RowPage>(`/auth/reconciliation/runs/${id}/rows/${query({ group: params.group, q: params.q, open: params.open ? '1' : undefined, outcome: params.outcome, page: params.page && params.page > 1 ? params.page : undefined })}`),
  missing: (id: string, page = 1) => fetchApi<DirectoryPage>(`/auth/reconciliation/runs/${id}/missing/${query({ page: page > 1 ? page : undefined })}`),
  recheck: (id: string) => fetchApi<{ changed: number; summary: RunSummary }>(`/auth/reconciliation/runs/${id}/recheck/`, post()),
  act: (id: string, row: number, action: 'link' | 'use-sheet' | 'decide' | 'invite', body: Record<string, unknown> = {}) =>
    fetchApi<ReconRow>(`/auth/reconciliation/runs/${id}/rows/${row}/${action}/`, post(body)),
  bulk: (id: string, body: { action: 'link' | 'invite'; outcome: Outcome; expected: number }) => fetchApi<BulkResult>(`/auth/reconciliation/runs/${id}/bulk/`, post(body)),
  exportReport: (id: string, format: ExportFormat, kind: 'report' | 'missing', group?: GroupKey) =>
    downloadServerExport(`/auth/reconciliation/runs/${id}/export`, format, { kind, group }),
};
