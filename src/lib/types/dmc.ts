/**
 * src/lib/types/dmc.ts
 * TypeScript types for the Data Management Center API.
 * Mirrors the backend contracts.py dataclass schema.
 */

// ---------------------------------------------------------------------------
// Four-state Canonical Value
// ---------------------------------------------------------------------------

export type ValueState = 'value' | 'not_applicable' | 'empty' | 'unknown';
export type ColumnType = 'text' | 'email' | 'number' | 'date' | 'datetime' | 'url' | 'badge' | 'file' | 'rating' | 'boolean' | 'multiline';
export type ColumnCategory = 'common' | 'academic' | 'hackathon' | 'form_questions' | 'career' | 'codequest' | 'meta';
export type ColumnRenderer = 'text' | 'link' | 'badge' | 'file_download' | 'star_rating' | 'date' | 'boolean' | 'email';
export type FilterType = 'select' | 'text' | 'date_range' | 'boolean' | 'number_range';
export type FilterOperator = 'eq' | 'neq' | 'contains' | 'starts_with' | 'between' | 'gte' | 'lte';
export type ExportFormat = 'csv' | 'xlsx' | 'json';
export type ExportRowScope = 'selected' | 'all_filtered';
export type ExportColumnScope = 'visible' | 'all_permitted';

export interface CanonicalValue {
  state: ValueState;
  value: string | number | boolean | null | string[];
  display_value: string;
  type: ColumnType;
}

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  category: ColumnCategory;
  source: string;
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  visible_by_default: boolean;
  renderer: ColumnRenderer;
  description: string;
}

export interface FilterOption {
  label: string;
  value: string | number | boolean;
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  options: FilterOption[];
}

// ---------------------------------------------------------------------------
// Dataset catalog
// ---------------------------------------------------------------------------

export interface DatasetCapabilities {
  read: boolean;
  search: boolean;
  filter: boolean;
  sort: boolean;
  export_csv: boolean;
  export_xlsx: boolean;
  export_json: boolean;
  record_detail: boolean;
}

export type DatasetHealth = 'OK' | 'DEGRADED' | 'UNAVAILABLE';

export interface DatasetDefinition {
  id: string;
  label: string;
  description: string;
  group: string;
  primary_key: string;
  default_sort_field: string;
  default_sort_direction: 'asc' | 'desc';
  capabilities: DatasetCapabilities;
  health: DatasetHealth;
}

export interface DatasetCatalogResponse {
  datasets: DatasetDefinition[];
}

export interface DatasetSchemaResponse {
  dataset_id: string;
  columns: ColumnDefinition[];
  filters: FilterDefinition[];
  total_columns: number;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface SortClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterClause {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface QueryRequest {
  page: number;
  page_size: number;
  search: string;
  sort: SortClause;
  filters: FilterClause[];
  columns: string[];
}

export type DMCRecord = Record<string, CanonicalValue>;

export interface QueryResponse {
  dataset_id: string;
  total: number;
  page: number;
  page_size: number;
  records: DMCRecord[];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportRequest {
  format: ExportFormat;
  row_scope: ExportRowScope;
  column_scope: ExportColumnScope;
  selected_record_ids: string[];
  visible_column_keys: string[];
  search: string;
  sort: SortClause;
  filters: FilterClause[];
}

export interface ExportJobStatus {
  job_id: number;
  dataset_id: string;
  format: ExportFormat;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  row_count: number | null;
  file_size: number | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  downloadable: boolean;
  error_message: string | null;
}
