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
  Copy,
} from 'lucide-react';
import { Form, FormField, BulkIngestResult, IngestError, DuplicateRecord } from '@/lib/types';
import { formatFileSize, downloadCSV, generateIdempotencyKey, buildAuthFetchOptions } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { API_BASE } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  warnings: string[];
}

interface ColumnMapping {
  csvHeader: string;
  fieldId: string; // '' = ignore, field.id as string otherwise
}

type ValidationError = { row: number; column: string; value: string; error: string };
type ValidationWarning = { row: number; column: string; issue: string };

interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duplicates: DuplicateRecord[];
  cleanCount: number;
}

// ---------------------------------------------------------------------------
// Step stepper bar
// ---------------------------------------------------------------------------

const STEPS = ['Upload', 'Map Columns', 'Validate', 'Ingest'] as const;

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
                    : 'bg-slate-800 text-slate-500'
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
                  i < step ? 'bg-emerald-500' : 'bg-slate-700'
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Excel support
  if (file.name.match(/\.(xlsx|xls)$/i)) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvString = XLSX.utils.sheet_to_csv(sheet);
    return parseCSVString(csvString, warnings);
  }

  // Plain CSV
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
  // Detect duplicate column names and rename
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

  // Check if first row looks like data (all values are numbers/dates — no headers)
  if (rows.length > 0) {
    const firstRowValues = Object.values(rows[0]);
    const looksLikeData = firstRowValues.every((v) => {
      const n = Number(v);
      return !isNaN(n) || !isNaN(Date.parse(v));
    });
    if (looksLikeData && firstRowValues.length > 0) {
      warnings.push('CSV appears to have no header row. First row is being treated as data.');
    }
  }

  return {
    headers: finalHeaders,
    rows,
    rowCount: rows.length,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Step 1: Upload
// ---------------------------------------------------------------------------

function UploadStep({
  forms,
  onComplete,
}: {
  forms: Form[];
  onComplete: (parsed: ParsedCSV, file: File, form: Form) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableForms = forms.filter((f) =>
    f.status === 'PUBLISHED' || f.status === 'CLOSED'
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
        setParseError('CSV has no data rows after the header.');
        setParsing(false);
        return;
      }
      setFile(f);
      setParsed(result);
    } catch (e) {
      setParseError('Could not parse the file. Try saving as UTF-8 CSV from Excel.');
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

  const selectedForm = availableForms.find((f) => String(f.id) === selectedFormId);

  return (
    <div className="space-y-6">
      {/* Drag and drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-orange-500 bg-orange-500/5 scale-[1.01]'
            : parsed
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-700 hover:border-slate-500 bg-[#151722]'
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
            <p className="text-sm text-slate-400">Parsing file…</p>
          </div>
        ) : parsed ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-emerald-400" />
            <div>
              <p className="text-base font-bold text-white">{file?.name}</p>
              <p className="text-sm text-slate-400 mt-1">
                {formatFileSize(file?.size ?? 0)} · {parsed.rowCount} rows · {parsed.headers.length} columns
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setParsed(null); setFile(null); }}
              className="text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Choose different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Drop your CSV or Excel file here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse · .csv, .xlsx, .xls · max 10 MB</p>
            </div>
          </div>
        )}
      </div>

      {parseError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {parseError}
        </div>
      )}

      {/* Parse warnings */}
      {parsed?.warnings.map((w, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {w}
        </div>
      ))}

      {/* Preview table */}
      {parsed && parsed.rows.length > 0 && (
        <div className="bg-[#151722] rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Preview (first 5 rows)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="bg-[#0f0f1a] border-b border-slate-800">
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-bold text-slate-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
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

      {/* Form selector */}
      {parsed && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Which form is this data for?
          </label>
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="w-full px-4 py-3 bg-[#151722] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/60"
          >
            <option value="">Select a form…</option>
            {availableForms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.title} ({f.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        disabled={!parsed || !selectedForm}
        onClick={() => {
          if (parsed && selectedForm) onComplete(parsed, file!, selectedForm);
        }}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition"
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
  form,
  onBack,
  onComplete,
}: {
  parsed: ParsedCSV;
  form: Form;
  onBack: () => void;
  onComplete: (mappings: ColumnMapping[]) => void;
}) {
  const fields = form.fields?.filter((f) => f.type !== 'SECTION') ?? [];

  const initMappings = (): ColumnMapping[] =>
    parsed.headers.map((header) => {
      let bestField = '';
      let bestScore = 0;
      for (const f of fields) {
        const score = similarity(header, f.label);
        if (score > 0.6 && score > bestScore) {
          bestScore = score;
          bestField = String(f.id);
        }
      }
      return { csvHeader: header, fieldId: bestField };
    });

  const [mappings, setMappings] = useState<ColumnMapping[]>(initMappings);

  const setMapping = (csvHeader: string, fieldId: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, fieldId } : m))
    );
  };

  const requiredFieldIds = new Set(fields.filter((f) => f.is_required).map((f) => String(f.id)));
  const mappedFieldIds = new Set(mappings.map((m) => m.fieldId).filter(Boolean));
  const unmappedRequired = [...requiredFieldIds].filter((id) => !mappedFieldIds.has(id));

  const FIELD_TYPE_BADGE: Record<string, string> = {
    TEXT: 'bg-blue-500/20 text-blue-400',
    EMAIL: 'bg-emerald-500/20 text-emerald-400',
    NUMBER: 'bg-purple-500/20 text-purple-400',
    PARAGRAPH: 'bg-blue-400/20 text-blue-300',
    DROPDOWN: 'bg-amber-500/20 text-amber-400',
    RADIO: 'bg-orange-500/20 text-orange-400',
    CHECKBOX: 'bg-orange-400/20 text-orange-300',
    DATE: 'bg-indigo-500/20 text-indigo-400',
    TIME: 'bg-indigo-400/20 text-indigo-300',
    PHONE: 'bg-purple-400/20 text-purple-300',
    URL: 'bg-cyan-500/20 text-cyan-400',
    RATING: 'bg-yellow-500/20 text-yellow-400',
    FILE: 'bg-rose-500/20 text-rose-400',
    SIGNATURE: 'bg-rose-400/20 text-rose-300',
  };

  // Check for FILE/SIGNATURE required fields
  const hasBlockingFields = fields.some(
    (f) => f.is_required && (f.type === 'FILE' || f.type === 'MULTI_FILE' || f.type === 'SIGNATURE')
  );

  const ignoredCount = mappings.filter((m) => m.fieldId === 'IGNORE').length;
  const mappedCount = mappings.filter((m) => m.fieldId && m.fieldId !== 'IGNORE').length;

  return (
    <div className="space-y-6">
      {hasBlockingFields && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            FILE and SIGNATURE fields cannot be imported via CSV. Map them to "Ignore" to proceed.
          </span>
        </div>
      )}

      <div className="bg-[#151722] rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-2 gap-0 border-b border-slate-800 px-4 py-3 bg-[#0f0f1a]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CSV Column</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Form Field</p>
        </div>
        <div className="divide-y divide-slate-800/60">
          {mappings.map((mapping) => {
            const field = fields.find((f) => String(f.id) === mapping.fieldId);
            const isRequiredUnmapped = mapping.fieldId === '' && requiredFieldIds.size > 0;
            return (
              <div
                key={mapping.csvHeader}
                className={`grid grid-cols-2 gap-4 px-4 py-3 items-center ${
                  field?.is_required ? 'border-l-2 border-l-amber-500' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{mapping.csvHeader}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {parsed.rows[0]?.[mapping.csvHeader] ?? ''}
                  </p>
                </div>
                <div>
                  <select
                    value={mapping.fieldId}
                    onChange={(e) => setMapping(mapping.csvHeader, e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-orange-500/60 bg-[#0f0f1a] text-white ${
                      isRequiredUnmapped ? 'border-amber-500/40' : 'border-slate-700'
                    }`}
                  >
                    <option value="">— Not Mapped —</option>
                    <option value="IGNORE">🚫 Ignore this column</option>
                    {fields.map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.label} {f.is_required ? '*' : ''}
                      </option>
                    ))}
                  </select>
                  {field && (
                    <span className={`mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${FIELD_TYPE_BADGE[field.type] ?? 'bg-slate-700 text-slate-400'}`}>
                      {field.type}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span className="text-emerald-400">✓ {mappedCount} mapped</span>
        {unmappedRequired.length > 0 && (
          <span className="text-amber-400">⚠ {unmappedRequired.length} required unmapped</span>
        )}
        {ignoredCount > 0 && (
          <span className="text-slate-500">— {ignoredCount} ignored</span>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          disabled={unmappedRequired.length > 0 || hasBlockingFields}
          onClick={() => onComplete(mappings)}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition"
        >
          Next: Validate <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Validate
// ---------------------------------------------------------------------------

function ValidateStep({
  parsed,
  mappings,
  form,
  onBack,
  onComplete,
}: {
  parsed: ParsedCSV;
  mappings: ColumnMapping[];
  form: Form;
  onBack: () => void;
  onComplete: (validRows: Record<string, string>[], skipErrors: boolean, validationResult: ValidationResult) => void;
}) {
  const [validating, setValidating] = useState(true);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [excelDateNote, setExcelDateNote] = useState<string | null>(null);

  const fields = form.fields?.filter((f) => f.type !== 'SECTION') ?? [];
  const fieldById = Object.fromEntries(fields.map((f) => [String(f.id), f]));

  useEffect(() => {
    async function validate() {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let excelConversions = 0;

      // Build valid rows (mapped field_id → value)
      const validMappings = mappings.filter(
        (m) => m.fieldId && m.fieldId !== 'IGNORE' && m.fieldId !== ''
      );

      for (let i = 0; i < parsed.rows.length; i++) {
        const rawRow = parsed.rows[i];
        const rowNum = i + 2;

        for (const mapping of validMappings) {
          const field = fieldById[mapping.fieldId];
          if (!field) continue;
          let value = rawRow[mapping.csvHeader] ?? '';

          // Excel date conversion
          const numVal = Number(value);
          if (!isNaN(numVal) && numVal >= 25569 && numVal <= 60000 && field.type === 'DATE') {
            const converted = new Date((numVal - 25569) * 86400 * 1000);
            value = converted.toISOString().split('T')[0];
            excelConversions++;
          }

          // Required check
          if (field.is_required && (!value || value.trim() === '')) {
            errors.push({ row: rowNum, column: field.label, value: '', error: 'Required field is empty' });
            continue;
          }

          if (!value || value.trim() === '') {
            if (field.is_required) {
              warnings.push({ row: rowNum, column: field.label, issue: 'Optional field is empty' });
            }
            continue;
          }

          // Type validation
          if (field.type === 'EMAIL' && !EMAIL_RE.test(value.trim())) {
            errors.push({ row: rowNum, column: field.label, value, error: 'Invalid email format' });
          } else if ((field.type === 'NUMBER' || field.type === 'RATING') && isNaN(parseFloat(value))) {
            errors.push({ row: rowNum, column: field.label, value, error: 'Expected a number' });
          }
        }
      }

      if (excelConversions > 0) {
        setExcelDateNote(`Auto-converted ${excelConversions} Excel date value(s) to ISO format.`);
      }

      // Check duplicates via API
      const emailMappings = validMappings.filter((m) => fieldById[m.fieldId]?.type === 'EMAIL');
      let dupRecords: DuplicateRecord[] = [];

      if (emailMappings.length > 0) {
        const emails = parsed.rows
          .map((row) => row[emailMappings[0].csvHeader])
          .filter(Boolean);
        try {
          const res = await fetchApi<{ duplicates: DuplicateRecord[] }>(
            `/forms/${form.slug}/check-duplicates/`,
            { method: 'POST', body: JSON.stringify({ emails }) }
          );
          dupRecords = res.duplicates ?? [];
        } catch {
          // Non-fatal — proceed without duplicate info
        }
      }

      const errorRowNums = new Set(errors.map((e) => e.row));
      const dupEmails = new Set(dupRecords.map((d) => d.email));
      const dupRowNums = new Set<number>();
      if (emailMappings.length > 0) {
        parsed.rows.forEach((row, i) => {
          const email = row[emailMappings[0].csvHeader];
          if (email && dupEmails.has(email)) dupRowNums.add(i + 2);
        });
      }

      const cleanCount = parsed.rowCount - errorRowNums.size - dupRowNums.size;

      setResult({ errors, warnings, duplicates: dupRecords, cleanCount: Math.max(0, cleanCount) });
      setValidating(false);
    }

    validate();
  }, []);

  const buildValidRows = (): Record<string, string>[] => {
    const validMappings = mappings.filter(
      (m) => m.fieldId && m.fieldId !== 'IGNORE' && m.fieldId !== ''
    );
    const errorRowNums = new Set((result?.errors ?? []).map((e) => e.row));

    return parsed.rows
      .map((rawRow, i) => {
        const rowNum = i + 2;
        if (!skipErrors && errorRowNums.has(rowNum)) return null;
        if (skipErrors && errorRowNums.has(rowNum)) return null;
        const mapped: Record<string, string> = {};
        for (const mapping of validMappings) {
          mapped[mapping.fieldId] = rawRow[mapping.csvHeader] ?? '';
        }
        return mapped;
      })
      .filter((r): r is Record<string, string> => r !== null);
  };

  if (validating) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <p className="text-sm text-slate-400">Validating {parsed.rowCount} rows…</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Excel date note */}
      {excelDateNote && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {excelDateNote}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl bg-[#151722] border border-slate-800 text-xs">
        <span className="text-slate-400">
          <span className="text-white font-bold">{parsed.rowCount}</span> total rows
        </span>
        {result.errors.length > 0 && (
          <span className="text-rose-400 font-bold">{result.errors.length} errors</span>
        )}
        {result.warnings.length > 0 && (
          <span className="text-amber-400 font-bold">{result.warnings.length} warnings</span>
        )}
        {result.duplicates.length > 0 && (
          <span className="text-purple-400 font-bold">{result.duplicates.length} duplicates</span>
        )}
        <span className="text-emerald-400 font-bold">{result.cleanCount} will import cleanly</span>
      </div>

      {/* All duplicates */}
      {result.cleanCount === 0 && result.duplicates.length === parsed.rowCount && (
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">All rows already exist in the database.</p>
            <p className="text-[11px] text-purple-400 mt-1">Bulk update of existing responses is not supported yet. Please remove duplicate rows from your CSV and re-upload.</p>
          </div>
        </div>
      )}

      {/* Errors table */}
      {result.errors.length > 0 && (
        <div className="bg-[#151722] rounded-xl border border-rose-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-rose-500/20 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Errors — {result.errors.length} rows will be rejected
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="bg-[#0f0f1a] border-b border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Row</th>
                  <th className="px-4 py-2 text-left">Column</th>
                  <th className="px-4 py-2 text-left">Value</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.errors.slice(0, 20).map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-rose-400">{e.row}</td>
                    <td className="px-4 py-2 font-semibold">{e.column}</td>
                    <td className="px-4 py-2 font-mono text-amber-300 max-w-[120px] truncate">{e.value}</td>
                    <td className="px-4 py-2 text-rose-300">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings table */}
      {result.warnings.length > 0 && (
        <div className="bg-[#151722] rounded-xl border border-amber-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Warnings — {result.warnings.length} rows with issues
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="bg-[#0f0f1a] border-b border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Row</th>
                  <th className="px-4 py-2 text-left">Column</th>
                  <th className="px-4 py-2 text-left">Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.warnings.slice(0, 10).map((w, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-amber-400">{w.row}</td>
                    <td className="px-4 py-2 font-semibold">{w.column}</td>
                    <td className="px-4 py-2 text-amber-300">{w.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Duplicates table */}
      {result.duplicates.length > 0 && (
        <div className="bg-[#151722] rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-500/20 flex items-center gap-2">
            <Copy className="w-4 h-4 text-purple-400" />
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Duplicates — {result.duplicates.length} already in database
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead className="bg-[#0f0f1a] border-b border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Existing Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.duplicates.map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{d.email}</td>
                    <td className="px-4 py-2 text-purple-300">
                      Response #{d.response_id} — {new Date(d.submitted_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action selection */}
      {result.errors.length > 0 && (
        <div className="space-y-3 p-4 bg-[#151722] rounded-xl border border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose action for errors</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              checked={skipErrors}
              onChange={() => setSkipErrors(true)}
              className="mt-0.5 text-orange-500 focus:ring-orange-500"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                Skip error rows, import {result.cleanCount} clean rows
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Error rows will be skipped and logged.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              checked={!skipErrors}
              onChange={() => setSkipErrors(false)}
              className="mt-0.5 text-orange-500 focus:ring-orange-500"
            />
            <div>
              <p className="text-sm font-semibold text-white">Fix errors and re-upload</p>
              <p className="text-xs text-slate-500 mt-0.5">Go back to step 1 and fix the file.</p>
            </div>
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => {
            if (!skipErrors && result.errors.length > 0) {
              onBack();
              return;
            }
            onComplete(buildValidRows(), skipErrors, result);
          }}
          disabled={result.cleanCount === 0 && result.errors.length === 0 && parsed.rowCount === 0}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition"
        >
          Next: Import <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Ingest
// ---------------------------------------------------------------------------

function IngestStep({
  validRows,
  skipErrors,
  validationResult,
  form,
  onReset,
  onViewResponses,
}: {
  validRows: Record<string, string>[];
  skipErrors: boolean;
  validationResult: ValidationResult;
  form: Form;
  onReset: () => void;
  onViewResponses: () => void;
}) {
  const [status, setStatus] = useState<'confirm' | 'importing' | 'done' | 'error'>('confirm');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkIngestResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [idempotencyKey] = useState(generateIdempotencyKey());
  const [failedChunk, setFailedChunk] = useState<number | null>(null);

  const CHUNK_SIZE = 50;

  const runImport = async (startChunk = 0) => {
    setStatus('importing');
    setImportError(null);

    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      chunks.push(validRows.slice(i, i + CHUNK_SIZE));
    }

    const totalChunks = chunks.length || 1;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalDuplicates = 0;
    const allErrors: IngestError[] = [];

    try {
      for (let ci = startChunk; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const chunkKey = chunks.length === 1
          ? idempotencyKey
          : `${idempotencyKey}-chunk-${ci}`;

        const res = await fetch(
          `${API_BASE}/api/forms/${form.slug}/bulk-ingest/`,
          buildAuthFetchOptions('POST', {
            rows: chunk,
            idempotency_key: chunkKey,
            skip_errors: skipErrors,
          })
        );

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('This form no longer exists. Please reset and start over.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.errors?.[0]?.error || `Import failed at chunk ${ci + 1}`);
        }

        const data: BulkIngestResult = await res.json();
        totalImported += data.imported;
        totalSkipped += data.skipped;
        totalDuplicates += data.duplicates;
        allErrors.push(...(data.errors ?? []));

        setProgress(Math.round(((ci + 1) / totalChunks) * 100));
      }

      setResult({
        imported: totalImported,
        skipped: totalSkipped,
        duplicates: totalDuplicates,
        errors: allErrors,
      });
      setStatus('done');
    } catch (e: any) {
      const chunkIndex = Math.floor(
        (progress / 100) * totalChunks
      );
      setFailedChunk(chunkIndex);
      setImportError(e.message || 'Import failed unexpectedly.');
      setStatus('error');
    }
  };

  const downloadErrorReport = () => {
    if (!result) return;
    downloadCSV(
      result.errors.map((e) => ({
        Row: e.row,
        Field: e.field,
        Value: e.value,
        Error: e.error,
      })),
      `error-report-${form.slug}-${Date.now()}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {status === 'confirm' && (
        <>
          <div className="p-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 text-center space-y-3">
            <Upload className="w-10 h-10 text-orange-400 mx-auto" />
            <h3 className="text-base font-bold text-white">
              Ready to import {validRows.length} response{validRows.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-slate-400">
              into &quot;<span className="font-semibold text-white">{form.title}</span>&quot;.
              This action will be logged.
            </p>
            {validRows.length > CHUNK_SIZE && (
              <p className="text-xs text-slate-500">
                Large import: will be processed in{' '}
                {Math.ceil(validRows.length / CHUNK_SIZE)} chunks of {CHUNK_SIZE} rows each.
              </p>
            )}
          </div>
          <button
            onClick={() => runImport(0)}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <CheckCircle className="w-4 h-4" /> Confirm &amp; Import
          </button>
        </>
      )}

      {status === 'importing' && (
        <div className="space-y-6 py-8 text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto" />
          <div>
            <p className="text-base font-bold text-white">
              Importing… {Math.round((progress / 100) * validRows.length)} / {validRows.length} rows ({progress}%)
            </p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-300">Import paused</p>
              <p className="text-xs text-rose-400 mt-1">{importError}</p>
            </div>
          </div>
          <button
            onClick={() => runImport(failedChunk ?? 0)}
            className="w-full py-3 rounded-xl border border-orange-500 text-orange-400 hover:bg-orange-500/10 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" /> Retry from failed chunk
          </button>
          <button onClick={onReset} className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-bold transition">
            Start Over
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-white">Import Complete</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p>
                <span className="font-bold text-emerald-400">{result.imported}</span> responses imported successfully
              </p>
              {result.skipped > 0 && (
                <p><span className="font-bold text-rose-400">{result.skipped}</span> rows skipped (errors)</p>
              )}
              {result.duplicates > 0 && (
                <p><span className="font-bold text-purple-400">{result.duplicates}</span> duplicates ignored</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {result.errors.length > 0 && (
              <button
                onClick={downloadErrorReport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition"
              >
                <Download className="w-4 h-4" /> Download Error Report
              </button>
            )}
            <button
              onClick={onViewResponses}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition"
            >
              View Responses
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition"
            >
              <RefreshCw className="w-4 h-4" /> Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CSVIngestionTab orchestrator
// ---------------------------------------------------------------------------

interface CSVIngestionTabProps {
  forms: Form[];
  onSwitchSubtab: (tab: string, formSlug?: string) => void;
}

export function CSVIngestionTab({ forms, onSwitchSubtab }: CSVIngestionTabProps) {
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validRows, setValidRows] = useState<Record<string, string>[]>([]);
  const [skipErrors, setSkipErrors] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const reset = () => {
    setStep(0);
    setParsed(null);
    setFile(null);
    setSelectedForm(null);
    setMappings([]);
    setValidRows([]);
    setValidationResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <StepBar step={step} />

      {step === 0 && (
        <UploadStep
          forms={forms}
          onComplete={(p, f, form) => {
            setParsed(p);
            setFile(f);
            setSelectedForm(form);
            setStep(1);
          }}
        />
      )}

      {step === 1 && parsed && selectedForm && (
        <MapColumnsStep
          parsed={parsed}
          form={selectedForm}
          onBack={() => setStep(0)}
          onComplete={(m) => {
            setMappings(m);
            setStep(2);
          }}
        />
      )}

      {step === 2 && parsed && selectedForm && (
        <ValidateStep
          parsed={parsed}
          mappings={mappings}
          form={selectedForm}
          onBack={() => setStep(1)}
          onComplete={(rows, skip, vr) => {
            setValidRows(rows);
            setSkipErrors(skip);
            setValidationResult(vr);
            setStep(3);
          }}
        />
      )}

      {step === 3 && selectedForm && validationResult && (
        <IngestStep
          validRows={validRows}
          skipErrors={skipErrors}
          validationResult={validationResult}
          form={selectedForm}
          onReset={reset}
          onViewResponses={() => onSwitchSubtab('responses', selectedForm.slug)}
        />
      )}
    </div>
  );
}
