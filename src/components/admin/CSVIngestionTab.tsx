'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Loader2,
  Users,
  Layers,
  Sparkles,
  ShieldCheck,
  Mail,
  Send,
} from 'lucide-react';
import { Form, FormField, BulkIngestResult, IngestError, DuplicateRecord } from '@/lib/types';
import { formatFileSize, downloadCSV, generateIdempotencyKey } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { API_BASE } from '@/lib/constants';
import { useToast } from '@/context/ToastContext';

// ---------------------------------------------------------------------------
// Types & Domain Schemas
// ---------------------------------------------------------------------------

export type IngestionMode = 'MEMBER_BACKUP' | 'FORM_SUBMISSION';

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  warnings: string[];
}

interface ColumnMapping {
  csvHeader: string;
  fieldId: string; // '' = ignore, field.id as string or member field key
}

interface MemberFieldDef {
  key: string;
  label: string;
  required?: boolean;
  type: string;
  synonyms: string[];
}

const MEMBER_DIRECTORY_FIELDS: MemberFieldDef[] = [
  { key: 'email', label: 'Email Address', required: true, type: 'EMAIL', synonyms: ['email', 'e-mail', 'mail', 'email address', 'student email'] },
  { key: 'full_name', label: 'Full Name', required: false, type: 'TEXT', synonyms: ['full name', 'fullname', 'name', 'student name', 'member name'] },
  { key: 'phone_number', label: 'Phone Number', required: false, type: 'PHONE', synonyms: ['phone number', 'phone', 'mobile', 'contact', 'whatsapp'] },
  { key: 'branch', label: 'Branch / Dept', required: false, type: 'DROPDOWN', synonyms: ['branch', 'department', 'dept', 'course', 'stream'] },
  { key: 'roll_number', label: 'Roll Number', required: false, type: 'TEXT', synonyms: ['roll number', 'roll no', 'rollno', 'reg no'] },
  { key: 'club_id', label: 'Club ID (e.g. 25SCC277)', required: false, type: 'TEXT', synonyms: ['club id', 'clubid', 'member id', 'membership id', 'affiliate id', 'scc id'] },
  { key: 'referred_by', label: 'Referred By / Member', required: false, type: 'TEXT', synonyms: ['member', 'referred by', 'referrer', 'onboarded by', 'lead'] },
  { key: 'registered_at', label: 'Registration Date', required: false, type: 'DATE', synonyms: ['registration date', 'reg date', 'date', 'joining date', 'joined date'] },
  { key: 'membership_status', label: 'Membership Status', required: false, type: 'DROPDOWN', synonyms: ['status', 'membership status', 'state'] },
];

type ValidationError = { row: number; column: string; value: string; error: string };
type ValidationWarning = { row: number; column: string; issue: string };

interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duplicates: DuplicateRecord[];
  cleanCount: number;
}

interface MemberImportPreviewResponse {
  job_id: string;
  filename: string;
  headers: string[];
  mapping: Record<string, string>;
  total_rows: number;
  valid_rows: number;
  conflict_rows: number;
  new_users_count: number;
  updated_users_count: number;
  preview_sample: {
    row_index: number;
    email: string;
    full_name: string;
    phone_number: string;
    branch: string;
    club_id: string;
    referred_by: string;
    is_referral_ambiguous?: boolean;
    registered_at: string;
    membership_status: string;
    action: 'CREATE' | 'UPDATE' | 'ERROR';
    errors: string[];
    is_valid: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Step Bar
// ---------------------------------------------------------------------------

const STEPS = ['Upload', 'Map Columns', 'Validate & Preview', 'Ingest & Automate'] as const;

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                  isActive ? 'text-orange-400' : isDone ? 'text-emerald-400' : 'text-slate-600'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 transition-all ${
                  i < step ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function similarity(a: string, b: string): number {
  a = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  b = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  return 0;
}

async function parseFileToCSV(file: File): Promise<ParsedCSV> {
  const warnings: string[] = [];

  if (file.name.match(/\.(xlsx|xls)$/i)) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvString = XLSX.utils.sheet_to_csv(sheet);
    return parseCSVString(csvString, warnings);
  }

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (result) => {
        const parsed = postProcessParsed(result.data, result.meta.fields ?? [], warnings);
        resolve(parsed);
      },
      error: () => {
        warnings.push('Could not read file. Try saving as UTF-8 CSV from Excel.');
        resolve({ headers: [], rows: [], rowCount: 0, warnings });
      },
    });
  });
}

function parseCSVString(csv: string, warnings: string[]): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return postProcessParsed(result.data, result.meta.fields ?? [], warnings);
}

function postProcessParsed(
  rows: Record<string, string>[],
  originalHeaders: string[],
  warnings: string[]
): ParsedCSV {
  const seenHeaders: Record<string, number> = {};
  const finalHeaders: string[] = [];
  const renamedCols: string[] = [];

  for (const h of originalHeaders) {
    if (seenHeaders[h]) {
      seenHeaders[h]++;
      const newName = `${h}_${seenHeaders[h]}`;
      finalHeaders.push(newName);
      renamedCols.push(`"${h}" → "${newName}"`);
    } else {
      seenHeaders[h] = 1;
      finalHeaders.push(h);
    }
  }
  if (renamedCols.length > 0) {
    warnings.push(`Duplicate column names renamed: ${renamedCols.join(', ')}`);
  }

  return {
    headers: finalHeaders,
    rows,
    rowCount: rows.length,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Step 1: Upload & Target Selection
// ---------------------------------------------------------------------------

function UploadStep({
  forms,
  mode,
  setMode,
  selectedForm,
  setSelectedForm,
  onComplete,
}: {
  forms: Form[];
  mode: IngestionMode;
  setMode: (m: IngestionMode) => void;
  selectedForm: Form | null;
  setSelectedForm: (f: Form | null) => void;
  onComplete: (parsed: ParsedCSV, file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableForms = forms.filter(
    (f) => f.status === 'PUBLISHED' || f.status === 'CLOSED'
  );

  const handleFile = useCallback(async (f: File) => {
    setParseError(null);
    if (f.size > MAX_FILE_SIZE) {
      setParseError(`File too large (${formatFileSize(f.size)}). Maximum size is 10 MB.`);
      return;
    }
    setParsing(true);
    try {
      const result = await parseFileToCSV(f);
      if (result.rowCount === 0) {
        setParseError('File has no data rows after the header.');
        setParsing(false);
        return;
      }
      setFile(f);
      setParsed(result);
    } catch {
      setParseError('Could not parse the file. Try saving as UTF-8 CSV or XLSX.');
    }
    setParsing(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const canProceed = Boolean(parsed && file && (mode === 'MEMBER_BACKUP' || selectedForm));

  return (
    <div className="space-y-6">
      {/* Target Selector */}
      <div className="bg-slate-50 dark:bg-[#151722] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setMode('MEMBER_BACKUP');
            setSelectedForm(null);
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            mode === 'MEMBER_BACKUP'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Club Member Directory (Backup Data)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('FORM_SUBMISSION')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
            mode === 'FORM_SUBMISSION'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Dynamic Form Submissions</span>
        </button>
      </div>

      {mode === 'MEMBER_BACKUP' && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3 text-xs text-orange-900 dark:text-orange-200">
          <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Member Master Directory Mode</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              Directly imports member profiles with full fidelity: Name, Email, Phone, Branch, Club ID (e.g. 25SCC277), Referral Source (e.g. Ankith), and Legacy Registration Date. No form ID required!
            </p>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
            : parsed
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-500 bg-white dark:bg-[#151722]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Parsing file…</p>
          </div>
        ) : parsed ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-emerald-400" />
            <div>
              <p className="text-base font-bold text-[#1A1A2E] dark:text-white">{file?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {formatFileSize(file?.size ?? 0)} · {parsed.rowCount} rows · {parsed.headers.length} columns
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParsed(null);
                setFile(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-600 dark:text-slate-300 underline"
            >
              Choose different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-bold text-[#1A1A2E] dark:text-white">Drop your CSV or Excel file here</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Supports .csv and .xlsx spreadsheets · up to 10 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {parseError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-700 dark:text-rose-300">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {parseError}
        </div>
      )}

      {/* Form selector for Form Submissions Mode */}
      {mode === 'FORM_SUBMISSION' && parsed && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Target Form Selection
          </label>
          <select
            value={selectedForm ? String(selectedForm.id) : ''}
            onChange={(e) => {
              const found = availableForms.find((f) => String(f.id) === e.target.value);
              setSelectedForm(found || null);
            }}
            className="w-full px-4 py-3 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500/60"
          >
            <option value="">Select target form…</option>
            {availableForms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.title} ({f.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preview table */}
      {parsed && parsed.rows.length > 0 && (
        <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Uploaded Sample Preview (first 5 rows)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-[#FAFAFC] dark:bg-[#0f0f1a] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-bold text-slate-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {parsed.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {parsed.headers.map((h) => (
                      <td key={h} className="px-4 py-2 truncate max-w-[160px]">
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        disabled={!canProceed}
        onClick={() => {
          if (parsed && file) onComplete(parsed, file);
        }}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20"
      >
        Next: Map Columns <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Map Columns
// ---------------------------------------------------------------------------

function MapColumnsStep({
  parsed,
  mode,
  form,
  onBack,
  onComplete,
}: {
  parsed: ParsedCSV;
  mode: IngestionMode;
  form: Form | null;
  onBack: () => void;
  onComplete: (mappings: ColumnMapping[]) => void;
}) {
  const formFields = form?.fields?.filter((f) => f.type !== 'SECTION') ?? [];

  const initMappings = (): ColumnMapping[] => {
    return parsed.headers.map((header) => {
      const cleanHeader = header.trim().toLowerCase();

      if (mode === 'MEMBER_BACKUP') {
        let bestKey = '';
        let bestScore = 0;
        for (const def of MEMBER_DIRECTORY_FIELDS) {
          if (cleanHeader === def.key || def.synonyms.includes(cleanHeader)) {
            bestKey = def.key;
            break;
          }
          const score = similarity(cleanHeader, def.label);
          if (score > 0.6 && score > bestScore) {
            bestScore = score;
            bestKey = def.key;
          }
        }
        return { csvHeader: header, fieldId: bestKey };
      } else {
        let bestField = '';
        let bestScore = 0;
        for (const f of formFields) {
          const score = similarity(header, f.label);
          if (score > 0.6 && score > bestScore) {
            bestScore = score;
            bestField = String(f.id);
          }
        }
        return { csvHeader: header, fieldId: bestField };
      }
    });
  };

  const [mappings, setMappings] = useState<ColumnMapping[]>(initMappings);

  const setMapping = (csvHeader: string, fieldId: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, fieldId } : m))
    );
  };

  const emailMapped = mode === 'MEMBER_BACKUP'
    ? mappings.some((m) => m.fieldId === 'email')
    : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">
            {mode === 'MEMBER_BACKUP' ? 'Map Member Directory Fields' : 'Map Form Columns'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Match columns from your spreadsheet to the corresponding target fields.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="grid grid-cols-2 gap-0 border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-[#FAFAFC] dark:bg-[#0f0f1a]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spreadsheet Column</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Field</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {mappings.map((mapping) => (
            <div
              key={mapping.csvHeader}
              className="grid grid-cols-2 gap-4 px-4 py-3 items-center"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{mapping.csvHeader}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sample: {parsed.rows[0]?.[mapping.csvHeader] ?? '—'}
                </p>
              </div>

              <div>
                <select
                  value={mapping.fieldId}
                  onChange={(e) => setMapping(mapping.csvHeader, e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFC] dark:bg-[#0f0f1a] border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">— Ignore column —</option>
                  {mode === 'MEMBER_BACKUP' ? (
                    MEMBER_DIRECTORY_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label} {f.required ? '(Required)' : ''}
                      </option>
                    ))
                  ) : (
                    formFields.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.label} {f.is_required ? '(Required)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!emailMapped && mode === 'MEMBER_BACKUP' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Email Address is required to create member records. Please map one column to "Email Address".
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          disabled={!emailMapped}
          onClick={() => onComplete(mappings)}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20"
        >
          Next: Validate & Preview <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Validate & Preview Snapshot
// ---------------------------------------------------------------------------

function ValidateAndPreviewStep({
  file,
  parsed,
  mappings,
  mode,
  form,
  onBack,
  onCompleteMemberPreview,
}: {
  file: File;
  parsed: ParsedCSV;
  mappings: ColumnMapping[];
  mode: IngestionMode;
  form: Form | null;
  onBack: () => void;
  onCompleteMemberPreview: (preview: MemberImportPreviewResponse) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberPreview, setMemberPreview] = useState<MemberImportPreviewResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runPreview() {
      setLoading(true);
      setError(null);

      if (mode === 'MEMBER_BACKUP') {
        try {
          const mappingObj: Record<string, string> = {};
          mappings.forEach((m) => {
            if (m.fieldId) mappingObj[m.csvHeader] = m.fieldId;
          });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('mapping', JSON.stringify(mappingObj));

          const previewData = await fetchApi<MemberImportPreviewResponse>('/auth/members/import/preview/', {
            method: 'POST',
            body: formData,
          });

          if (isMounted) {
            setMemberPreview(previewData);
            setLoading(false);
          }
        } catch (err: unknown) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Validation failed');
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
      }
    }

    runPreview();
    return () => {
      isMounted = false;
    };
  }, [file, mappings, mode]);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto" />
        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">Validating records & checking collisions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          {error}
        </div>
        <button onClick={onBack} className="w-full py-3 rounded-xl border border-slate-700 text-sm font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {memberPreview && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">Total Rows</p>
              <p className="text-2xl font-black text-[#1A1A2E] dark:text-white mt-1">{memberPreview.total_rows}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-500">New Members</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">{memberPreview.new_users_count}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-[10px] font-bold uppercase text-blue-400">Updates</p>
              <p className="text-2xl font-black text-blue-400 mt-1">{memberPreview.updated_users_count}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-center">
              <p className="text-[10px] font-bold uppercase text-rose-500">Conflicts</p>
              <p className="text-2xl font-black text-rose-500 mt-1">{memberPreview.conflict_rows}</p>
            </div>
          </div>

          {/* Preview Snapshot Table */}
          <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Validation & Action Preview Snapshot
              </p>
              <span className="text-xs text-emerald-500 font-bold">
                {memberPreview.valid_rows} of {memberPreview.total_rows} ready to commit
              </span>
            </div>
            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAFAFC] dark:bg-[#0f0f1a] sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Full Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Club ID</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Referred By</th>
                    <th className="px-3 py-2">Reg Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {memberPreview.preview_sample.map((row) => (
                    <tr key={row.row_index} className={row.action === 'ERROR' ? 'bg-rose-500/5' : ''}>
                      <td className="px-3 py-2 font-mono text-slate-400">#{row.row_index}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            row.action === 'CREATE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : row.action === 'UPDATE'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#1A1A2E] dark:text-white">{row.full_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.email}</td>
                      <td className="px-3 py-2 font-mono text-orange-400 font-bold">{row.club_id}</td>
                      <td className="px-3 py-2">{row.branch || '—'}</td>
                      <td className="px-3 py-2">
                        {row.referred_by || '—'}
                        {row.is_referral_ambiguous && (
                          <span className="ml-1 text-[9px] text-amber-400 font-bold">(ambiguous)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{row.registered_at || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Back
            </button>
            <button
              onClick={() => onCompleteMemberPreview(memberPreview)}
              className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition"
            >
              Next: Commit Import & Automation <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Commit & Automation
// ---------------------------------------------------------------------------

function IngestAndAutomateStep({
  memberPreview,
  onReset,
  onViewMembers,
}: {
  memberPreview: MemberImportPreviewResponse;
  onReset: () => void;
  onViewMembers: () => void;
}) {
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    imported_count: number;
    new_users_count: number;
    updated_users_count: number;
    failed_count: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCommit = async () => {
    setIsCommitting(true);
    setError(null);
    try {
      const result = await fetchApi<any>('/auth/members/import/commit/', {
        method: 'POST',
        body: JSON.stringify({
          job_id: memberPreview.job_id,
          send_welcome_email: sendWelcomeEmail,
        }),
      });

      setCommitResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    }
    setIsCommitting(false);
  };

  if (commitResult) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto" />
          <h3 className="text-2xl font-black text-[#1A1A2E] dark:text-white">Import Committed Successfully!</h3>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <p>
              <span className="font-bold text-emerald-400">{commitResult.imported_count}</span> members processed into Master Directory.
            </p>
            <p>
              <span className="font-bold text-blue-400">{commitResult.new_users_count}</span> new accounts created with permanent Club IDs.
            </p>
            {commitResult.updated_users_count > 0 && (
              <p>
                <span className="font-bold text-purple-400">{commitResult.updated_users_count}</span> existing member profiles synchronized.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onViewMembers}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition shadow-lg shadow-orange-500/20"
          >
            View Member Directory
          </button>
          <button
            onClick={onReset}
            className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#1A1A2E] dark:hover:text-white text-sm font-bold transition"
          >
            Import Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="text-base font-bold text-[#1A1A2E] dark:text-white">Ready for Final Atomic Commit</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {memberPreview.valid_rows} verified records will be ingested under transaction savepoints.
            </p>
          </div>
        </div>

        {/* Email Automation Option */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <input
            id="welcome-email-check"
            type="checkbox"
            checked={sendWelcomeEmail}
            onChange={(e) => setSendWelcomeEmail(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-orange-500 border-slate-300 focus:ring-orange-500"
          />
          <label htmlFor="welcome-email-check" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <span className="font-bold text-[#1A1A2E] dark:text-white block">
              Send Welcome Notification & Club ID Email
            </span>
            <span>
              Dispatches templated onboarding email containing their permanent Club ID and password setup token.
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          {error}
        </div>
      )}

      <button
        disabled={isCommitting}
        onClick={handleCommit}
        className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 transition"
      >
        {isCommitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Ingesting & Allocating Club IDs…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Commit {memberPreview.valid_rows} Members to Database
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Orchestrator Component
// ---------------------------------------------------------------------------

interface CSVIngestionTabProps {
  forms: Form[];
  onSwitchSubtab: (tab: string, formSlug?: string) => void;
}

export function CSVIngestionTab({ forms, onSwitchSubtab }: CSVIngestionTabProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<IngestionMode>('MEMBER_BACKUP');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [memberPreview, setMemberPreview] = useState<MemberImportPreviewResponse | null>(null);

  const reset = () => {
    setStep(0);
    setParsed(null);
    setFile(null);
    setSelectedForm(null);
    setMappings([]);
    setMemberPreview(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <StepBar step={step} />

      {step === 0 && (
        <UploadStep
          forms={forms}
          mode={mode}
          setMode={setMode}
          selectedForm={selectedForm}
          setSelectedForm={setSelectedForm}
          onComplete={(p, f) => {
            setParsed(p);
            setFile(f);
            setStep(1);
          }}
        />
      )}

      {step === 1 && parsed && (
        <MapColumnsStep
          parsed={parsed}
          mode={mode}
          form={selectedForm}
          onBack={() => setStep(0)}
          onComplete={(m) => {
            setMappings(m);
            setStep(2);
          }}
        />
      )}

      {step === 2 && parsed && file && (
        <ValidateAndPreviewStep
          file={file}
          parsed={parsed}
          mappings={mappings}
          mode={mode}
          form={selectedForm}
          onBack={() => setStep(1)}
          onCompleteMemberPreview={(preview) => {
            setMemberPreview(preview);
            setStep(3);
          }}
        />
      )}

      {step === 3 && memberPreview && (
        <IngestAndAutomateStep
          memberPreview={memberPreview}
          onReset={reset}
          onViewMembers={() => onSwitchSubtab('members')}
        />
      )}
    </div>
  );
}
