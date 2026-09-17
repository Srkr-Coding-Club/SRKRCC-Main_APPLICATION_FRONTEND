'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Trash2,
  Copy,
  Type,
  Mail,
  AlignLeft,
  List,
  CheckCircle2,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
  Files,
  Smartphone,
  Monitor,
  GitFork,
  Plus,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Hash,
  X,
  SeparatorHorizontal,
  Layers,
  ListChecks,
  Asterisk,
  RotateCcw,
  Save,
  Globe,
  Star,
  SlidersHorizontal,
  Grid3x3,
  Table2,
  PenTool,
  Link2,
} from 'lucide-react';
import { Form, FormField, ValidationRules } from '@/lib/types';
import { hasConstraintOptions, hasActiveValidation, getConstraintHint } from '@/lib/formValidation';
import { computeLayout, normalizeConditional } from '@/lib/formConditional';
import { normalizeImageUrl } from '@/lib/utils';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import EmailTemplateEditor from '@/components/admin/EmailTemplateEditor';
import { IdCard, Mail as MailIcon, QrCode } from 'lucide-react';

interface TypeMeta {
  label: string;
  icon: React.ElementType;
  hasOptions?: boolean;
  /** MATRIX_RADIO / MATRIX_CHECKBOX — has a `rows` list in addition to `options` (columns). */
  hasRows?: boolean;
  /** RATING / LINEAR_SCALE — has a min_value/max_value range instead of options. */
  hasScale?: boolean;
}

// Partial because FormField['type'] also includes exotic types (PHONE, ...) used by the
// ported response/CSV admin tools that this builder doesn't offer as addable fields.
const TYPE_META: Partial<Record<FormField['type'], TypeMeta>> = {
  TEXT: { label: 'Short Answer', icon: Type },
  PARAGRAPH: { label: 'Paragraph', icon: AlignLeft },
  EMAIL: { label: 'Email Address', icon: Mail },
  NUMBER: { label: 'Number / Phone', icon: Hash },
  URL: { label: 'Website URL', icon: Link2 },
  DROPDOWN: { label: 'Dropdown', icon: List, hasOptions: true },
  RADIO: { label: 'Multiple Choice', icon: CheckCircle2, hasOptions: true },
  CHECKBOX: { label: 'Checkboxes', icon: CheckSquare, hasOptions: true },
  DATE: { label: 'Date', icon: Calendar },
  TIME: { label: 'Time', icon: Clock },
  FILE: { label: 'File Upload', icon: Upload },
  MULTI_FILE: { label: 'Multiple Files', icon: Files },
  RATING: { label: 'Rating', icon: Star, hasScale: true },
  LINEAR_SCALE: { label: 'Linear Scale', icon: SlidersHorizontal, hasScale: true },
  MATRIX_RADIO: { label: 'Multiple Choice Grid', icon: Grid3x3, hasOptions: true, hasRows: true },
  MATRIX_CHECKBOX: { label: 'Checkbox Grid', icon: Table2, hasOptions: true, hasRows: true },
  SIGNATURE: { label: 'Signature', icon: PenTool },
  SECTION: { label: 'Section Header', icon: SeparatorHorizontal },
};

const DEFAULT_TYPE_META: TypeMeta = TYPE_META.TEXT!;

// Every call site only ever passes a type this builder actually offers (SELECTABLE_TYPES /
// FIELD_GROUPS), so the lookup is always defined — this just gives that a safe, typed home.
function getTypeMeta(type: FormField['type']): TypeMeta {
  return TYPE_META[type] ?? DEFAULT_TYPE_META;
}

const SELECTABLE_TYPES: FormField['type'][] = [
  'TEXT', 'PARAGRAPH', 'EMAIL', 'NUMBER', 'URL', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'DATE', 'TIME', 'FILE', 'MULTI_FILE',
  'RATING', 'LINEAR_SCALE', 'MATRIX_RADIO', 'MATRIX_CHECKBOX', 'SIGNATURE',
];

const FIELD_GROUPS: { label: string; icon: React.ElementType; types: FormField['type'][] }[] = [
  { label: 'Text Inputs', icon: Type, types: ['TEXT', 'PARAGRAPH', 'EMAIL', 'NUMBER', 'URL'] },
  { label: 'Choice Fields', icon: List, types: ['DROPDOWN', 'RADIO', 'CHECKBOX'] },
  { label: 'Rating & Matrix', icon: Grid3x3, types: ['RATING', 'LINEAR_SCALE', 'MATRIX_RADIO', 'MATRIX_CHECKBOX', 'SIGNATURE'] },
  { label: 'Advanced', icon: Layers, types: ['DATE', 'TIME', 'FILE', 'MULTI_FILE', 'SECTION'] },
];

interface FormBuilderTabProps {
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
  formMeta: {
    id?: number | string;
    title: string;
    slug: string;
    description: string;
    image_url: string;
    category: string;
    status: Form['status'];
    version?: number;
    open_at: string;
    close_at: string;
    allow_multiple_responses?: boolean;
    allow_response_editing?: boolean;
    max_responses_per_user?: number;
    max_total_responses?: number | null;
    prevent_duplicate_email_answers?: boolean;
    allow_edits_until?: string;
    club_id_enabled?: boolean;
    club_id_prefix?: string;
    club_id_field_mapping?: { email?: number | string; full_name?: number | string; phone_number?: number | string; branch?: number | string; roll_number?: number | string };
    confirmation_email_enabled?: boolean;
    confirmation_email_template?: number | string | null;
    attendance_enabled?: boolean;
    attendance_start_date?: string | null;
    attendance_days?: number;
    attendance_sessions_per_day?: 1 | 2 | 3;
    attendance_window_minutes?: number | null;
  };
  setFormMeta: React.Dispatch<React.SetStateAction<any>>;
  builderFields: FormField[];
  onAddFieldFromPalette: (type: FormField['type'], label: string) => void;
  onAddFieldAtIndex: (type: FormField['type'], label: string, index: number) => void;
  onDuplicateField: (field: FormField) => void;
  onReorderFields: (fields: FormField[]) => void;
  onRemoveField: (id: number | string) => void;
  onFieldChange: (id: number | string, key: keyof FormField, value: any) => void;
  onSaveForm: (status?: Form['status'], scheduleOptions?: { open_at?: string; close_at?: string }) => void;
  onResetForm?: () => void;
  hasSavedCheckpoint?: boolean;
  previewAnswers: Record<string, any>;
  setPreviewAnswers: (val: any) => void;
  onTestPreviewSubmit: (e: React.FormEvent) => void;
}

export function FormBuilderTab({
  isPreviewMode,
  setIsPreviewMode,
  formMeta,
  setFormMeta: setFormMetaProp,
  builderFields,
  onAddFieldFromPalette: onAddFieldFromPaletteProp,
  onAddFieldAtIndex,
  onDuplicateField: onDuplicateFieldProp,
  onReorderFields: onReorderFieldsProp,
  onRemoveField: onRemoveFieldProp,
  onFieldChange: onFieldChangeProp,
  onSaveForm: onSaveFormProp,
  onResetForm: onResetFormProp,
  hasSavedCheckpoint,
  previewAnswers,
  setPreviewAnswers,
  onTestPreviewSubmit,
}: FormBuilderTabProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeFieldId, setActiveFieldId] = useState<number | string | null>(builderFields[0]?.id ?? null);
  const [typeMenuId, setTypeMenuId] = useState<number | string | null>(null);
  const [validationOpenId, setValidationOpenId] = useState<number | string | null>(null);
  const [conditionalOpenId, setConditionalOpenId] = useState<number | string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [confirmationTemplateLabel, setConfirmationTemplateLabel] = useState<string>('');
  // Club ID field mapping stores real FormField ids; a brand-new, never-saved
  // field only has a client-side placeholder id (e.g. 'f2') until the form is
  // saved once and the backend assigns it a permanent numeric id.
  const formIsSaved = typeof formMeta.id === 'number' && formMeta.id > 0;
  const emailFields = builderFields.filter((f) => f.type === 'EMAIL' && typeof f.id === 'number' && f.id > 0);
  const [scheduleOpenAt, setScheduleOpenAt] = useState(formMeta.open_at || '');
  const [scheduleCloseAt, setScheduleCloseAt] = useState(formMeta.close_at || '');
  const prevIdsRef = useRef<Set<number | string>>(new Set(builderFields.map((f) => f.id)));

  useEffect(() => {
    const currentIds = new Set(builderFields.map((f) => f.id));
    if (currentIds.size > prevIdsRef.current.size) {
      const newField = builderFields.find((f) => !prevIdsRef.current.has(f.id));
      if (newField) {
        setActiveFieldId(newField.id);
        // Matrix fields are useless with no rows/columns — seed a sensible
        // 2x2 default so they render something the admin can immediately edit.
        if (newField.type === 'MATRIX_RADIO' || newField.type === 'MATRIX_CHECKBOX') {
          if (!newField.rows || newField.rows.length === 0) {
            onFieldChangeProp(newField.id, 'rows', ['Row 1', 'Row 2']);
          }
          if (!newField.options || newField.options.length === 0) {
            onFieldChangeProp(newField.id, 'options', ['Column 1', 'Column 2']);
          }
        }
      }
    }
    prevIdsRef.current = currentIds;
  }, [builderFields]);

  // Tracks in-progress edits (fields added/changed/removed, settings changed) so we
  // can warn before an accidental tab close/refresh throws away unsaved work.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setFormMeta: React.Dispatch<React.SetStateAction<any>> = (value) => {
    setHasUnsavedChanges(true);
    setFormMetaProp(value);
  };
  const onAddFieldFromPalette = (type: FormField['type'], label: string) => {
    setHasUnsavedChanges(true);
    onAddFieldFromPaletteProp(type, label);
  };
  const onDuplicateField = (field: FormField) => {
    setHasUnsavedChanges(true);
    onDuplicateFieldProp(field);
  };
  const onReorderFields = (fields: FormField[]) => {
    setHasUnsavedChanges(true);
    onReorderFieldsProp(fields);
  };
  const onRemoveField = (id: number | string) => {
    setHasUnsavedChanges(true);
    onRemoveFieldProp(id);
  };
  const onFieldChange = (id: number | string, key: keyof FormField, value: any) => {
    setHasUnsavedChanges(true);
    onFieldChangeProp(id, key, value);
  };
  const onSaveForm = (status?: Form['status'], scheduleOptions?: { open_at?: string; close_at?: string }) => {
    onSaveFormProp(status, scheduleOptions);
    setHasUnsavedChanges(false);
  };
  const onResetForm = () => {
    onResetFormProp?.();
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const addFieldOfType = (type: FormField['type']) => onAddFieldFromPalette(type, getTypeMeta(type).label);

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= builderFields.length) return;
    const updated = [...builderFields];
    const [moved] = updated.splice(idx, 1);
    updated.splice(target, 0, moved);
    onReorderFields(updated);
  };

  const handleTypeChange = (field: FormField, newType: FormField['type']) => {
    onFieldChange(field.id, 'type', newType);
    const newMeta = getTypeMeta(newType);
    const isMatrix = newType === 'MATRIX_RADIO' || newType === 'MATRIX_CHECKBOX';
    if (newMeta.hasOptions && (!field.options || field.options.length === 0)) {
      onFieldChange(field.id, 'options', isMatrix ? ['Column 1', 'Column 2'] : ['Option 1', 'Option 2']);
    }
    if (newMeta.hasRows && (!field.rows || field.rows.length === 0)) {
      onFieldChange(field.id, 'rows', ['Row 1', 'Row 2']);
    }
    setTypeMenuId(null);
  };

  const updateOption = (field: FormField, idx: number, value: string) => {
    const opts = [...(field.options || [])];
    opts[idx] = value;
    onFieldChange(field.id, 'options', opts);
  };

  const addOption = (field: FormField) => {
    const opts = [...(field.options || [])];
    const isMatrix = field.type === 'MATRIX_RADIO' || field.type === 'MATRIX_CHECKBOX';
    opts.push(isMatrix ? `Column ${opts.length + 1}` : `Option ${opts.length + 1}`);
    onFieldChange(field.id, 'options', opts);
  };

  const removeOption = (field: FormField, idx: number) => {
    const opts = (field.options || []).filter((_, i) => i !== idx);
    onFieldChange(field.id, 'options', opts);
  };

  // Rows editor for MATRIX_RADIO / MATRIX_CHECKBOX — mirrors the options editor above.
  const updateRow = (field: FormField, idx: number, value: string) => {
    const rows = [...(field.rows || [])];
    rows[idx] = value;
    onFieldChange(field.id, 'rows', rows);
  };

  const addRow = (field: FormField) => {
    const rows = [...(field.rows || [])];
    rows.push(`Row ${rows.length + 1}`);
    onFieldChange(field.id, 'rows', rows);
  };

  const removeRow = (field: FormField, idx: number) => {
    const rows = (field.rows || []).filter((_, i) => i !== idx);
    onFieldChange(field.id, 'rows', rows);
  };

  // Scale range for RATING / LINEAR_SCALE — field-level min_value/max_value
  // (distinct from validation_rules; this is what the public form renders).
  const updateScaleRange = (field: FormField, key: 'min_value' | 'max_value', value: number | undefined) => {
    onFieldChange(field.id, key, value);
  };

  const updateValidation = (field: FormField, patch: Partial<ValidationRules>) => {
    onFieldChange(field.id, 'validation_rules', { ...(field.validation_rules || {}), ...patch });
  };

  const totalRequired = builderFields.filter((f) => f.is_required).length;
  const totalConditional = builderFields.filter((f) => !!normalizeConditional(f.conditional_logic)).length;
  const isCurrentlyPublished = formMeta.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-white dark:bg-[#151722] p-4 rounded-lg border border-slate-200 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#FF7A00] flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
                Dynamic Form Builder
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  formMeta.status === 'PUBLISHED'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : formMeta.status === 'SCHEDULED'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : formMeta.status === 'CLOSED'
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {formMeta.status || 'DRAFT'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <StatPill icon={ListChecks} label={`${builderFields.length} Fields`} tone="slate" />
              <StatPill icon={Asterisk} label={`${totalRequired} Required`} tone="orange" />
              <StatPill icon={GitFork} label={`${totalConditional} Conditional`} tone="purple" />
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {isPreviewMode && (
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`p-2 rounded transition-transform duration-100 active:scale-90 ${viewportMode === 'desktop' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`p-2 rounded transition-transform duration-100 active:scale-90 ${viewportMode === 'mobile' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-3.5 py-2 rounded-md text-xs font-bold border flex items-center space-x-1.5 transition-transform duration-100 active:scale-95 ${
              isPreviewMode
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white dark:bg-[#151722] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset all unsaved changes to the form? This cannot be undone.')) {
                onResetForm?.();
              }
            }}
            className="px-3.5 py-2 rounded-md bg-white dark:bg-[#151722] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-transform duration-100 active:scale-95"
            title={formMeta.id ? "Reset form back to last saved checkpoint" : "Reset to blank form"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Save — keeps the form's current status */}
          <button
            onClick={() => onSaveForm(formMeta.status || 'DRAFT')}
            className="px-4 py-2 rounded-md border border-[#FF7A00] text-[#FF7A00] hover:bg-orange-50 dark:hover:bg-orange-950/30 font-bold text-xs flex items-center gap-1.5 transition-transform duration-100 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{formMeta.id ? 'Save Changes' : 'Save Draft'}</span>
          </button>

          {/* Publish / Unpublish */}
          {formMeta.status === 'PUBLISHED' ? (
            <button
              onClick={() => onSaveForm('DRAFT')}
              className="px-4 py-2 rounded-md bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition-transform duration-100 active:scale-95"
              title="Revert to draft — students can no longer see or submit this form"
            >
              <span>Unpublish</span>
            </button>
          ) : (
            <button
              onClick={() => onSaveForm('PUBLISHED')}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-transform duration-100 active:scale-95"
              title="Save and make this form live on the public Forms page"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          )}
        </div>
      </div>

      {isPreviewMode ? (
        <LivePreview
          formMeta={formMeta}
          builderFields={builderFields}
          previewAnswers={previewAnswers}
          setPreviewAnswers={setPreviewAnswers}
          onTestPreviewSubmit={onTestPreviewSubmit}
          viewportMode={viewportMode}
          setIsPreviewMode={setIsPreviewMode}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Field Palette — left side, click + to add a field to the form */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <div className="bg-white dark:bg-[#151722] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A2E] dark:text-white">Add Fields</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Click a field to add it to the form.</p>
              </div>

              <div className="p-3 space-y-4 max-h-[65vh] overflow-y-auto">
                {FIELD_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.label} className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2 pb-1">
                        <GroupIcon className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{group.label}</p>
                      </div>
                      {group.types.map((type) => (
                        <PaletteItem key={type} type={type} onAdd={() => addFieldOfType(type)} />
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 text-center">
                {SELECTABLE_TYPES.length + 1} field types available
              </div>
            </div>
          </div>

          {/* Canvas — right side */}
          <div className="lg:col-span-8 space-y-3">
            {/* Title & Description Card */}
            <div className="bg-white dark:bg-[#151722] rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <input
                type="text"
                value={formMeta.title}
                onChange={(e) => setFormMeta({ ...formMeta, title: e.target.value })}
                placeholder="Form title (e.g. IconCoders Flagship Hackathon 2026)"
                className="w-full text-2xl font-bold bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none text-[#1A1A2E] dark:text-white pb-2 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />

              <MarkdownEditor
                label="Form Description & Guidelines"
                value={formMeta.description}
                onChange={(v) => setFormMeta({ ...formMeta, description: v })}
                placeholder="Write detailed guidelines, eligibility criteria, submission rules, or instructions in Markdown..."
                minHeight="min-h-[130px]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={formMeta.category}
                    onChange={(e) => setFormMeta({ ...formMeta, category: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Recruitment">Recruitment</option>
                    <option value="Survey">Survey</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Banner Cover Image URL</label>
                  <input
                    type="text"
                    value={formMeta.image_url}
                    onChange={(e) => setFormMeta({ ...formMeta, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Automation Card — Club Member ID + confirmation email, wired into
                Response submission on the backend (apps/forms/services.py). */}
            <div className="bg-white dark:bg-[#151722] rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A2E] dark:text-white">Automation</h3>
              </div>

              <div className="space-y-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
                    <IdCard className="w-4 h-4 text-[#FF7A00]" />
                    Generate Club Member ID on submission
                  </span>
                  <input
                    type="checkbox"
                    checked={!!formMeta.club_id_enabled}
                    onChange={(e) => setFormMeta({ ...formMeta, club_id_enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
                  />
                </label>

                {formMeta.club_id_enabled && (
                  <div className="pl-6 space-y-3">
                    {!formIsSaved ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Save this form once first, then come back here to pick which field supplies the member&apos;s
                        email — field mapping needs each field&apos;s permanent saved ID.
                      </p>
                    ) : emailFields.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Add an &quot;Email Address&quot; field to this form before enabling Club ID generation.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Club ID Prefix</label>
                            <input
                              value={formMeta.club_id_prefix || 'SCC'}
                              onChange={(e) => setFormMeta({ ...formMeta, club_id_prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) })}
                              placeholder="SCC"
                              className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email Field *</label>
                            <select
                              value={formMeta.club_id_field_mapping?.email ?? ''}
                              onChange={(e) =>
                                setFormMeta({
                                  ...formMeta,
                                  club_id_field_mapping: { ...formMeta.club_id_field_mapping, email: e.target.value || undefined },
                                })
                              }
                              className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                            >
                              <option value="">Select field…</option>
                              {emailFields.map((f) => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            ['full_name', 'Name Field'],
                            ['phone_number', 'Phone Field'],
                            ['branch', 'Branch Field'],
                          ] as const).map(([key, labelText]) => (
                            <div key={key}>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{labelText}</label>
                              <select
                                value={formMeta.club_id_field_mapping?.[key] ?? ''}
                                onChange={(e) =>
                                  setFormMeta({
                                    ...formMeta,
                                    club_id_field_mapping: { ...formMeta.club_id_field_mapping, [key]: e.target.value || undefined },
                                  })
                                }
                                className="w-full px-2.5 py-2 rounded border text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                              >
                                <option value="">None</option>
                                {builderFields.filter((f) => f.type !== 'SECTION' && typeof f.id === 'number' && f.id > 0).map((f) => (
                                  <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Each completed submission is matched by email to the club member directory. New members get a
                          permanent ID like &quot;{new Date().getFullYear().toString().slice(-2)}{formMeta.club_id_prefix || 'SCC'}001&quot; —
                          returning members (same email) always keep their existing one.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
                    <MailIcon className="w-4 h-4 text-[#FF7A00]" />
                    Send confirmation email on submission
                  </span>
                  <input
                    type="checkbox"
                    checked={!!formMeta.confirmation_email_enabled}
                    onChange={(e) => setFormMeta({ ...formMeta, confirmation_email_enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
                  />
                </label>
                {formMeta.confirmation_email_enabled && (
                  <div className="pl-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEmailEditor(true)}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#1A1A2E] dark:text-white hover:border-[#FF7A00]/50 transition active:scale-95"
                    >
                      {formMeta.confirmation_email_template ? 'Change Template' : 'Choose Template'}
                    </button>
                    {formMeta.confirmation_email_template && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {confirmationTemplateLabel || `Template #${formMeta.confirmation_email_template}`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-5 pb-5 border-t border-b border-slate-100 dark:border-slate-800">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
                    <QrCode className="w-4 h-4 text-[#FF7A00]" />
                    Enable QR-code attendance tracking
                  </span>
                  <input
                    type="checkbox"
                    checked={!!formMeta.attendance_enabled}
                    onChange={(e) => setFormMeta({ ...formMeta, attendance_enabled: e.target.checked })}
                    className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
                  />
                </label>

                {formMeta.attendance_enabled && (
                  <div className="pl-6 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={formMeta.attendance_start_date || ''}
                          onChange={(e) => setFormMeta({ ...formMeta, attendance_start_date: e.target.value || null })}
                          className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Number of Days</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={formMeta.attendance_days ?? 1}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const clamped = Number.isFinite(raw) ? Math.min(30, Math.max(1, raw)) : 1;
                            setFormMeta({ ...formMeta, attendance_days: clamped });
                          }}
                          className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sessions Per Day</label>
                        <select
                          value={formMeta.attendance_sessions_per_day ?? 1}
                          onChange={(e) =>
                            setFormMeta({ ...formMeta, attendance_sessions_per_day: Number(e.target.value) as 1 | 2 | 3 })
                          }
                          className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                        >
                          <option value={1}>Morning only</option>
                          <option value={2}>Morning + Afternoon</option>
                          <option value={3}>Morning + Afternoon + Evening</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Scan Window (minutes)</label>
                        <input
                          type="number"
                          min={1}
                          value={formMeta.attendance_window_minutes ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setFormMeta({
                              ...formMeta,
                              attendance_window_minutes: raw === '' ? null : Math.max(1, Number(raw)),
                            });
                          }}
                          placeholder="Leave blank for no time restriction"
                          className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Each registrant gets a permanent QR badge (view under &quot;My Responses&quot;) scannable by
                      volunteers at the Attendance Scanner. Sessions are generated/kept in sync automatically whenever
                      this form is saved.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Max Total Responses (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={formMeta.max_total_responses ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFormMeta({ ...formMeta, max_total_responses: raw === '' ? undefined : Number(raw) });
                    }}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 rounded border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Auto-closes the form once this many total (non-test) responses are received. Leave blank for unlimited.
                  </p>
                </div>

                <label className="flex items-center justify-between cursor-pointer pt-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#FF7A00]" />
                    Prevent Duplicate Email Answers
                  </span>
                  <input
                    type="checkbox"
                    checked={!!formMeta.prevent_duplicate_email_answers}
                    onChange={(e) => setFormMeta({ ...formMeta, prevent_duplicate_email_answers: e.target.checked })}
                    className="w-4 h-4 accent-[#FF7A00] cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-slate-400">
                  Reject a submission if its email answer was already used to respond to this form. Leave off if this
                  form expects one email to submit more than once (e.g. a parent registering multiple children).
                </p>
              </div>
            </div>

            <EmailTemplateEditor
              open={showEmailEditor}
              onClose={() => setShowEmailEditor(false)}
              mode="select"
              onSelect={(id, label) => {
                setFormMeta({ ...formMeta, confirmation_email_template: id });
                setConfirmationTemplateLabel(label);
              }}
            />

            {/* Question Cards */}
            {builderFields.map((field, idx) => (
              <QuestionCard
                key={field.id}
                field={field}
                index={idx}
                total={builderFields.length}
                isActive={activeFieldId === field.id}
                typeMenuOpen={typeMenuId === field.id}
                validationOpen={validationOpenId === field.id}
                conditionalOpen={conditionalOpenId === field.id}
                onFocus={() => setActiveFieldId(field.id)}
                onLabelChange={(v) => onFieldChange(field.id, 'label', v)}
                onDescriptionChange={(v) => onFieldChange(field.id, 'description', v)}
                onPlaceholderChange={(v) => onFieldChange(field.id, 'placeholder', v)}
                onTypeChange={(t) => handleTypeChange(field, t)}
                onToggleTypeMenu={() => setTypeMenuId(typeMenuId === field.id ? null : field.id)}
                onToggleValidation={() => setValidationOpenId(validationOpenId === field.id ? null : field.id)}
                onToggleConditional={() => setConditionalOpenId(conditionalOpenId === field.id ? null : field.id)}
                onOptionChange={(i, v) => updateOption(field, i, v)}
                onAddOption={() => addOption(field)}
                onRemoveOption={(i) => removeOption(field, i)}
                onRowChange={(i, v) => updateRow(field, i, v)}
                onAddRow={() => addRow(field)}
                onRemoveRow={(i) => removeRow(field, i)}
                onScaleRangeChange={(key, v) => updateScaleRange(field, key, v)}
                onValidationChange={(patch) => updateValidation(field, patch)}
                onConditionalChange={(logic) => onFieldChange(field.id, 'conditional_logic', logic)}
                siblingFields={builderFields.filter((f) => f.id !== field.id && f.type !== 'SECTION')}
                onRequiredChange={(v) => onFieldChange(field.id, 'is_required', v)}
                onDuplicate={() => onDuplicateField(field)}
                onRemove={() => {
                  if (window.confirm('Delete this question? This cannot be undone.')) {
                    onRemoveField(field.id);
                  }
                }}
                onMoveUp={() => moveField(idx, -1)}
                onMoveDown={() => moveField(idx, 1)}
              />
            ))}

            {builderFields.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 py-12 text-center text-xs font-semibold text-slate-400">
                No questions yet — click a field in the palette to add one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  tone: 'slate' | 'orange' | 'purple' | 'sky';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    orange: 'bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]',
    purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    sky: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${toneClasses[tone]}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function PaletteItem({
  type,
  onAdd,
}: {
  type: FormField['type'];
  onAdd: () => void;
}) {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full flex items-center gap-3 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-[#FF7A00] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-transform duration-100 active:scale-[0.98]"
      title={`Add ${meta.label}`}
    >
      <span className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 text-xs font-semibold text-[#1A1A2E] dark:text-white">{meta.label}</span>
      <Plus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
    </button>
  );
}

interface QuestionCardProps {
  field: FormField;
  index: number;
  total: number;
  isActive: boolean;
  typeMenuOpen: boolean;
  validationOpen: boolean;
  conditionalOpen: boolean;
  onFocus: () => void;
  onLabelChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onPlaceholderChange: (v: string) => void;
  onTypeChange: (t: FormField['type']) => void;
  onToggleTypeMenu: () => void;
  onToggleValidation: () => void;
  onToggleConditional: () => void;
  onOptionChange: (idx: number, v: string) => void;
  onAddOption: () => void;
  onRemoveOption: (idx: number) => void;
  onRowChange: (idx: number, v: string) => void;
  onAddRow: () => void;
  onRemoveRow: (idx: number) => void;
  onScaleRangeChange: (key: 'min_value' | 'max_value', v: number | undefined) => void;
  onValidationChange: (patch: Partial<ValidationRules>) => void;
  onConditionalChange: (logic: any) => void;
  siblingFields: FormField[];
  onRequiredChange: (v: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QuestionCard({
  field,
  index,
  total,
  isActive,
  typeMenuOpen,
  validationOpen,
  conditionalOpen,
  onFocus,
  onLabelChange,
  onDescriptionChange,
  onPlaceholderChange,
  onTypeChange,
  onToggleTypeMenu,
  onToggleValidation,
  onToggleConditional,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRowChange,
  onAddRow,
  onRemoveRow,
  onScaleRangeChange,
  onValidationChange,
  onConditionalChange,
  siblingFields,
  onRequiredChange,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: QuestionCardProps) {
  const meta = getTypeMeta(field.type);
  const Icon = meta.icon;
  const isSection = field.type === 'SECTION';
  const hasPlaceholder = field.type === 'TEXT' || field.type === 'PARAGRAPH' || field.type === 'EMAIL' || field.type === 'NUMBER';

  const reorderControls = (
    <div className="flex flex-col flex-shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onMoveUp}
        disabled={index === 0}
        title="Move up"
        className="flex items-center justify-center min-h-8 min-w-8 p-1.5 rounded text-slate-400 hover:text-[#FF7A00] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-transform duration-100 active:scale-90"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        onClick={onMoveDown}
        disabled={index === total - 1}
        title="Move down"
        className="flex items-center justify-center min-h-8 min-w-8 p-1.5 rounded text-slate-400 hover:text-[#FF7A00] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-transform duration-100 active:scale-90"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );

  const numberBadge = (
    <span
      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
        isActive ? 'bg-[#FF7A00] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
      }`}
    >
      {index + 1}
    </span>
  );

  if (isSection) {
    return (
      <div
        onClick={onFocus}
        className="bg-white dark:bg-[#151722] rounded-lg border border-slate-200 dark:border-slate-800 p-5 cursor-pointer"
      >
        <div className="flex items-center gap-3 border-b border-[#FF7A00] pb-3">
          {reorderControls}
          {numberBadge}
          <SeparatorHorizontal className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
          <input
            value={field.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Section title"
            className="flex-1 text-lg font-bold bg-transparent border-0 focus:outline-none text-[#1A1A2E] dark:text-white"
          />
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-2 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 transition-transform duration-100 active:scale-90">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <input
          value={field.description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Section description (optional)"
          className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-500 dark:text-slate-400 pt-2"
        />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div
        onClick={onFocus}
        className="bg-white dark:bg-[#151722] rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/50 cursor-pointer p-4 flex items-center gap-3"
      >
        {reorderControls}
        {numberBadge}
        <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-[#1A1A2E] dark:text-white truncate">
          {field.label || 'Untitled Question'}
        </span>
        <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:inline">{meta.label}</span>
        {field.is_required && <span className="text-rose-500 text-xs flex-shrink-0">*</span>}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151722] rounded-lg border-l-4 border-l-[#FF7A00] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-1.5">{reorderControls}</div>
        <div className="mt-1.5">{numberBadge}</div>
        <input
          value={field.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Question"
          autoFocus
          className="flex-1 text-base font-bold bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none pb-2 text-[#1A1A2E] dark:text-white"
        />

        {/* Type selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={onToggleTypeMenu}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-[#FF7A00] transition-transform duration-100 active:scale-95"
          >
            <Icon className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span className="hidden sm:inline">{meta.label}</span>
            <ChevronDown className={`w-3 h-3 ${typeMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {typeMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-20 p-1 max-h-80 overflow-y-auto">
              {SELECTABLE_TYPES.map((t) => {
                const m = getTypeMeta(t);
                const TIcon = m.icon;
                return (
                  <button
                    key={t}
                    onClick={() => onTypeChange(t)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-transform duration-100 active:scale-[0.98] ${
                      field.type === t ? 'text-[#FF7A00]' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {field.description !== undefined ? (
        <input
          value={field.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Help text (optional)"
          className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-500 dark:text-slate-400"
        />
      ) : (
        <button onClick={() => onDescriptionChange('')} className="text-[11px] font-semibold text-slate-400 hover:text-[#FF7A00] transition-transform duration-100 active:scale-95 inline-block">
          + Add description
        </button>
      )}

      {/* Placeholder for text-like fields */}
      {hasPlaceholder && (
        <input
          value={field.placeholder || ''}
          onChange={(e) => onPlaceholderChange(e.target.value)}
          placeholder="Input placeholder text (optional)"
          className="w-full px-3 py-2 rounded-md border text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
        />
      )}

      {/* Rows editor (MATRIX_RADIO / MATRIX_CHECKBOX only) */}
      {meta.hasRows && (
        <div className="space-y-2 pl-1 pt-1">
          <p className="text-[10px] uppercase font-bold text-slate-500">Rows</p>
          {(field.rows || []).map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 w-3.5 flex-shrink-0">{i + 1}.</span>
              <input
                value={row}
                onChange={(e) => onRowChange(i, e.target.value)}
                className="flex-1 text-sm border-0 border-b border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none bg-transparent py-1 text-[#1A1A2E] dark:text-white"
              />
              <button onClick={() => onRemoveRow(i)} className="flex items-center justify-center min-h-8 min-w-8 p-1.5 rounded text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 transition-transform duration-100 active:scale-90">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={onAddRow} className="text-xs font-semibold text-slate-400 hover:text-[#FF7A00] flex items-center gap-1.5 pt-1 transition-transform duration-100 active:scale-95">
            <Plus className="w-3.5 h-3.5" /> Add row
          </button>
        </div>
      )}

      {/* Options editor (also doubles as the column editor for matrix fields) */}
      {meta.hasOptions && (
        <div className="space-y-2 pl-1 pt-1">
          {meta.hasRows && <p className="text-[10px] uppercase font-bold text-slate-500">Columns</p>}
          {(field.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              {field.type === 'CHECKBOX' || field.type === 'MATRIX_CHECKBOX' ? (
                <div className="w-3.5 h-3.5 rounded-[3px] border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
              ) : field.type === 'RADIO' || field.type === 'MATRIX_RADIO' ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
              ) : (
                <span className="text-[11px] font-mono text-slate-400 w-3.5 flex-shrink-0">{i + 1}.</span>
              )}
              <input
                value={opt}
                onChange={(e) => onOptionChange(i, e.target.value)}
                className="flex-1 text-sm border-0 border-b border-slate-200 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none bg-transparent py-1 text-[#1A1A2E] dark:text-white"
              />
              <button onClick={() => onRemoveOption(i)} className="flex items-center justify-center min-h-8 min-w-8 p-1.5 rounded text-slate-300 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 transition-transform duration-100 active:scale-90">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={onAddOption} className="text-xs font-semibold text-slate-400 hover:text-[#FF7A00] flex items-center gap-1.5 pt-1 transition-transform duration-100 active:scale-95">
            <Plus className="w-3.5 h-3.5" /> {meta.hasRows ? 'Add column' : 'Add option'}
          </button>
        </div>
      )}

      {/* Scale range editor (RATING / LINEAR_SCALE only) — this is the actual
          field.min_value/max_value range rendered on the public form; distinct
          from the validation_rules.minValue/maxValue rule below. */}
      {meta.hasScale && (
        <div className="grid grid-cols-2 gap-2 pl-1 pt-1">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              {field.type === 'RATING' ? 'Min stars' : 'Min value'}
            </label>
            <input
              type="number"
              value={field.min_value ?? 1}
              onChange={(e) => onScaleRangeChange('min_value', e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              {field.type === 'RATING' ? 'Max stars' : 'Max value'}
            </label>
            <input
              type="number"
              value={field.max_value ?? 5}
              onChange={(e) => onScaleRangeChange('max_value', e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      )}

      {/* Response validation */}
      {hasConstraintOptions(field.type) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button onClick={onToggleValidation} className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center gap-1.5 transition-transform duration-100 active:scale-95">
            <ShieldCheck className="w-3.5 h-3.5" />
            {hasActiveValidation(field) ? 'Response validation: Active' : 'Response validation'}
          </button>
          {validationOpen && (
            <ValidationPanel field={field} siblingFields={siblingFields} onChange={(patch) => onValidationChange(patch)} />
          )}
          {!validationOpen && getConstraintHint(field) && (
            <p className="text-[11px] text-slate-400 mt-1">{getConstraintHint(field)}</p>
          )}
        </div>
      )}

      {/* Conditional visibility */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button onClick={onToggleConditional} className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center gap-1.5 transition-transform duration-100 active:scale-95">
          <GitFork className="w-3.5 h-3.5" />
          {readConditional(field.conditional_logic) ? 'Conditional: Active' : 'Add conditional rule'}
        </button>
        {conditionalOpen && (
          <ConditionalEditor field={field} siblingFields={siblingFields} onChange={onConditionalChange} />
        )}
      </div>

      {/* Footer toolbar */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button onClick={onDuplicate} title="Duplicate" className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#FF7A00] transition-transform duration-100 active:scale-90">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={onRemove} title="Delete" className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-transform duration-100 active:scale-90">
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!field.is_required}
            onChange={(e) => onRequiredChange(e.target.checked)}
            className="w-4 h-4 accent-[#FF7A00]"
          />
          Required
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conditional rule editor — emits the canonical backend shape:        */
/*   { logic:'AND', rules:[{ field, operator, value }], action }       */
/* ------------------------------------------------------------------ */

const CONDITION_OPERATORS: { value: string; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'includes', label: 'includes option' },
  { value: 'not_includes', label: 'excludes option' },
  { value: 'before', label: 'is before' },
  { value: 'after', label: 'is after' },
];

const CONDITION_ACTIONS: { value: string; label: string }[] = [
  { value: 'show', label: 'Show this field' },
  { value: 'hide', label: 'Hide this field' },
  { value: 'require', label: 'Make this field required' },
  { value: 'optional', label: 'Make this field optional' },
];

export function readConditional(raw: any): { field: any; operator: string; value: any; action: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = Array.isArray(raw.rules) ? raw.rules[0] : raw;
  if (!node) return null;
  const ref = node.field ?? node.if;
  if (ref === undefined || ref === null || ref === 'parent') return null;
  const operator =
    'equals' in node && !('operator' in node) ? 'equals' : String(node.operator || 'equals');
  return {
    field: ref,
    operator,
    value: 'equals' in node && !('operator' in node) ? node.equals : node.value,
    action: String(raw.action || 'show'),
  };
}

function ConditionalEditor({
  field,
  siblingFields,
  onChange,
}: {
  field: FormField;
  siblingFields: FormField[];
  onChange: (logic: any) => void;
}) {
  const rule = readConditional(field.conditional_logic);
  const active = !!rule;
  const targetField = siblingFields.find((f) => String(f.id) === String(rule?.field));
  const needsValue = !['is_empty', 'is_not_empty'].includes(rule?.operator || 'equals');

  const emit = (patch: Partial<{ field: any; operator: string; value: any; action: string }>) => {
    const next = {
      field: patch.field ?? rule?.field ?? siblingFields[0]?.id,
      operator: patch.operator ?? rule?.operator ?? 'equals',
      value: patch.value ?? rule?.value ?? '',
      action: patch.action ?? rule?.action ?? 'show',
    };
    if (next.field === undefined || next.field === null) {
      onChange({});
      return;
    }
    onChange({
      logic: 'AND',
      rules: [{ field: Number(next.field) || next.field, operator: next.operator, value: next.value }],
      action: next.action,
    });
  };

  const sel = 'w-full px-2 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]';

  return (
    <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs space-y-2 mt-2">
      <p className="font-bold text-[#FF7A00]">Conditional Rule</p>

      {siblingFields.length === 0 ? (
        <p className="text-slate-500">Add another question first — a rule needs a field to depend on.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select className={sel} value={rule?.action || 'show'} onChange={(e) => emit({ action: e.target.value })}>
              {CONDITION_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select className={sel} value={String(rule?.field ?? siblingFields[0]?.id ?? '')} onChange={(e) => emit({ field: e.target.value })}>
              <option value="">— when field —</option>
              {siblingFields.map((f) => <option key={f.id} value={String(f.id)}>{f.label || `Question ${f.order}`}</option>)}
            </select>
            <select className={sel} value={rule?.operator || 'equals'} onChange={(e) => emit({ operator: e.target.value })}>
              {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {needsValue && (
            targetField && (targetField.options?.length ?? 0) > 0 ? (
              <select className={sel} value={rule?.value ?? ''} onChange={(e) => emit({ value: e.target.value })}>
                <option value="">— value —</option>
                {targetField.options!.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                type={targetField?.type === 'NUMBER' ? 'number' : targetField?.type === 'DATE' ? 'date' : 'text'}
                className={sel}
                placeholder="value to compare"
                value={rule?.value ?? ''}
                onChange={(e) => emit({ value: e.target.value })}
              />
            )
          )}

          {active && (
            <button
              onClick={() => onChange({})}
              className="text-[11px] font-bold text-rose-500 hover:underline transition-transform duration-100 active:scale-95 inline-block"
            >
              Remove rule
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-type validation panel — the full backend rule set              */
/* ------------------------------------------------------------------ */

const TEXT_FORMAT_OPTIONS = [
  { value: '', label: 'Any text' },
  { value: 'alpha', label: 'Alphabetic (letters + spaces)' },
  { value: 'alphanumeric', label: 'Alphanumeric' },
  { value: 'numeric', label: 'Digits only' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'username', label: 'Username' },
  { value: 'slug', label: 'Slug' },
];

function CheckboxRow({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#FF7A00]" />
      {label}
    </label>
  );
}

function CrossFieldEditor({ field, siblingFields, onChange }: {
  field: FormField; siblingFields: FormField[]; onChange: (patch: Partial<ValidationRules>) => void;
}) {
  const rules = (field.validation_rules?.crossField as any[]) || [];
  const rule = rules[0];
  const sel = 'px-2 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-800';
  const emit = (patch: any) => {
    const next = { op: patch.op ?? rule?.op ?? 'eq', field: patch.field ?? rule?.field ?? siblingFields[0]?.id, equals: patch.equals ?? rule?.equals };
    if (!next.field) { onChange({ crossField: undefined }); return; }
    onChange({ crossField: [{ op: next.op, field: Number(next.field) || next.field, ...(next.op === 'required_if' && next.equals ? { equals: next.equals } : {}) }] });
  };
  if (siblingFields.length === 0) return null;
  return (
    <div className="pt-2 border-t border-orange-200/60 dark:border-orange-900/40 space-y-1.5">
      <p className="text-[10px] uppercase font-bold text-slate-500">Compare with another field</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select className={sel} value={rule?.op || ''} onChange={(e) => e.target.value ? emit({ op: e.target.value }) : onChange({ crossField: undefined })}>
          <option value="">no comparison</option>
          <option value="eq">must equal</option>
          <option value="ne">must differ from</option>
          <option value="lte">must be ≤</option>
          <option value="gte">must be ≥</option>
          <option value="lt">must be &lt;</option>
          <option value="gt">must be &gt;</option>
          <option value="required_if">required if</option>
        </select>
        <select className={sel} value={String(rule?.field ?? '')} onChange={(e) => emit({ field: e.target.value })} disabled={!rule?.op}>
          <option value="">— field —</option>
          {siblingFields.map((f) => <option key={f.id} value={String(f.id)}>{f.label}</option>)}
        </select>
        {rule?.op === 'required_if' && (
          <input className={sel} placeholder="equals value" value={rule?.equals || ''} onChange={(e) => emit({ equals: e.target.value })} />
        )}
      </div>
    </div>
  );
}

function ValidationPanel({ field, siblingFields, onChange }: {
  field: FormField;
  siblingFields: FormField[];
  onChange: (patch: Partial<ValidationRules>) => void;
}) {
  const r: ValidationRules = field.validation_rules || {};
  const t = field.type;
  const textLike = t === 'TEXT' || t === 'PARAGRAPH';

  return (
    <div className="mt-2 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-2">
      {textLike && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Min characters" type="number" value={r.minLength} onChange={(v) => onChange({ minLength: v })} />
            <LabeledInput label="Max characters" type="number" value={r.maxLength} onChange={(v) => onChange({ maxLength: v })} />
            <LabeledInput label="Exact length" type="number" value={r.exactLength} onChange={(v) => onChange({ exactLength: v })} />
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Format</label>
              <select value={r.format || ''} onChange={(e) => onChange({ format: (e.target.value || undefined) as any })}
                className="w-full px-2 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-800">
                {TEXT_FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {t === 'PARAGRAPH' && (
            <div className="grid grid-cols-2 gap-2">
              <LabeledInput label="Min words" type="number" value={r.minWords} onChange={(v) => onChange({ minWords: v })} />
              <LabeledInput label="Max words" type="number" value={r.maxWords} onChange={(v) => onChange({ maxWords: v })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Starts with" type="text" value={r.startsWith} onChange={(v) => onChange({ startsWith: v })} />
            <LabeledInput label="Ends with" type="text" value={r.endsWith} onChange={(v) => onChange({ endsWith: v })} />
            <LabeledInput label="Must contain" type="text" value={r.contains} onChange={(v) => onChange({ contains: v })} />
            <LabeledInput label="Must not contain" type="text" value={r.notContains} onChange={(v) => onChange({ notContains: v })} />
          </div>
          <LabeledInput label="Custom pattern (regex)" type="text" value={r.pattern} onChange={(v) => onChange({ pattern: v })} />
        </>
      )}

      {t === 'NUMBER' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Minimum value" type="number" value={r.minValue} onChange={(v) => onChange({ minValue: v })} />
            <LabeledInput label="Maximum value" type="number" value={r.maxValue} onChange={(v) => onChange({ maxValue: v })} />
            <LabeledInput label="Exact value" type="number" value={r.exactValue} onChange={(v) => onChange({ exactValue: v })} />
            <LabeledInput label="Step / multiple of" type="number" value={r.step} onChange={(v) => onChange({ step: v })} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <CheckboxRow label="Integers only" checked={r.integerOnly} onChange={(v) => onChange({ integerOnly: v || undefined })} />
            <CheckboxRow label="Positive only" checked={r.positiveOnly} onChange={(v) => onChange({ positiveOnly: v || undefined })} />
            <CheckboxRow label="Allow negative" checked={r.allowNegative !== false} onChange={(v) => onChange({ allowNegative: v ? undefined : false })} />
          </div>
        </>
      )}

      {t === 'EMAIL' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Allowed domains (comma-separated)" type="text" value={Array.isArray(r.allowedDomains) ? r.allowedDomains.join(', ') : r.allowedDomains} onChange={(v) => onChange({ allowedDomains: v === undefined ? undefined : String(v) })} />
            <LabeledInput label="Blocked domains (comma-separated)" type="text" value={Array.isArray(r.blockedDomains) ? r.blockedDomains.join(', ') : r.blockedDomains} onChange={(v) => onChange({ blockedDomains: v === undefined ? undefined : String(v) })} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <CheckboxRow label="Lower-case on save" checked={r.normalizeCase} onChange={(v) => onChange({ normalizeCase: v || undefined })} />
            <CheckboxRow label="Allow multiple" checked={r.allowMultiple} onChange={(v) => onChange({ allowMultiple: v || undefined })} />
          </div>
        </>
      )}

      {t === 'PHONE' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Min digits" type="number" value={r.minDigits} onChange={(v) => onChange({ minDigits: v })} />
            <LabeledInput label="Max digits" type="number" value={r.maxDigits} onChange={(v) => onChange({ maxDigits: v })} />
          </div>
          <CheckboxRow label="Numeric only (no spaces/dashes/parentheses)" checked={r.numericOnly} onChange={(v) => onChange({ numericOnly: v || undefined })} />
        </>
      )}

      {(t === 'RADIO' || t === 'DROPDOWN') && (
        <CheckboxRow label='Allow an "other" value outside the options' checked={r.allowOther} onChange={(v) => onChange({ allowOther: v || undefined })} />
      )}

      {t === 'CHECKBOX' && (
        <div className="grid grid-cols-3 gap-2">
          <LabeledInput label="Min selections" type="number" value={r.minSelected} onChange={(v) => onChange({ minSelected: v })} />
          <LabeledInput label="Max selections" type="number" value={r.maxSelected} onChange={(v) => onChange({ maxSelected: v })} />
          <LabeledInput label="Exact selections" type="number" value={r.exactSelected} onChange={(v) => onChange({ exactSelected: v })} />
        </div>
      )}

      {t === 'DATE' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Earliest date" type="date" value={r.minDate} onChange={(v) => onChange({ minDate: v })} />
            <LabeledInput label="Latest date" type="date" value={r.maxDate} onChange={(v) => onChange({ maxDate: v })} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <CheckboxRow label="Past dates only" checked={r.pastOnly} onChange={(v) => onChange({ pastOnly: v || undefined })} />
            <CheckboxRow label="Future dates only" checked={r.futureOnly} onChange={(v) => onChange({ futureOnly: v || undefined })} />
            <CheckboxRow label="Disallow today" checked={r.allowToday === false} onChange={(v) => onChange({ allowToday: v ? false : undefined })} />
          </div>
        </>
      )}

      {t === 'TIME' && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Earliest time" type="time" value={r.minTime} onChange={(v) => onChange({ minTime: v })} />
          <LabeledInput label="Latest time" type="time" value={r.maxTime} onChange={(v) => onChange({ maxTime: v })} />
        </div>
      )}

      {(t === 'FILE' || t === 'MULTI_FILE') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Allowed types (.pdf,.docx)" type="text" value={r.allowedFileTypes} onChange={(v) => onChange({ allowedFileTypes: v })} />
            <LabeledInput label="Blocked types" type="text" value={r.blockedFileTypes} onChange={(v) => onChange({ blockedFileTypes: v })} />
            <LabeledInput label="Max file size (MB)" type="number" value={r.maxFileSizeMB} onChange={(v) => onChange({ maxFileSizeMB: v })} />
            <LabeledInput label="Min file size (KB)" type="number" value={r.minFileSizeKB} onChange={(v) => onChange({ minFileSizeKB: v })} />
          </div>
          {t === 'MULTI_FILE' && (
            <div className="grid grid-cols-2 gap-2">
              <LabeledInput label="Min files" type="number" value={r.minFiles} onChange={(v) => onChange({ minFiles: v })} />
              <LabeledInput label="Max files" type="number" value={r.maxFiles} onChange={(v) => onChange({ maxFiles: v })} />
            </div>
          )}
        </>
      )}

      {t === 'URL' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Allowed domains (comma-separated)" type="text" value={Array.isArray(r.allowedDomains) ? r.allowedDomains.join(', ') : r.allowedDomains} onChange={(v) => onChange({ allowedDomains: v === undefined ? undefined : String(v) })} />
            <LabeledInput label="Blocked domains (comma-separated)" type="text" value={Array.isArray(r.blockedDomains) ? r.blockedDomains.join(', ') : r.blockedDomains} onChange={(v) => onChange({ blockedDomains: v === undefined ? undefined : String(v) })} />
          </div>
          <LabeledInput label="Custom pattern (regex)" type="text" value={r.pattern} onChange={(v) => onChange({ pattern: v })} />
          <CheckboxRow label="Require https://" checked={r.requireHttps} onChange={(v) => onChange({ requireHttps: v || undefined })} />
        </>
      )}

      {(t === 'RATING' || t === 'LINEAR_SCALE') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Extra rule: min value" type="number" value={r.minValue} onChange={(v) => onChange({ minValue: v })} />
            <LabeledInput label="Extra rule: max value" type="number" value={r.maxValue} onChange={(v) => onChange({ maxValue: v })} />
            <LabeledInput label="Step / multiple of" type="number" value={r.step} onChange={(v) => onChange({ step: v })} />
          </div>
          <CheckboxRow label="Whole numbers only" checked={r.integerOnly ?? true} onChange={(v) => onChange({ integerOnly: v ? undefined : false })} />
          <p className="text-[10px] text-slate-400">
            The star/scale range itself is set above (Min/Max stars or values) — these extra rules layer a
            stricter check on top, if needed.
          </p>
        </>
      )}

      {(t === 'MATRIX_RADIO' || t === 'MATRIX_CHECKBOX') && (
        <>
          {(field.rows || []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Rows that must be answered</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {(field.rows || []).map((row) => {
                  const list = Array.isArray(r.requiredRows) ? r.requiredRows : [];
                  const checked = list.includes(row);
                  return (
                    <CheckboxRow
                      key={row}
                      label={row}
                      checked={checked}
                      onChange={(v) => {
                        const next = v ? [...list, row] : list.filter((x) => x !== row);
                        onChange({ requiredRows: next.length ? next : undefined });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          <CheckboxRow label="Every row requires an answer" checked={r.allRowsRequired} onChange={(v) => onChange({ allRowsRequired: v || undefined })} />
          {t === 'MATRIX_CHECKBOX' && (
            <div className="grid grid-cols-2 gap-2">
              <LabeledInput label="Min selections per row" type="number" value={r.minPerRow} onChange={(v) => onChange({ minPerRow: v })} />
              <LabeledInput label="Max selections per row" type="number" value={r.maxPerRow} onChange={(v) => onChange({ maxPerRow: v })} />
            </div>
          )}
        </>
      )}

      {t === 'SIGNATURE' && (
        <p className="text-[11px] text-slate-400">
          Signatures only support "Required" and the comparison rule below — there are no extra format rules.
        </p>
      )}

      <CrossFieldEditor field={field} siblingFields={siblingFields} onChange={onChange} />

      <LabeledInput label="Custom error message (optional)" type="text" value={r.patternError} onChange={(v) => onChange({ patternError: v })} />
    </div>
  );
}

function LabeledInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string | number | undefined;
  onChange: (v: any) => void;
}) {
  // Keep exactly what the user typed in local state so intermediate values like
  // "1.", "-", or "0.50" don't get rewritten mid-keystroke (which ate characters
  // when we parsed to Number() on every change). We only push a parsed number to
  // the parent when the text is a complete, valid number.
  const isNumber = type === 'number';
  const asStr = (v: string | number | undefined) => (v === undefined || v === null ? '' : String(v));
  const [raw, setRaw] = React.useState<string>(asStr(value));
  // Remember the value we last emitted; if the parent's value diverges from it
  // (e.g. the panel switched to a different field), adopt the parent's value.
  const lastEmitted = React.useRef<string | number | undefined>(value);

  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setRaw(asStr(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (v: string | number | undefined) => {
    lastEmitted.current = v;
    onChange(v);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setRaw(next);
    if (!isNumber) {
      emit(next === '' ? undefined : next);
      return;
    }
    if (next.trim() === '') {
      emit(undefined);
      return;
    }
    const n = Number(next);
    if (Number.isFinite(n)) emit(n);
  };

  return (
    <div>
      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</label>
      <input
        type={isNumber ? 'text' : type}
        inputMode={isNumber ? 'decimal' : undefined}
        value={raw}
        onChange={handleChange}
        className="w-full px-2.5 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
      />
    </div>
  );
}

interface LivePreviewProps {
  formMeta: FormBuilderTabProps['formMeta'];
  builderFields: FormField[];
  previewAnswers: Record<string, any>;
  setPreviewAnswers: (val: any) => void;
  onTestPreviewSubmit: (e: React.FormEvent) => void;
  viewportMode: 'desktop' | 'mobile';
  setIsPreviewMode: (val: boolean) => void;
}

function LivePreview({
  formMeta,
  builderFields,
  previewAnswers,
  setPreviewAnswers,
  onTestPreviewSubmit,
  viewportMode,
  setIsPreviewMode,
}: LivePreviewProps) {
  // previewAnswers is keyed by label; rebuild it by field id for the shared
  // conditional engine (same one the public form + backend use).
  const previewValuesById: Record<string, any> = {};
  builderFields.forEach((f) => { previewValuesById[String(f.id)] = previewAnswers[f.label]; });
  const previewLayout = computeLayout(builderFields as any, previewValuesById);

  return (
    <div
      className={`bg-white dark:bg-[#151722] rounded-lg p-6 sm:p-8 border border-slate-200 dark:border-slate-800 mx-auto space-y-6 ${
        viewportMode === 'mobile' ? 'max-w-sm border-2 border-slate-700' : 'max-w-3xl'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {viewportMode === 'mobile' ? 'Mobile Simulator View' : 'Desktop End User View'}
          </span>
        </div>
        <button onClick={() => setIsPreviewMode(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-transform duration-100 active:scale-95">
          Exit Preview
        </button>
      </div>

      {formMeta.image_url ? (
        <div className="h-44 rounded-lg overflow-hidden bg-slate-900">
          <img
            src={normalizeImageUrl(formMeta.image_url) || undefined}
            alt={formMeta.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : null}

      <div>
        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-orange-50 text-[#FF7A00]">
          {formMeta.category}
        </span>
        <h2 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white mt-2">{formMeta.title}</h2>
        <div className="mt-2">
          <MarkdownRenderer content={formMeta.description} />
        </div>
      </div>

      <form onSubmit={onTestPreviewSubmit} className="space-y-6">
        {builderFields.map((field) => {
          if (field.type !== 'SECTION' && !previewLayout.visible.has(String(field.id))) {
            return null;
          }

          if (field.type === 'SECTION') {
            return (
              <div key={field.id} className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-[#FF7A00]">{field.label}</h3>
                {field.description && <p className="text-xs text-slate-400 mt-0.5">{field.description}</p>}
              </div>
            );
          }

          const hint = getConstraintHint(field);

          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                {field.label} {field.is_required && <span className="text-rose-500">*</span>}
              </label>
              {field.description && <p className="text-xs text-slate-400 -mt-1">{field.description}</p>}

              {field.type === 'TEXT' && (
                <input
                  type="text"
                  required={field.is_required}
                  placeholder={field.placeholder || 'Enter short text...'}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {field.type === 'PARAGRAPH' && (
                <textarea
                  rows={3}
                  required={field.is_required}
                  placeholder={field.placeholder || 'Enter detailed response...'}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {field.type === 'EMAIL' && (
                <input
                  type="email"
                  required={field.is_required}
                  placeholder={field.placeholder || 'email@example.com'}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {field.type === 'NUMBER' && (
                <input
                  type="number"
                  required={field.is_required}
                  placeholder={field.placeholder || 'Enter number...'}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {field.type === 'DROPDOWN' && (
                <select
                  required={field.is_required}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                >
                  <option value="">Select option...</option>
                  {(field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2', 'Option 3']).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'RADIO' && (
                <div className="space-y-2 pt-1">
                  {(field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2', 'Option 3']).map((opt) => (
                    <label key={opt} className="flex items-center space-x-2 text-sm text-[#1A1A2E] dark:text-white cursor-pointer">
                      <input
                        type="radio"
                        name={`preview-${field.id}`}
                        value={opt}
                        checked={previewAnswers[field.label] === opt}
                        onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                        className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'CHECKBOX' && (
                <div className="space-y-2 pt-1">
                  {(field.options && field.options.length > 0 ? field.options : ['Option 1', 'Option 2', 'Option 3']).map((opt) => (
                    <label key={opt} className="flex items-center space-x-2 text-sm text-[#1A1A2E] dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        value={opt}
                        checked={Array.isArray(previewAnswers[field.label]) && previewAnswers[field.label].includes(opt)}
                        onChange={(e) => {
                          const curr = Array.isArray(previewAnswers[field.label]) ? previewAnswers[field.label] : [];
                          const next = e.target.checked ? [...curr, opt] : curr.filter((i: string) => i !== opt);
                          setPreviewAnswers({ ...previewAnswers, [field.label]: next });
                        }}
                        className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {(field.type === 'DATE' || field.type === 'TIME') && (
                <input
                  type={field.type === 'DATE' ? 'date' : 'time'}
                  required={field.is_required}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {(field.type === 'FILE' || field.type === 'MULTI_FILE') && (
                <input
                  type="file"
                  multiple={field.type === 'MULTI_FILE'}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).map((f) => f.name);
                    setPreviewAnswers({ ...previewAnswers, [field.label]: files.join(', ') });
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {field.type === 'URL' && (
                <input
                  type="url"
                  required={field.is_required}
                  placeholder={field.placeholder || 'https://...'}
                  value={previewAnswers[field.label] || ''}
                  onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              )}

              {(field.type === 'RATING' || field.type === 'LINEAR_SCALE') && (() => {
                const min = field.min_value ?? 1;
                const max = field.max_value ?? 5;
                const current = Number(previewAnswers[field.label]) || 0;
                const nums: number[] = [];
                for (let i = min; i <= max; i++) nums.push(i);
                return (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {nums.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewAnswers({ ...previewAnswers, [field.label]: i })}
                        className={`h-9 w-9 rounded-lg border text-xs font-bold transition-transform duration-100 active:scale-90 ${
                          current === i
                            ? 'border-[#FF7A00] bg-[#FF7A00] text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {(field.type === 'MATRIX_RADIO' || field.type === 'MATRIX_CHECKBOX') && (() => {
                const rows = field.rows || [];
                const cols = field.options || [];
                const multi = field.type === 'MATRIX_CHECKBOX';
                const matrixVal: Record<string, any> =
                  previewAnswers[field.label] && typeof previewAnswers[field.label] === 'object' ? previewAnswers[field.label] : {};
                return (
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-1.5" />
                          {cols.map((c) => (
                            <th key={c} className="p-1.5 text-center font-semibold text-slate-500">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const cell = matrixVal[row];
                          return (
                            <tr key={row} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="p-1.5 font-medium text-[#1A1A2E] dark:text-white">{row}</td>
                              {cols.map((c) => {
                                const selected = multi ? Array.isArray(cell) && cell.includes(c) : cell === c;
                                return (
                                  <td key={c} className="p-1.5 text-center">
                                    <input
                                      type={multi ? 'checkbox' : 'radio'}
                                      name={multi ? undefined : `preview-${field.id}-${row}`}
                                      checked={selected}
                                      onChange={() => {
                                        const nextCell = multi
                                          ? selected
                                            ? (Array.isArray(cell) ? cell : []).filter((x: string) => x !== c)
                                            : [...(Array.isArray(cell) ? cell : []), c]
                                          : c;
                                        setPreviewAnswers({ ...previewAnswers, [field.label]: { ...matrixVal, [row]: nextCell } });
                                      }}
                                      className="h-3.5 w-3.5 accent-[#FF7A00]"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {field.type === 'SIGNATURE' && (
                <p className="text-xs text-slate-400 italic px-4 py-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                  Signature pad renders on the live public form (canvas drawing isn't simulated in this quick preview).
                </p>
              )}

              {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
            </div>
          );
        })}

        <div className="pt-4 flex justify-end">
          <button type="submit" className="px-6 py-3 rounded-md bg-[#FF7A00] text-white font-bold text-sm hover:bg-[#e66f00] transition-transform duration-100 active:scale-95">
            Test Submit Response
          </button>
        </div>
      </form>
    </div>
  );
}
