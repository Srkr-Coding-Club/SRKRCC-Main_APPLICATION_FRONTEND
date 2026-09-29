'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Search,
  Download,
  Mail,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
} from 'lucide-react';
import { Form, FormField, ResponseDetail, PaginatedResponse, ConfirmationEmailStatus } from '@/lib/types';
import { starsDisplay, downloadCSV, groupByDay } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { isSafeFileUrl } from '@/lib/urlSafety';
import { useToast } from '@/context/ToastContext';
import { DetailDrawer } from './DetailDrawer';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import EmailTemplateEditor, { EmailRecipient } from './EmailTemplateEditor';

const ResponseTimelineChart = dynamic(
  () => import('./ResponseTimelineChart'),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface ResponsesViewerTabProps {
  forms: Form[];
  initialFormSlug?: string;
}

/**
 * Custom-styled replacement for a native <select> of forms. A native select's
 * dropdown popup is rendered by the OS/browser chrome, not by our CSS — on
 * some browsers that popup came through as large blank rows instead of dark
 * theme, showing a mostly-empty white box with only the hovered row legible.
 * This renders the whole list ourselves (mirrors the ModernSelect pattern
 * already used on the public form page), so it always matches the app's
 * theme and never depends on how a given browser paints native option rows.
 */
function FormSelect({
  value,
  options,
  placeholder,
  onChange,
  className = '',
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 glass-panel border rounded-xl text-sm transition-colors ${
          isOpen ? 'border-orange-500/60' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <span className={`truncate ${selected ? 'text-[#1A1A2E] dark:text-white' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl glass-panel-solid p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect('')}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !value
                ? 'bg-[#FF7A00]/10 text-[#D85F00] dark:text-[#FF9A4A]'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5" />}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => handleSelect(o.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                o.value === value
                  ? 'bg-[#FF7A00]/10 font-semibold text-[#D85F00] dark:text-[#FF9A4A]'
                  : 'text-[#1A1A2E] dark:text-slate-300 hover:bg-[#FF7A00]/[0.08]'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check className="ml-2 w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function renderCellValue(type: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-600 italic text-[11px]">—</span>;
  }
  if (type === 'RATING') {
    return (
      <span className="text-yellow-400 text-sm tracking-tight" title={String(value)}>
        {starsDisplay(Number(value))}
      </span>
    );
  }
  if (type === 'SIGNATURE') {
    return (
      <img
        src={String(value)}
        alt="Signature"
        className="w-16 h-8 object-contain rounded border border-slate-300 dark:border-slate-700 bg-white"
      />
    );
  }
  if (type === 'FILE' || type === 'MULTI_FILE') {
    const files = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => {
          // Answer entry is either a bare string (legacy / absolute URL) or
          // { name, size, type?, url? }. url is a data: URI for inline captures.
          const url: string = typeof f === 'string' ? f : (f?.url || '');
          const name: string = typeof f === 'string'
            ? (f.split('/').pop() || `File ${i + 1}`)
            : (f?.name || `File ${i + 1}`);
          const isImg = typeof f === 'object' && typeof f?.type === 'string'
            ? f.type.startsWith('image/')
            : /^data:image\//.test(url) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);

          if (!url) {
            return (
              <span key={i} className="flex items-center gap-1 text-[11px] text-slate-500 italic" title="File contents were not stored">
                <Download className="w-3 h-3 flex-shrink-0 opacity-40" />
                <span className="truncate max-w-[140px] not-italic">{name}</span>
                <span>(no file)</span>
              </span>
            );
          }
          if (!isSafeFileUrl(url)) {
            // A respondent-controlled `javascript:`/`vbscript:` URL — form file
            // answers are metadata-only on the backend (name/size/extension are
            // validated, the url itself is not), so this is the last line of
            // defense before it would otherwise run in an admin's session on click.
            return (
              <span key={i} className="flex items-center gap-1 text-[11px] text-rose-500 italic" title="Blocked unsafe file URL">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[140px] not-italic">{name}</span>
              </span>
            );
          }
          return (
            <a
              key={i}
              href={url}
              download={name}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold max-w-[120px]"
              title={name}
            >
              {isImg ? (
                <img src={url} alt={name} className="w-16 h-16 object-cover rounded border border-slate-300 dark:border-slate-700 bg-white" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="truncate max-w-[120px]">{name}</span>
            </a>
          );
        })}
      </div>
    );
  }
  if (Array.isArray(value)) {
    return <span className="text-[11px]">{value.join(', ')}</span>;
  }
  if (typeof value === 'object') {
    return <span className="text-[11px] font-mono">{JSON.stringify(value)}</span>;
  }
  const str = String(value);
  return (
    <span
      className="text-[11px]"
      title={str.length > 50 ? str : undefined}
    >
      {str.length > 50 ? `${str.slice(0, 50)}…` : str}
    </span>
  );
}

function ConfirmationEmailBadge({ status }: { status: ConfirmationEmailStatus | null | undefined }) {
  if (!status) {
    return <span className="text-slate-400 italic text-[11px]">Not sent</span>;
  }
  const config = {
    SENT: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', label: 'Sent' },
    PENDING: { icon: Clock, cls: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
    RETRYING: { icon: Clock, cls: 'text-amber-600 dark:text-amber-400', label: 'Retrying' },
    FAILED: { icon: XCircle, cls: 'text-rose-600 dark:text-rose-400', label: 'Failed' },
  }[status.status] ?? { icon: Clock, cls: 'text-slate-500', label: status.status };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${config.cls}`}
      title={status.error_message || status.recipient_email || undefined}
    >
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  );
}

function ConfirmationEmailCell({
  response,
  formConfirmationEnabled,
  onResend,
  resending,
}: {
  response: ResponseDetail;
  formConfirmationEnabled: boolean;
  onResend: (id: number) => void;
  resending: boolean;
}) {
  if (!formConfirmationEnabled && !response.confirmation_email) {
    return <span className="text-slate-400 text-[11px]">—</span>;
  }
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <ConfirmationEmailBadge status={response.confirmation_email} />
      {formConfirmationEnabled && (
        <button
          onClick={() => onResend(response.id)}
          disabled={resending}
          title={response.confirmation_email ? 'Resend confirmation email' : 'Send confirmation email'}
          className="flex items-center justify-center min-h-8 min-w-8 p-1.5 rounded-lg text-slate-400 hover:text-[#FF7A00] disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-90"
        >
          <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

function ResponseDrawerContent({
  response, form, onResend, resending,
}: {
  response: ResponseDetail;
  form: Form;
  onResend: (id: number) => void;
  resending: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-500">Respondent</p>
          <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">
            {response.user?.name || response.user_name || (response.is_manual_entry ? 'Admin Entry' : 'Anonymous Student')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {response.user?.email || response.user_email || 'No email provided'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { label: 'Submitted', value: new Date(response.submitted_at).toLocaleString('en-IN') },
            { label: 'Form Version', value: `v${response.form_version}` },
            { label: 'Type', value: response.is_manual_entry ? 'Manual Entry' : response.is_test_submission ? 'Test' : 'Public' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
              <div className="text-xs font-semibold text-[#1A1A2E] dark:text-white mt-1">{value}</div>
            </div>
          ))}
        </div>
        {(form.confirmation_email_enabled || response.confirmation_email) && (
          <div className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Confirmation Email</div>
              <div className="mt-1"><ConfirmationEmailBadge status={response.confirmation_email} /></div>
              {response.confirmation_email?.error_message && (
                <p className="text-[10px] text-rose-500 mt-1 max-w-[220px] truncate" title={response.confirmation_email.error_message}>
                  {response.confirmation_email.error_message}
                </p>
              )}
            </div>
            {form.confirmation_email_enabled && (
              <button
                onClick={() => onResend(response.id)}
                disabled={resending}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FF7A00]/10 text-[#FF7A00] hover:bg-[#FF7A00]/20 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
              >
                <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                {response.confirmation_email ? 'Resend' : 'Send Now'}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Answers */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Answers</p>
        {response.answers.map((ans) => (
          <div key={ans.field_id} className="border-b border-slate-200 dark:border-slate-800/60 pb-3 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{ans.field_label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-500 font-mono">
                {ans.field_type}
              </span>
            </div>
            <div>{renderCellValue(ans.field_type, ans.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResponsesViewerTab({ forms, initialFormSlug }: ResponsesViewerTabProps) {
  const { toast } = useToast();
  const [selectedSlug, setSelectedSlug] = useState<string>(initialFormSlug || '');
  const [data, setData] = useState<PaginatedResponse<ResponseDetail> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [manualOnly, setManualOnly] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerResponse, setDrawerResponse] = useState<ResponseDetail | null>(null);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [resendingIds, setResendingIds] = useState<Set<number>>(new Set());

  const formOptions = useMemo(
    () => forms.map((f) => ({ value: f.slug, label: f.title?.trim() || f.slug || 'Untitled form' })),
    [forms]
  );

  const selectedForm = forms.find((f) => f.slug === selectedSlug) ?? null;
  const fieldColumns: FormField[] = useMemo(
    () => (selectedForm?.fields?.filter((f) => f.type !== 'SECTION') ?? []),
    [selectedForm]
  );

  const loadResponses = useCallback(async () => {
    if (!selectedSlug) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(manualOnly && { manual_only: 'true' }),
      });
      const result = await fetchApi<PaginatedResponse<ResponseDetail>>(
        `/forms/${selectedSlug}/responses/?${params}`
      );
      setData(result);
    } catch (err: any) {
      setData(null);
      toast.error('Failed to Load Responses', err?.message || 'Is the backend running?');
    }
    setLoading(false);
  }, [selectedSlug, page, debouncedSearch, dateFrom, dateTo, manualOnly, toast]);

  // Debounce the raw search input so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { loadResponses(); }, [loadResponses]);
  useEffect(() => { setPage(1); }, [selectedSlug, debouncedSearch, dateFrom, dateTo, manualOnly]);

  const timelineData = useMemo(() => {
    const timestamps = data?.results?.map((r) => r.submitted_at) ?? [];
    return groupByDay(timestamps);
  }, [data]);

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  const hasGap = (resp: ResponseDetail): boolean => {
    const requiredFieldIds = new Set(
      fieldColumns.filter((f) => f.is_required).map((f) => Number(f.id))
    );
    if (requiredFieldIds.size === 0) return false;
    for (const ans of resp.answers) {
      if (requiredFieldIds.has(ans.field_id)) {
        const v = ans.value;
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          return true;
        }
      }
    }
    return false;
  };

  const getAnswerForField = (resp: ResponseDetail, fieldId: number | string) =>
    resp.answers.find((a) => a.field_id === Number(fieldId));

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkExport = () => {
    const rows = (data?.results ?? []).filter((r) => selectedIds.has(r.id));
    const flat = rows.map((r) => {
      const base: Record<string, unknown> = {
        id: r.id,
        submitted_at: r.submitted_at,
        respondent: r.user?.email ?? 'Anonymous',
        is_manual_entry: r.is_manual_entry,
      };
      r.answers.forEach((a) => {
        // FILE answers hold {name,size,url} objects (url can be a huge data: URI)
        // — export just the file name(s), never the blob.
        if ((a.field_type === 'FILE' || a.field_type === 'MULTI_FILE') && a.value) {
          const items = Array.isArray(a.value) ? a.value : [a.value];
          base[a.field_label] = items
            .map((f: any) => (typeof f === 'string' ? f : f?.name))
            .filter(Boolean)
            .join('; ');
        } else {
          base[a.field_label] = a.value;
        }
      });
      return base;
    });
    downloadCSV(flat, `responses-${selectedSlug}-${Date.now()}.csv`);
  };

  const selectedRecipients: EmailRecipient[] = useMemo(() => {
    const rows = (data?.results ?? []).filter((r) => selectedIds.has(r.id));
    const emails: EmailRecipient[] = rows
      .map((r) => ({ email: r.user?.email || r.user_email || '', name: r.user?.name || r.user_name }))
      .filter((r) => r.email.length > 0);
    // De-dupe in case the same respondent submitted more than once.
    const seen = new Set<string>();
    return emails.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  }, [data, selectedIds]);

  const handleResend = async (responseId: number) => {
    setResendingIds((prev) => new Set(prev).add(responseId));
    try {
      const result = await fetchApi<{ success: boolean; status: string; recipient_email: string | null }>(
        `/forms/submissions/${responseId}/resend-confirmation-email/`,
        { method: 'POST' }
      );
      const updated: ConfirmationEmailStatus = {
        status: (result.status as ConfirmationEmailStatus['status']) || 'SENT',
        sent_at: new Date().toISOString(),
        error_message: '',
        recipient_email: result.recipient_email || '',
      };
      setData((prev) =>
        prev
          ? { ...prev, results: prev.results.map((r) => (r.id === responseId ? { ...r, confirmation_email: updated } : r)) }
          : prev
      );
      setDrawerResponse((prev) => (prev && prev.id === responseId ? { ...prev, confirmation_email: updated } : prev));
      toast.success('Confirmation Email Sent', result.recipient_email ? `Sent to ${result.recipient_email}.` : 'Sent successfully.');
    } catch (err: any) {
      toast.error('Send Failed', err?.message || 'Could not send the confirmation email.');
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev);
        next.delete(responseId);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Permanently delete ${count} response${count === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }
    try {
      const result = await fetchApi<{ deleted_count: number }>(
        `/forms/${selectedSlug}/responses/bulk-delete/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response_ids: Array.from(selectedIds) }),
        }
      );
      toast.success('Responses Deleted', `Deleted ${result.deleted_count} response${result.deleted_count === 1 ? '' : 's'}.`);
      setSelectedIds(new Set());
      await loadResponses();
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Could not delete the selected responses.');
    }
  };

  // --- No form selected ---
  if (!selectedSlug) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <Inbox className="w-12 h-12 text-slate-700" />
        <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">Select a form to view responses</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose a form from the dropdown above.</p>
        <FormSelect
          value={selectedSlug}
          options={formOptions}
          placeholder="Select a form…"
          onChange={setSelectedSlug}
          className="mt-2 w-72"
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header controls */}
        <div className="flex flex-wrap items-center gap-3">
          <FormSelect
            value={selectedSlug}
            options={formOptions}
            placeholder="Select a form…"
            onChange={(v) => { setSelectedSlug(v); setSelectedIds(new Set()); }}
            className="flex-1 min-w-[200px]"
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm glass-panel border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/60 w-48"
            />
          </div>

          {/* Date range */}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="py-2 px-3 text-sm glass-panel border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 focus:outline-none focus:border-orange-500/60" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="py-2 px-3 text-sm glass-panel border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 focus:outline-none focus:border-orange-500/60" />

          {/* Toggles */}
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={manualOnly} onChange={(e) => setManualOnly(e.target.checked)}
              className="rounded border-slate-600 text-orange-500 focus:ring-orange-500" />
            Manual Only
          </label>

          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition active:scale-95 ${showChart ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span><span className="text-[#1A1A2E] dark:text-white font-bold">{data.count}</span> responses</span>
          </div>
        )}

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-xs font-bold text-orange-400">{selectedIds.size} selected</span>
            <button onClick={handleBulkExport} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#1A1A2E] dark:hover:text-white transition-transform duration-100 active:scale-95">
              <Download className="w-3 h-3" /> Export
            </button>
            <button
              onClick={() => setShowEmailEditor(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-transform duration-100 active:scale-95"
            >
              <Mail className="w-3 h-3" /> Email
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-transform duration-100 active:scale-95"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-transform duration-100 active:scale-95">Clear</button>
          </div>
        )}

        {/* Timeline chart */}
        {showChart && (
          <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4">Submissions Per Day — Last 30 Days</p>
            <ResponseTimelineChart data={timelineData} />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading responses…</p>
          </div>
        ) : !data || data.count === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <Inbox className="w-10 h-10 text-slate-700" />
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">No responses yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Share the form link with club members to start collecting.</p>
          </div>
        ) : (
          <div className="glass-panel rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-[#FAFAFC] dark:bg-[#0f0f1a] border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="sticky left-0 z-20 bg-[#FAFAFC] dark:bg-[#0f0f1a] px-4 py-3 w-10">
                      <button
                        onClick={() => {
                          const allIds = data.results.map((r) => r.id);
                          if (selectedIds.size === allIds.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(allIds));
                        }}
                        className="flex items-center justify-center min-h-8 min-w-8 p-2 rounded-lg text-slate-500 hover:text-orange-400 transition-transform duration-100 active:scale-90"
                      >
                        {selectedIds.size === data.results.length
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="sticky left-10 z-20 bg-[#FAFAFC] dark:bg-[#0f0f1a] px-4 py-3 font-bold min-w-[160px] border-r border-slate-200 dark:border-slate-800">
                      Respondent
                    </th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Submitted</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Confirmation Email</th>
                    {fieldColumns.map((f) => (
                      <th key={f.id} className="px-4 py-3 font-bold whitespace-nowrap min-w-[120px]">
                        {f.label}
                        {f.is_required && <span className="text-rose-400 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {data.results.map((resp) => {
                    const gap = hasGap(resp);
                    const isSelected = selectedIds.has(resp.id);
                    const rowBg = resp.is_manual_entry
                      ? 'border-l-2 border-l-purple-500'
                      : resp.is_test_submission
                      ? 'border-l-2 border-l-blue-400'
                      : '';
                    return (
                      <tr
                        key={resp.id}
                        className={`${rowBg} ${gap ? 'bg-rose-500/5' : ''} hover:bg-slate-800/20 active:bg-slate-200 dark:active:bg-slate-800/40 transition cursor-pointer`}
                        onClick={() => setDrawerResponse(resp)}
                      >
                        <td className="sticky left-0 z-10 glass-panel px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleRow(resp.id)} className="flex items-center justify-center min-h-8 min-w-8 p-2 rounded-lg text-slate-500 hover:text-orange-400 transition-transform duration-100 active:scale-90">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="sticky left-10 z-10 glass-panel px-4 py-3 border-r border-slate-200 dark:border-slate-800/60 font-semibold">
                          <div className="flex items-center gap-2">
                            {gap && <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                {resp.user?.name || resp.user_name || (resp.is_manual_entry ? 'Admin Entry' : 'Anonymous Student')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">
                                {resp.user?.email || resp.user_email || 'No email'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(resp.submitted_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <ConfirmationEmailCell
                            response={resp}
                            formConfirmationEnabled={!!selectedForm?.confirmation_email_enabled}
                            onResend={handleResend}
                            resending={resendingIds.has(resp.id)}
                          />
                        </td>
                        {fieldColumns.map((f) => {
                          const ans = getAnswerForField(resp, f.id);
                          return (
                            <td key={f.id} className="px-4 py-3">
                              {renderCellValue(f.type, ans?.value ?? null)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-30 transition active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page <span className="font-bold text-[#1A1A2E] dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-[#1A1A2E] dark:text-white">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#1A1A2E] dark:hover:text-white disabled:opacity-30 transition active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Response Detail Drawer */}
      <AnimatePresence>
        {drawerResponse && selectedForm && (
          <DetailDrawer
            isOpen={!!drawerResponse}
            onClose={() => setDrawerResponse(null)}
            title={`Response #${drawerResponse.id}`}
          >
            <ResponseDrawerContent
              response={drawerResponse}
              form={selectedForm}
              onResend={handleResend}
              resending={resendingIds.has(drawerResponse.id)}
            />
          </DetailDrawer>
        )}
      </AnimatePresence>

      {/* Bulk Email Composer */}
      <EmailTemplateEditor
        open={showEmailEditor}
        onClose={() => setShowEmailEditor(false)}
        mode="send"
        recipients={selectedRecipients}
        onSent={() => {
          setSelectedIds(new Set());
          setShowEmailEditor(false);
        }}
      />
    </>
  );
}
