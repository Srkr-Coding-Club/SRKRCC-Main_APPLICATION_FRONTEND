'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  GripVertical,
  ShieldCheck,
  ChevronDown,
  Hash,
  X,
  SeparatorHorizontal,
  Sparkles,
  Layers,
  ListChecks,
  Asterisk,
  Move,
  MousePointerClick,
} from 'lucide-react';
import { Form, FormField, ValidationRules } from '@/lib/types';
import { hasConstraintOptions, hasActiveValidation, getConstraintHint } from '@/lib/formValidation';

interface TypeMeta {
  label: string;
  icon: React.ElementType;
  hasOptions?: boolean;
}

// Partial because FormField['type'] also includes exotic types (RATING, SIGNATURE, PHONE, URL, ...)
// used by the ported response/CSV admin tools that this builder doesn't offer as addable fields.
const TYPE_META: Partial<Record<FormField['type'], TypeMeta>> = {
  TEXT: { label: 'Short Answer', icon: Type },
  PARAGRAPH: { label: 'Paragraph', icon: AlignLeft },
  EMAIL: { label: 'Email Address', icon: Mail },
  NUMBER: { label: 'Number / Phone', icon: Hash },
  DROPDOWN: { label: 'Dropdown', icon: List, hasOptions: true },
  RADIO: { label: 'Multiple Choice', icon: CheckCircle2, hasOptions: true },
  CHECKBOX: { label: 'Checkboxes', icon: CheckSquare, hasOptions: true },
  DATE: { label: 'Date', icon: Calendar },
  TIME: { label: 'Time', icon: Clock },
  FILE: { label: 'File Upload', icon: Upload },
  MULTI_FILE: { label: 'Multiple Files', icon: Files },
  SECTION: { label: 'Section Header', icon: SeparatorHorizontal },
};

const DEFAULT_TYPE_META: TypeMeta = TYPE_META.TEXT!;

// Every call site only ever passes a type this builder actually offers (SELECTABLE_TYPES /
// FIELD_GROUPS), so the lookup is always defined — this just gives that a safe, typed home.
function getTypeMeta(type: FormField['type']): TypeMeta {
  return TYPE_META[type] ?? DEFAULT_TYPE_META;
}

const SELECTABLE_TYPES: FormField['type'][] = [
  'TEXT', 'PARAGRAPH', 'EMAIL', 'NUMBER', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'DATE', 'TIME', 'FILE', 'MULTI_FILE',
];

const FIELD_GROUPS: { label: string; icon: React.ElementType; types: FormField['type'][] }[] = [
  { label: 'Text Inputs', icon: Type, types: ['TEXT', 'PARAGRAPH', 'EMAIL', 'NUMBER'] },
  { label: 'Choice Fields', icon: List, types: ['DROPDOWN', 'RADIO', 'CHECKBOX'] },
  { label: 'Advanced', icon: Layers, types: ['DATE', 'TIME', 'FILE', 'MULTI_FILE', 'SECTION'] },
];

interface FormBuilderTabProps {
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
  formMeta: {
    title: string;
    slug: string;
    description: string;
    image_url: string;
    category: string;
    status: Form['status'];
    open_at: string;
    close_at: string;
  };
  setFormMeta: React.Dispatch<React.SetStateAction<any>>;
  builderFields: FormField[];
  onAddFieldFromPalette: (type: FormField['type'], label: string) => void;
  onAddFieldAtIndex: (type: FormField['type'], label: string, index: number) => void;
  onDuplicateField: (field: FormField) => void;
  onReorderFields: (fields: FormField[]) => void;
  onRemoveField: (id: number | string) => void;
  onFieldChange: (id: number | string, key: keyof FormField, value: any) => void;
  onSaveForm: () => void;
  previewAnswers: Record<string, any>;
  setPreviewAnswers: (val: any) => void;
  onTestPreviewSubmit: (e: React.FormEvent) => void;
}

export function FormBuilderTab({
  isPreviewMode,
  setIsPreviewMode,
  formMeta,
  setFormMeta,
  builderFields,
  onAddFieldFromPalette,
  onAddFieldAtIndex,
  onDuplicateField,
  onReorderFields,
  onRemoveField,
  onFieldChange,
  onSaveForm,
  previewAnswers,
  setPreviewAnswers,
  onTestPreviewSubmit,
}: FormBuilderTabProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeFieldId, setActiveFieldId] = useState<number | string | null>(builderFields[0]?.id ?? null);
  const [typeMenuId, setTypeMenuId] = useState<number | string | null>(null);
  const [validationOpenId, setValidationOpenId] = useState<number | string | null>(null);
  const [conditionalOpenId, setConditionalOpenId] = useState<number | string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const prevIdsRef = useRef<Set<number | string>>(new Set(builderFields.map((f) => f.id)));
  const paletteDragType = useRef<FormField['type'] | null>(null);

  useEffect(() => {
    const currentIds = new Set(builderFields.map((f) => f.id));
    if (currentIds.size > prevIdsRef.current.size) {
      const newField = builderFields.find((f) => !prevIdsRef.current.has(f.id));
      if (newField) setActiveFieldId(newField.id);
    }
    prevIdsRef.current = currentIds;
  }, [builderFields]);

  const addFieldOfType = (type: FormField['type']) => onAddFieldFromPalette(type, getTypeMeta(type).label);

  const handlePaletteDragStart = (type: FormField['type']) => (e: React.DragEvent) => {
    paletteDragType.current = type;
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTypeChange = (field: FormField, newType: FormField['type']) => {
    onFieldChange(field.id, 'type', newType);
    if (getTypeMeta(newType).hasOptions && (!field.options || field.options.length === 0)) {
      onFieldChange(field.id, 'options', ['Option 1', 'Option 2']);
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
    opts.push(`Option ${opts.length + 1}`);
    onFieldChange(field.id, 'options', opts);
  };

  const removeOption = (field: FormField, idx: number) => {
    const opts = (field.options || []).filter((_, i) => i !== idx);
    onFieldChange(field.id, 'options', opts);
  };

  const updateValidation = (field: FormField, patch: Partial<ValidationRules>) => {
    onFieldChange(field.id, 'validation_rules', { ...(field.validation_rules || {}), ...patch });
  };

  const handleCanvasDrop = (idx: number) => {
    if (paletteDragType.current) {
      const type = paletteDragType.current;
      onAddFieldAtIndex(type, getTypeMeta(type).label, idx);
      paletteDragType.current = null;
    } else if (dragIndex !== null && dragIndex !== idx) {
      const updated = [...builderFields];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(idx, 0, moved);
      onReorderFields(updated);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const totalRequired = builderFields.filter((f) => f.is_required).length;
  const totalConditional = builderFields.filter((f) => f.conditional_logic?.if).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#151722] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] text-white shadow-[0_4px_14px_rgba(255,122,0,0.35)] flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
              Dynamic Form Builder
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <StatPill icon={ListChecks} label={`${builderFields.length} Fields`} tone="slate" />
              <StatPill icon={Asterisk} label={`${totalRequired} Required`} tone="orange" />
              <StatPill icon={GitFork} label={`${totalConditional} Conditional`} tone="purple" />
              <StatPill icon={Move} label="Drag to reorder" tone="sky" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isPreviewMode && (
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded ${viewportMode === 'desktop' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded ${viewportMode === 'mobile' ? 'bg-white dark:bg-[#151722] text-[#FF7A00] shadow' : 'text-slate-400'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              isPreviewMode ? 'bg-purple-600 text-white shadow' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isPreviewMode ? 'Exit Preview' : 'Live Preview Mode'}</span>
          </button>

          <button
            onClick={onSaveForm}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] hover:brightness-110 text-white font-extrabold text-xs shadow-[0_4px_14px_rgba(255,122,0,0.35)] transition"
          >
            Save & Publish
          </button>
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
          {/* Field Palette — left side, click + or drag onto the canvas */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <div className="bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_2px_24px_-8px_rgba(139,46,59,0.12)] overflow-hidden">
              <div className="relative p-4 bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] overflow-hidden">
                <div className="absolute -right-4 -top-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute right-8 -bottom-8 w-16 h-16 rounded-full bg-white/10" />
                <div className="relative flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Add Fields</h3>
                </div>
                <p className="relative text-[11px] text-white/85 mt-0.5 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3" /> Click + or drag a field onto the canvas
                </p>
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
                        <PaletteItem
                          key={type}
                          type={type}
                          onAdd={() => addFieldOfType(type)}
                          onDragStart={handlePaletteDragStart(type)}
                        />
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
            <div className="bg-white dark:bg-[#151722] rounded-xl border-t-8 border-t-[#FF7A00] border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
              <input
                type="text"
                value={formMeta.title}
                onChange={(e) => setFormMeta({ ...formMeta, title: e.target.value })}
                placeholder="Form title"
                className="w-full text-2xl font-extrabold bg-transparent border-0 border-b-2 border-transparent focus:border-[#FF7A00] focus:outline-none text-[#1A1A2E] dark:text-white pb-2 transition-colors"
              />
              <input
                type="text"
                value={formMeta.description}
                onChange={(e) => setFormMeta({ ...formMeta, description: e.target.value })}
                placeholder="Form description"
                className="w-full text-sm bg-transparent border-0 border-b border-transparent focus:border-[#FF7A00] focus:outline-none text-slate-500 dark:text-slate-400 pb-2 transition-colors"
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

            {/* Question Cards */}
            {builderFields.map((field, idx) => (
              <QuestionCard
                key={field.id}
                field={field}
                index={idx}
                isActive={activeFieldId === field.id}
                isDragOver={dragOverIndex === idx}
                isBeingDragged={dragIndex === idx}
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
                onValidationChange={(patch) => updateValidation(field, patch)}
                onConditionalChange={(v) => onFieldChange(field.id, 'conditional_logic', { if: 'parent', equals: v })}
                onRequiredChange={(v) => onFieldChange(field.id, 'is_required', v)}
                onDuplicate={() => onDuplicateField(field)}
                onRemove={() => onRemoveField(field.id)}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={() => setDragOverIndex(idx)}
                onDrop={() => handleCanvasDrop(idx)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
              />
            ))}

            {/* End-of-canvas drop zone — also the empty-state prompt */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(builderFields.length);
              }}
              onDragLeave={() => setDragOverIndex((prev) => (prev === builderFields.length ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleCanvasDrop(builderFields.length);
              }}
              className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center text-xs font-bold transition-all ${
                builderFields.length === 0 ? 'py-12' : 'py-5'
              } ${
                dragOverIndex === builderFields.length
                  ? 'border-[#FF7A00] bg-orange-50/60 dark:bg-orange-950/20 text-[#FF7A00] scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <MousePointerClick className={`w-5 h-5 ${dragOverIndex === builderFields.length ? 'text-[#FF7A00]' : 'text-slate-300 dark:text-slate-700'}`} />
              {builderFields.length === 0
                ? 'No questions yet — click + or drag a field from the palette to get started'
                : 'Drop a field here to add it'}
            </div>
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${toneClasses[tone]}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function PaletteItem({
  type,
  onAdd,
  onDragStart,
}: {
  type: FormField['type'];
  onAdd: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-[#FF7A00]/30 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 hover:shadow-sm hover:-translate-y-0.5 cursor-grab active:cursor-grabbing active:scale-[0.98] transition-all"
      title={`Drag onto the canvas, or click + to add ${meta.label}`}
    >
      <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF7A00]/15 to-[#8B2E3B]/15 text-[#FF7A00] group-hover:from-[#FF7A00]/25 group-hover:to-[#8B2E3B]/25 group-hover:scale-110 group-hover:rotate-3 transition-all flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 text-xs font-bold text-[#1A1A2E] dark:text-white">{meta.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        title={`Add ${meta.label}`}
        aria-label={`Add ${meta.label}`}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] opacity-85 group-hover:opacity-100 group-hover:shadow-[0_4px_14px_rgba(255,122,0,0.45)] hover:scale-110 active:scale-95 transition-all flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface QuestionCardProps {
  field: FormField;
  index: number;
  isActive: boolean;
  isDragOver: boolean;
  isBeingDragged: boolean;
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
  onValidationChange: (patch: Partial<ValidationRules>) => void;
  onConditionalChange: (v: string) => void;
  onRequiredChange: (v: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function QuestionCard({
  field,
  index,
  isActive,
  isDragOver,
  isBeingDragged,
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
  onValidationChange,
  onConditionalChange,
  onRequiredChange,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: QuestionCardProps) {
  const meta = getTypeMeta(field.type);
  const Icon = meta.icon;
  const isSection = field.type === 'SECTION';
  const hasPlaceholder = field.type === 'TEXT' || field.type === 'PARAGRAPH' || field.type === 'EMAIL' || field.type === 'NUMBER';

  const dragHandle = (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700 hover:text-slate-400 flex-shrink-0"
      title="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </div>
  );

  const wrapperProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      onDrop();
    },
  };

  const insertionIndicator = isDragOver && (
    <motion.div
      layout
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      className="h-1 -mt-3 mb-3 rounded-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]"
    />
  );

  const numberBadge = (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-colors ${
        isActive ? 'bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
      }`}
    >
      {index + 1}
    </span>
  );

  if (isSection) {
    return (
      <motion.div
        layout
        {...wrapperProps}
        onClick={onFocus}
        className={`bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 cursor-pointer transition-all ${
          isDragOver ? 'ring-2 ring-[#FF7A00]/50' : ''
        } ${isBeingDragged ? 'opacity-40' : ''}`}
      >
        {insertionIndicator}
        <div className="flex items-center gap-3 border-b-2 border-[#FF7A00] pb-3">
          {dragHandle}
          {numberBadge}
          <SeparatorHorizontal className="w-4 h-4 text-[#FF7A00] flex-shrink-0" />
          <input
            value={field.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Section title"
            className="flex-1 text-lg font-extrabold bg-transparent border-0 focus:outline-none text-[#1A1A2E] dark:text-white"
          />
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <input
          value={field.description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Section description (optional)"
          className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-500 dark:text-slate-400 pt-2"
        />
      </motion.div>
    );
  }

  if (!isActive) {
    return (
      <motion.div
        layout
        {...wrapperProps}
        onClick={onFocus}
        className={`group bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#FF7A00]/40 hover:-translate-y-0.5 transition-all cursor-pointer p-4 flex items-center gap-3 ${
          isDragOver ? 'ring-2 ring-[#FF7A00]/50' : ''
        } ${isBeingDragged ? 'opacity-40' : ''}`}
      >
        {insertionIndicator}
        {dragHandle}
        {numberBadge}
        <div className="p-1.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] flex-shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-[#1A1A2E] dark:text-white truncate">
          {field.label || 'Untitled Question'}
        </span>
        <span className="text-[11px] text-slate-400 flex-shrink-0 hidden sm:inline">{meta.label}</span>
        {field.is_required && <span className="text-rose-500 text-xs flex-shrink-0">*</span>}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      {...wrapperProps}
      className={`bg-white dark:bg-[#151722] rounded-2xl border-l-4 border-l-[#FF7A00] border border-slate-200 dark:border-slate-800 shadow-[0_4px_24px_-6px_rgba(255,122,0,0.18)] p-5 space-y-3 transition-all ${
        isDragOver ? 'ring-2 ring-[#FF7A00]/50' : ''
      } ${isBeingDragged ? 'opacity-40' : ''}`}
    >
      {insertionIndicator}
      <div className="flex items-start gap-3">
        <div className="mt-2.5">{dragHandle}</div>
        <div className="mt-2">{numberBadge}</div>
        <input
          value={field.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Question"
          autoFocus
          className="flex-1 text-base font-bold bg-transparent border-0 border-b-2 border-slate-100 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none pb-2 text-[#1A1A2E] dark:text-white transition-colors"
        />

        {/* Type selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={onToggleTypeMenu}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-[#FF7A00] transition"
          >
            <Icon className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span className="hidden sm:inline">{meta.label}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${typeMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {typeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 p-1 max-h-80 overflow-y-auto"
              >
                {SELECTABLE_TYPES.map((t) => {
                  const m = getTypeMeta(t);
                  const TIcon = m.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => onTypeChange(t)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        field.type === t ? 'text-[#FF7A00]' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <TIcon className="w-3.5 h-3.5" /> {m.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
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
        <button onClick={() => onDescriptionChange('')} className="text-[11px] font-semibold text-slate-400 hover:text-[#FF7A00] transition">
          + Add description
        </button>
      )}

      {/* Placeholder for text-like fields */}
      {hasPlaceholder && (
        <input
          value={field.placeholder || ''}
          onChange={(e) => onPlaceholderChange(e.target.value)}
          placeholder="Input placeholder text (optional)"
          className="w-full px-3 py-2 rounded-lg border text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#FF7A00]"
        />
      )}

      {/* Options editor */}
      {meta.hasOptions && (
        <div className="space-y-2 pl-1 pt-1">
          {(field.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              {field.type === 'CHECKBOX' ? (
                <div className="w-3.5 h-3.5 rounded-[3px] border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
              ) : field.type === 'RADIO' ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
              ) : (
                <span className="text-[11px] font-mono text-slate-400 w-3.5 flex-shrink-0">{i + 1}.</span>
              )}
              <input
                value={opt}
                onChange={(e) => onOptionChange(i, e.target.value)}
                className="flex-1 text-sm border-0 border-b border-slate-100 dark:border-slate-800 focus:border-[#FF7A00] focus:outline-none bg-transparent py-1 text-[#1A1A2E] dark:text-white transition-colors"
              />
              <button onClick={() => onRemoveOption(i)} className="text-slate-300 hover:text-rose-500 flex-shrink-0 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={onAddOption} className="text-xs font-semibold text-slate-400 hover:text-[#FF7A00] flex items-center gap-1.5 pt-1 transition">
            <Plus className="w-3.5 h-3.5" /> Add option
          </button>
        </div>
      )}

      {/* Response validation */}
      {hasConstraintOptions(field.type) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button onClick={onToggleValidation} className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center gap-1.5 transition">
            <ShieldCheck className="w-3.5 h-3.5" />
            {hasActiveValidation(field) ? 'Response validation: Active' : 'Response validation'}
          </button>
          <AnimatePresence initial={false}>
            {validationOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ValidationPanel field={field} onChange={(patch) => onValidationChange(patch)} />
              </motion.div>
            )}
          </AnimatePresence>
          {!validationOpen && getConstraintHint(field) && (
            <p className="text-[11px] text-slate-400 mt-1">{getConstraintHint(field)}</p>
          )}
        </div>
      )}

      {/* Conditional visibility */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button onClick={onToggleConditional} className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center gap-1.5 transition">
          <GitFork className="w-3.5 h-3.5" />
          {field.conditional_logic?.if || field.conditional_logic?.parent ? 'Conditional: Active' : 'Add conditional rule'}
        </button>
        <AnimatePresence initial={false}>
          {conditionalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs space-y-2 mt-2">
                <p className="font-bold text-[#FF7A00]">Conditional Visibility Rule</p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500">Show if a prior field has value</label>
                  <input
                    type="text"
                    placeholder="e.g. AI/ML & GenAI"
                    value={field.conditional_logic?.equals || ''}
                    onChange={(e) => onConditionalChange(e.target.value)}
                    className="w-full px-2.5 py-1 rounded border text-xs bg-white dark:bg-[#151722] border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer toolbar */}
      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button onClick={onDuplicate} title="Duplicate" className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#FF7A00] transition">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={onRemove} title="Delete" className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
          Required
          <button
            onClick={() => onRequiredChange(!field.is_required)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${field.is_required ? 'bg-[#FF7A00]' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              style={{ left: field.is_required ? '18px' : '2px' }}
            />
          </button>
        </label>
      </div>
    </motion.div>
  );
}

function ValidationPanel({ field, onChange }: { field: FormField; onChange: (patch: Partial<ValidationRules>) => void }) {
  const r: ValidationRules = field.validation_rules || {};

  const textLike = field.type === 'TEXT' || field.type === 'PARAGRAPH';
  const numberLike = field.type === 'NUMBER';
  const checkboxLike = field.type === 'CHECKBOX';
  const dateLike = field.type === 'DATE';
  const fileLike = field.type === 'FILE' || field.type === 'MULTI_FILE';

  return (
    <div className="mt-2 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 space-y-2">
      {textLike && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Min characters" type="number" value={r.minLength} onChange={(v) => onChange({ minLength: v })} />
          <LabeledInput label="Max characters" type="number" value={r.maxLength} onChange={(v) => onChange({ maxLength: v })} />
          <div className="col-span-2">
            <LabeledInput label="Custom pattern (regex, optional)" type="text" value={r.pattern} onChange={(v) => onChange({ pattern: v })} />
          </div>
        </div>
      )}
      {numberLike && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Minimum value" type="number" value={r.minValue} onChange={(v) => onChange({ minValue: v })} />
          <LabeledInput label="Maximum value" type="number" value={r.maxValue} onChange={(v) => onChange({ maxValue: v })} />
        </div>
      )}
      {checkboxLike && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Min selections" type="number" value={r.minSelected} onChange={(v) => onChange({ minSelected: v })} />
          <LabeledInput label="Max selections" type="number" value={r.maxSelected} onChange={(v) => onChange({ maxSelected: v })} />
        </div>
      )}
      {dateLike && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Earliest date" type="date" value={r.minDate} onChange={(v) => onChange({ minDate: v })} />
          <LabeledInput label="Latest date" type="date" value={r.maxDate} onChange={(v) => onChange({ maxDate: v })} />
        </div>
      )}
      {fileLike && (
        <div className="grid grid-cols-2 gap-2">
          <LabeledInput label="Allowed types (.pdf,.docx)" type="text" value={r.allowedFileTypes} onChange={(v) => onChange({ allowedFileTypes: v })} />
          <LabeledInput label="Max file size (MB)" type="number" value={r.maxFileSizeMB} onChange={(v) => onChange({ maxFileSizeMB: v })} />
        </div>
      )}
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
  return (
    <div>
      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
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
  return (
    <div
      className={`bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-purple-200 dark:border-purple-900 shadow-xl transition-all duration-300 mx-auto space-y-6 ${
        viewportMode === 'mobile' ? 'max-w-sm border-2 border-slate-700 rounded-3xl' : 'max-w-3xl'
      }`}
    >
      <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-purple-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
            {viewportMode === 'mobile' ? 'Mobile Simulator View' : 'Desktop End User View'}
          </span>
        </div>
        <button onClick={() => setIsPreviewMode(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">
          Exit Preview
        </button>
      </div>

      {formMeta.image_url && (
        <div className="h-44 rounded-lg overflow-hidden bg-slate-900">
          <img src={formMeta.image_url} alt={formMeta.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-orange-50 text-[#FF7A00]">
          {formMeta.category}
        </span>
        <h2 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white mt-2">{formMeta.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{formMeta.description}</p>
      </div>

      <form onSubmit={onTestPreviewSubmit} className="space-y-6">
        {builderFields.map((field) => {
          if (field.conditional_logic && (field.conditional_logic.if || field.conditional_logic.parent)) {
            const parentKey = field.conditional_logic.if || field.conditional_logic.parent;
            const parentVal = previewAnswers[parentKey];
            const expectedVal = field.conditional_logic.equals;
            if (expectedVal && String(parentVal) !== String(expectedVal)) {
              return null;
            }
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

              {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
            </div>
          );
        })}

        <div className="pt-4 flex justify-end">
          <button type="submit" className="px-6 py-3 rounded-lg bg-purple-600 text-white font-bold text-sm shadow-md hover:bg-purple-700 transition">
            Test Submit Response
          </button>
        </div>
      </form>
    </div>
  );
}
