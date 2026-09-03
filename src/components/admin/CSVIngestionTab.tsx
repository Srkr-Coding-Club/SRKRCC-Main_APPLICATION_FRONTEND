'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
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
  Calendar,
  Trophy,
  Archive,
  Sparkles,
  ShieldCheck,
  Mail,
  Send,
  Database,
  Search,
  Eye,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  Form,
  BackupDomainKey,
  BackupDomainMetadata,
  BackupJobRecord,
  UniversalAnalysisResponse,
  UniversalPreviewResponse,
} from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';

interface CSVIngestionTabProps {
  forms?: Form[];
  onSwitchSubtab?: (subtab: string) => void;
}

export function CSVIngestionTab({ forms = [] }: CSVIngestionTabProps) {
  const { toast } = useToast();

  // Top-level Mode: Wizard vs Archive History
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');

  // Wizard Step: 1 = Intake, 2 = Domain, 3 = Mapping, 4 = Validation, 5 = Commit
  const [currentStep, setCurrentStep] = useState<number>(1);

  // File & Intake State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [backupJob, setBackupJob] = useState<BackupJobRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Domain Metadata & Selection
  const [domains, setDomains] = useState<BackupDomainMetadata[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<BackupDomainKey>('USERS');
  const [targetFormId, setTargetFormId] = useState<number | null>(null);

  // Analysis & Mapping State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<UniversalAnalysisResponse | null>(null);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});

  // Preview & Commit State
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [preview, setPreview] = useState<UniversalPreviewResponse | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  // History Tab State
  const [backupHistory, setBackupHistory] = useState<BackupJobRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Fetch Domain Metadata on Mount
  useEffect(() => {
    async function loadDomains() {
      try {
        const data = await fetchApi<BackupDomainMetadata[]>('/api/admin/backups/domains/');
        setDomains(data);
      } catch (err) {
        console.warn('Failed to load backup domain metadata:', err);
      }
    }
    loadDomains();
  }, []);

  // Fetch History when opening History Tab
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchApi<BackupJobRecord[]>('/api/admin/backups/');
      setBackupHistory(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load backup archives');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Handle File Selection & Intake
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetchApi<any>('/api/admin/backups/upload/', {
        method: 'POST',
        body: formData,
      });

      const jobRecord: BackupJobRecord = {
        id: res.backup_id,
        original_filename: res.filename,
        file_size_bytes: res.file_size,
        file_format: file.name.endsWith('.xlsx') ? 'XLSX' : 'CSV',
        file_sha256: res.sha256,
        total_rows: res.total_rows,
        headers: res.headers,
        suggested_domain: res.suggested_domain || 'USERS',
        suggestion_confidence: res.confidence_percentage || '0.00',
        status: 'AWAITING_DOMAIN_SELECTION',
        created_at: new Date().toISOString(),
        uploader: 'You',
      };

      setBackupJob(jobRecord);
      if (res.suggested_domain) {
        setSelectedDomain(res.suggested_domain as BackupDomainKey);
      }

      toast.success(`Backup preserved! Detected ${res.total_rows} rows.`);
      setCurrentStep(2);
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Run Domain Analysis
  const runDomainAnalysis = async (domainKey: BackupDomainKey) => {
    if (!backupJob) return;
    setIsAnalyzing(true);
    try {
      const res = await fetchApi<UniversalAnalysisResponse>(`/api/admin/backups/${backupJob.id}/analyze/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_domain: domainKey,
          target_form_id: domainKey === 'FORMS' ? targetFormId : undefined,
        }),
      });

      setAnalysis(res);
      setCustomMapping(res.suggested_mapping);
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Row-Level Preview
  const runPreview = async () => {
    if (!backupJob) return;
    setIsPreviewing(true);
    try {
      const res = await fetchApi<UniversalPreviewResponse>(`/api/admin/backups/${backupJob.id}/preview/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_domain: selectedDomain,
          mapping: customMapping,
          target_form_id: selectedDomain === 'FORMS' ? targetFormId : undefined,
        }),
      });

      setPreview(res);
      setCurrentStep(5);
      toast.info(`Preview ready: ${res.valid_records} valid records found.`);
    } catch (err: any) {
      toast.error(err.message || 'Preview generation failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Commit Domain Records
  const handleCommit = async () => {
    if (!backupJob || !preview) return;
    setIsCommitting(true);
    try {
      const res = await fetchApi<any>(`/api/admin/backups/${backupJob.id}/imports/${preview.attempt_id}/commit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send_welcome_email: sendWelcomeEmail,
        }),
      });

      setCommitResult(res);
      toast.success(`Successfully imported ${res.imported_count} records into ${selectedDomain}!`);
    } catch (err: any) {
      toast.error(err.message || 'Import commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  // Direct Escape Hatch: Archive to Raw Vault
  const handleArchiveRaw = async () => {
    if (!backupJob) return;
    setIsCommitting(true);
    try {
      const res = await fetchApi<any>(`/api/admin/backups/${backupJob.id}/archive-raw/`, {
        method: 'POST',
      });
      setCommitResult({
        success: true,
        is_raw_vault: true,
        imported_count: res.imported_count || backupJob.total_rows,
      });
      toast.success('Backup preserved in schemaless Raw Vault!');
    } catch (err: any) {
      toast.error(err.message || 'Raw vault archiving failed');
    } finally {
      setIsCommitting(false);
    }
  };

  // Reset Wizard
  const handleReset = () => {
    setSelectedFile(null);
    setBackupJob(null);
    setAnalysis(null);
    setPreview(null);
    setCommitResult(null);
    setCurrentStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const domainIcons: Record<BackupDomainKey, React.ReactNode> = {
    USERS: <Users className="w-6 h-6 text-indigo-400" />,
    FORMS: <Layers className="w-6 h-6 text-emerald-400" />,
    EVENTS: <Calendar className="w-6 h-6 text-amber-400" />,
    HACKATHONS: <Trophy className="w-6 h-6 text-purple-400" />,
    UNKNOWN_RAW: <Archive className="w-6 h-6 text-cyan-400" />,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Universal Engine
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Universal Backup Center</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Preserve arbitrary college spreadsheets, map structured domains, or store in the schemaless Raw Vault.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'wizard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Ingestion Wizard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Backup Vault Archive
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INGESTION WIZARD */}
      {/* ========================================================================= */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Step Progression Bar */}
          <div className="grid grid-cols-5 gap-2 p-3 bg-slate-900/40 rounded-xl border border-slate-800/80">
            {[
              { step: 1, label: 'Intake & Preserve' },
              { step: 2, label: 'Domain Target' },
              { step: 3, label: 'Column Mapping' },
              { step: 4, label: 'Schema Validation' },
              { step: 5, label: 'Commit & Actions' },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentStep === s.step
                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                    : currentStep > s.step
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === s.step
                      ? 'bg-indigo-600 text-white'
                      : currentStep > s.step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentStep > s.step ? '✓' : s.step}
                </div>
                <span className="hidden md:inline truncate">{s.label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: INTAKE & PRESERVE */}
          {currentStep === 1 && (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-12 transition-all cursor-pointer bg-slate-950/40 hover:bg-slate-900/50 flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-4 shadow-lg shadow-indigo-500/10">
                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-semibold text-white">Upload Application Backup Spreadsheet</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md">
                  Drag and drop a <span className="text-indigo-400 font-mono">.csv</span> or{' '}
                  <span className="text-indigo-400 font-mono">.xlsx</span> file here, or click to browse. Max 10 MB, up to 10,000 rows.
                </p>

                <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> SHA-256 Hashed
                  </span>
                  <span>•</span>
                  <span>Zero-Loss Provenance</span>
                  <span>•</span>
                  <span>Preserve-First Invariant</span>
                </div>
              </div>

              {/* Mock Datasets & Sample Files Download Box */}
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-xs font-semibold">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <span>Download Pre-formatted Mock Datasets for Testing</span>
                  </div>
                  <span className="text-[11px] text-slate-500">CSV & Excel formats ready</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {[
                    {
                      label: 'Users Directory',
                      csv: '/sample_backups/01_users_members_directory.csv',
                      xlsx: '/sample_backups/01_users_members_directory.xlsx',
                      desc: '10 members with Club IDs',
                    },
                    {
                      label: 'Events Schedule',
                      csv: '/sample_backups/02_events_schedule.csv',
                      xlsx: '/sample_backups/02_events_schedule.xlsx',
                      desc: '5 club workshops & talks',
                    },
                    {
                      label: 'Hackathons Catalog',
                      csv: '/sample_backups/03_hackathons_catalog.csv',
                      xlsx: '/sample_backups/03_hackathons_catalog.xlsx',
                      desc: '3 major hackathons',
                    },
                    {
                      label: 'Form Submissions',
                      csv: '/sample_backups/04_forms_workshop_registrations.csv',
                      xlsx: '/sample_backups/04_forms_workshop_registrations.xlsx',
                      desc: 'Custom dynamic responses',
                    },
                    {
                      label: 'Raw Vault (Inventory)',
                      csv: '/sample_backups/05_unknown_raw_legacy_inventory.csv',
                      xlsx: '/sample_backups/05_unknown_raw_legacy_inventory.xlsx',
                      desc: 'Hardware items (schemaless)',
                    },
                  ].map((d) => (
                    <div
                      key={d.label}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                    >
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">{d.label}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{d.desc}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <a
                          href={d.csv}
                          download
                          className="flex-1 py-1 px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold text-center transition"
                        >
                          .CSV
                        </a>
                        <a
                          href={d.xlsx}
                          download
                          className="flex-1 py-1 px-2 rounded-md bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-bold text-center border border-indigo-500/30 transition"
                        >
                          .XLSX
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOMAIN TARGET SELECTION */}
          {currentStep === 2 && backupJob && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-semibold text-white">What does this backup contain?</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      File: <span className="text-white font-mono">{backupJob.original_filename}</span> ({backupJob.total_rows} rows,{' '}
                      {backupJob.headers.length} columns)
                    </p>
                  </div>

                  {backupJob.suggested_domain && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                      <Sparkles className="w-4 h-4" />
                      Suggested Domain: <strong className="uppercase">{backupJob.suggested_domain}</strong> (
                      {backupJob.suggestion_confidence}%)
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {[
                    {
                      key: 'USERS' as BackupDomainKey,
                      title: 'Club Member Directory',
                      desc: 'Accounts with permanent Club IDs (25SCC...), branch, and historical join date.',
                      req: 'Email or Club ID required (≥50% match)',
                    },
                    {
                      key: 'FORMS' as BackupDomainKey,
                      title: 'Form Submissions',
                      desc: 'Dynamic survey responses or registrations tied to a published club form.',
                      req: 'Requires selecting target Form',
                    },
                    {
                      key: 'EVENTS' as BackupDomainKey,
                      title: 'Events & Workshops',
                      desc: 'Technical workshops, sessions, bootcamps, and club schedules.',
                      req: 'Title required (Deduplicates by Title + Start Time)',
                    },
                    {
                      key: 'HACKATHONS' as BackupDomainKey,
                      title: 'Hackathons & Sprints',
                      desc: '48hr build sprints, flagship hackathons, prize pools, and tracks.',
                      req: 'Title required (Deduplicates by Title + Start Date)',
                    },
                    {
                      key: 'UNKNOWN_RAW' as BackupDomainKey,
                      title: 'Unknown / Schemaless Raw Vault',
                      desc: 'Preserves arbitrary columns with zero schema constraints in PostgreSQL vault.',
                      req: 'Zero schema restrictions • 100% Guaranteed preservation',
                    },
                  ].map((dom) => {
                    const isSelected = selectedDomain === dom.key;
                    return (
                      <div
                        key={dom.key}
                        onClick={() => setSelectedDomain(dom.key)}
                        className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500/80 shadow-lg shadow-indigo-600/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                              {domainIcons[dom.key]}
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-indigo-400" />}
                          </div>
                          <h4 className="text-base font-semibold text-white">{dom.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{dom.desc}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
                          {dom.req}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Target Form Selector if FORMS is chosen */}
                {selectedDomain === 'FORMS' && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Select Target Published Form:
                    </label>
                    <select
                      value={targetFormId || ''}
                      onChange={(e) => setTargetFormId(Number(e.target.value) || null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Target Form --</option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.fields?.length || 0} questions)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                  >
                    Cancel & Upload New
                  </button>
                  <button
                    onClick={() => {
                      if (selectedDomain === 'UNKNOWN_RAW') {
                        handleArchiveRaw();
                      } else {
                        runDomainAnalysis(selectedDomain);
                      }
                    }}
                    disabled={isAnalyzing || (selectedDomain === 'FORMS' && !targetFormId)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Schema...
                      </>
                    ) : selectedDomain === 'UNKNOWN_RAW' ? (
                      <>
                        <Archive className="w-4 h-4" /> Save Directly to Raw Vault
                      </>
                    ) : (
                      <>
                        Continue to Column Mapping <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING */}
          {currentStep === 3 && analysis && backupJob && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Column Mapping Configuration</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Target Domain: <strong className="text-indigo-400">{analysis.domain_display}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono">
                      {backupJob.headers.length} Uploaded Columns
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {Object.values(customMapping).filter(Boolean).length} Mapped
                    </span>
                  </div>
                </div>

                {/* Mapping Grid */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      <tr>
                        <th className="p-3.5 rounded-l-lg">Source Column (Uploaded)</th>
                        <th className="p-3.5">Mapped Target Field</th>
                        <th className="p-3.5 rounded-r-lg">Field Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {backupJob.headers.map((hdr) => {
                        const currentMapped = customMapping[hdr] || '';
                        const isMapped = Boolean(currentMapped);
                        return (
                          <tr key={hdr} className="hover:bg-slate-800/30">
                            <td className="p-3.5 font-medium text-white font-mono text-xs">{hdr}</td>
                            <td className="p-3.5">
                              <select
                                value={currentMapped}
                                onChange={(e) => {
                                  setCustomMapping((prev) => ({
                                    ...prev,
                                    [hdr]: e.target.value,
                                  }));
                                }}
                                className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Ignore / Keep in Raw Provenance --</option>
                                {Object.entries(analysis.expected_fields).map(([k, aliases]) => {
                                  const displayLabel = aliases && aliases.length > 0 && selectedDomain === 'FORMS'
                                    ? aliases[0]
                                    : k;
                                  return (
                                    <option key={k} value={k}>
                                      {displayLabel} {analysis.required_fields.includes(k) ? '(REQUIRED)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="p-3.5">
                              {isMapped ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  <CheckCircle className="w-3.5 h-3.5" /> Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md font-mono">
                                  Unmapped (Preserved in Raw)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Domain Selection
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Verify Schema & 50% Rule <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SCHEMA VALIDATION & 50% CONFIDENCE GAUGE */}
          {currentStep === 4 && analysis && backupJob && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-1">Domain Schema Validation</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Evaluation against <span className="text-indigo-400 font-semibold">{analysis.domain_display}</span>{' '}
                  invariants.
                </p>

                {/* Score Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400 font-medium">Required Fields Status</div>
                    <div className="flex items-center gap-2 mt-2">
                      {analysis.required_fields_satisfied ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-base font-bold text-emerald-400">PASSED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-400" />
                          <span className="text-base font-bold text-rose-400">MISSING REQUIRED</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Required: {analysis.required_fields.join(', ') || 'None'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400 font-medium">Schema Match Confidence</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {analysis.schema_confidence_percentage}%
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          parseFloat(analysis.schema_confidence_percentage) >= 50
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, parseFloat(analysis.schema_confidence_percentage))}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-xs text-slate-400 font-medium">Import Eligibility</div>
                    <div className="flex items-center gap-2 mt-2">
                      {analysis.is_eligible_for_structured_import ? (
                        <>
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <span className="text-base font-bold text-emerald-400">ELIGIBLE (≥50%)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          <span className="text-base font-bold text-amber-400">FAIL (BELOW 50%)</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Requires Pass + ≥50% canonical field match
                    </div>
                  </div>
                </div>

                {/* Validation Banner */}
                {!analysis.is_eligible_for_structured_import && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-300">Structured Import Requirements Not Met</h4>
                        <p className="text-xs text-amber-400/80 mt-1">
                          This spreadsheet does not meet the 50% column matching threshold or is missing essential required keys.
                          You can still preserve this backup forensically in the Raw Vault!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleArchiveRaw}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition-all shrink-0"
                    >
                      Save as Raw Vault Backup
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Column Mapping
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleArchiveRaw}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
                    >
                      Save to Raw Vault Instead
                    </button>
                    <button
                      onClick={runPreview}
                      disabled={isPreviewing || !analysis.is_eligible_for_structured_import}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {isPreviewing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating Preview...
                        </>
                      ) : (
                        <>
                          Generate Row-Level Preview <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW & COMMIT */}
          {currentStep === 5 && preview && backupJob && (
            <div className="space-y-6">
              {commitResult ? (
                /* Success Screen */
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {commitResult.is_raw_vault ? 'Backup Successfully Preserved in Raw Vault!' : 'Domain Import Completed!'}
                  </h3>
                  <p className="text-sm text-emerald-400 mt-1">
                    Processed <strong className="text-white">{commitResult.imported_count}</strong> records into{' '}
                    <span className="uppercase font-semibold">{selectedDomain}</span>.
                  </p>

                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm"
                    >
                      Upload Another Backup
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        setActiveTab('history');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/20"
                    >
                      View in Vault Archive
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview State */
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Row-Level Ingestion Preview</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Domain: <strong className="text-indigo-400">{selectedDomain}</strong> • {preview.valid_records} valid of{' '}
                        {preview.total_records} rows
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {preview.inserted_records} New Records
                      </span>
                      <span className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {preview.updated_records} Updates
                      </span>
                      {preview.conflict_records > 0 && (
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {preview.conflict_records} Conflicts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sample Rows Table */}
                  <div className="mt-6 overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Primary Identifier</th>
                          <th className="p-3">Normalized Payload</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {preview.rows_sample.map((row) => (
                          <tr key={row.source_row_number} className="hover:bg-slate-800/30">
                            <td className="p-3 text-slate-500">{row.source_row_number}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                            <td className="p-3 font-medium text-white">
                              {row.normalized_data.email ||
                                row.normalized_data.club_id ||
                                row.normalized_data.title ||
                                '—'}
                            </td>
                            <td className="p-3 text-slate-400 truncate max-w-xs">
                              {JSON.stringify(row.normalized_data)}
                            </td>
                            <td className="p-3">
                              {row.is_valid ? (
                                <span className="text-emerald-400">Ready</span>
                              ) : (
                                <span className="text-rose-400 truncate block max-w-xs">{row.error_message}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Domain-specific Action: Welcome Email */}
                  {selectedDomain === 'USERS' && (
                    <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h4 className="text-sm font-semibold text-white">Member Welcome Email Campaign</h4>
                          <p className="text-xs text-slate-400">
                            Automatically queue personalized welcome emails with allocated Club IDs.
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={sendWelcomeEmail}
                          onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900"
                        />
                        Send Emails
                      </label>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to Validation
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleArchiveRaw}
                        disabled={isCommitting}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
                      >
                        Save as Raw Archive
                      </button>
                      <button
                        onClick={handleCommit}
                        disabled={isCommitting || preview.valid_records === 0}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isCommitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Committing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" /> Confirm & Import {preview.valid_records} Records
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BACKUP ARTIFACTS & RAW VAULT ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search backups by filename or SHA-256 hash..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 font-medium transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Refresh Vault
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                <p className="text-sm">Loading backup vault archives...</p>
              </div>
            ) : backupHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Archive className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h4 className="text-base font-semibold text-slate-400">No Backup Archives Found</h4>
                <p className="text-xs mt-1">Upload a spreadsheet via the Ingestion Wizard to preserve it here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3.5">Filename</th>
                      <th className="p-3.5">Format / Size</th>
                      <th className="p-3.5">Rows</th>
                      <th className="p-3.5">Domain</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Uploaded</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {backupHistory
                      .filter((b) =>
                        historySearch
                          ? b.original_filename.toLowerCase().includes(historySearch.toLowerCase()) ||
                            b.file_sha256.includes(historySearch.toLowerCase())
                          : true
                      )
                      .map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/30">
                          <td className="p-3.5 font-medium text-white">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-xs">{b.original_filename}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs font-mono">
                              SHA-256: {b.file_sha256.slice(0, 16)}...
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {b.file_format} • {(b.file_size_bytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="p-3.5 text-white font-semibold">{b.total_rows}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                              {b.suggested_domain || 'RAW'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === 'ARCHIVED_RAW'
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : b.status === 'PARTIALLY_IMPORTED' || b.status === 'READY'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {new Date(b.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            <a
                              href={`/api/proxy/admin/backups/${b.id}/raw-download/`}
                              download
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
