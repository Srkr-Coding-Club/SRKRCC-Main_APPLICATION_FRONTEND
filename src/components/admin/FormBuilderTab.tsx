'use client';

import React, { useState } from 'react';
import {
  Eye,
  Layers,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Type,
  Mail,
  AlignLeft,
  List,
  CheckCircle,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
  Smartphone,
  Monitor,
  GitFork,
} from 'lucide-react';
import { Form, FormField } from '@/lib/types';

const PALETTE_ITEMS = [
  { type: 'SECTION', label: 'Section Header', icon: Layers, desc: 'Visual divider & section title' },
  { type: 'TEXT', label: 'Short Text Input', icon: Type, desc: 'Single-line text entry' },
  { type: 'EMAIL', label: 'Email Address', icon: Mail, desc: 'Validated email format' },
  { type: 'NUMBER', label: 'Phone / Number', icon: HashIcon, desc: 'Numeric or phone input' },
  { type: 'PARAGRAPH', label: 'Long Paragraph', icon: AlignLeft, desc: 'Multi-line text area' },
  { type: 'DROPDOWN', label: 'Dropdown List', icon: List, desc: 'Select one option from list' },
  { type: 'RADIO', label: 'Radio Choice', icon: CheckCircle, desc: 'Single selection radio' },
  { type: 'CHECKBOX', label: 'Checkboxes', icon: CheckSquare, desc: 'Multiple selection checkboxes' },
  { type: 'DATE', label: 'Date Picker', icon: Calendar, desc: 'Calendar date selector' },
  { type: 'TIME', label: 'Time Picker', icon: Clock, desc: 'Time format selector' },
  { type: 'FILE', label: 'File Upload', icon: Upload, desc: 'Single PDF / Document upload' },
  { type: 'MULTI_FILE', label: 'Multi File Upload', icon: Upload, desc: 'Multiple documents / attachments' },
];

function HashIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

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
  onRemoveField,
  onFieldChange,
  onSaveForm,
  previewAnswers,
  setPreviewAnswers,
  onTestPreviewSubmit,
}: FormBuilderTabProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeConditionalFieldId, setActiveConditionalFieldId] = useState<number | string | null>(null);

  // Reordering helpers
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === builderFields.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...builderFields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updated.forEach((f, i) => (f.order = i + 1));
    updated.forEach((f) => onFieldChange(f.id, 'order', f.order));
  };

  // Duplicate Field Helper
  const duplicateField = (field: FormField) => {
    const cloned: FormField = {
      ...field,
      id: Date.now().toString(),
      label: `${field.label} (Copy)`,
      order: builderFields.length + 1,
    };
    onAddFieldFromPalette(cloned.type, cloned.label);
  };

  const totalRequired = builderFields.filter((f) => f.is_required).length;
  const totalConditional = builderFields.filter((f) => f.conditional_logic?.if).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#151722] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider">
              MICROSOFT FORMS BUILDER CANVAS
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {builderFields.length} Fields · {totalRequired} Required · {totalConditional} Conditional Rules
            </p>
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
            <span>{isPreviewMode ? 'Exit Preview' : '👁️ Live Preview Mode'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Mode */}
      {isPreviewMode ? (
        <div
          className={`bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-8 border border-purple-200 dark:border-purple-900 shadow-xl transition-all duration-300 mx-auto space-y-6 ${
            viewportMode === 'mobile' ? 'max-w-sm border-2 border-slate-700 rounded-3xl' : 'max-w-3xl'
          }`}
        >
          <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                {viewportMode === 'mobile' ? '📱 Mobile Simulator View' : '🖥️ Desktop End User View'}
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
              // Conditional visibility evaluation in preview
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
                    {field.placeholder && <p className="text-xs text-slate-400 mt-0.5">{field.placeholder}</p>}
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                    {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                  </label>

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
      ) : (
        /* Builder Canvas Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Palette Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-[#1A1A2E] dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#FF7A00]" />
              <span>Microsoft Forms Palette</span>
            </h3>
            <p className="text-xs text-slate-500">Click any element below to add it directly to your form canvas.</p>

            <div className="grid grid-cols-1 gap-2 pt-2">
              {PALETTE_ITEMS.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => onAddFieldFromPalette(item.type as any, item.label)}
                    className="p-3 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 hover:border-[#FF7A00] flex items-center space-x-3 text-left transition group"
                  >
                    <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00]">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Builder Canvas */}
          <div className="lg:col-span-8 bg-white dark:bg-[#151722] p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">Form Canvas & Configuration</h2>
                <p className="text-xs text-slate-500">Configure title, fields, options, conditional rules, and publish to database.</p>
              </div>

              <button
                onClick={onSaveForm}
                className="px-6 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-xs shadow-md transition"
              >
                Save & Publish Form
              </button>
            </div>

            {/* Form Meta Section */}
            <div className="space-y-4 p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Form Title *</label>
                  <input
                    type="text"
                    value={formMeta.title}
                    onChange={(e) => setFormMeta({ ...formMeta, title: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Category *</label>
                  <select
                    value={formMeta.category}
                    onChange={(e) => setFormMeta({ ...formMeta, category: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Recruitment">Recruitment</option>
                    <option value="Survey">Survey</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#1A1A2E] dark:text-white mb-1">Banner Cover Image URL</label>
                <input
                  type="text"
                  value={formMeta.image_url}
                  onChange={(e) => setFormMeta({ ...formMeta, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded border text-sm bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Dynamic Fields List */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Canvas Form Fields ({builderFields.length})</h3>

              {builderFields.map((field, idx) => (
                <div key={field.id} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-[#FF7A00] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase font-mono">[{field.type}]</span>
                    </div>

                    {/* Action Controls: Move Up, Move Down, Duplicate, Delete */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => moveField(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => moveField(idx, 'down')}
                        disabled={idx === builderFields.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateField(field)}
                        className="p-1 text-slate-400 hover:text-[#FF7A00]"
                        title="Duplicate Field"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onRemoveField(field.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                        title="Remove Field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Field Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => onFieldChange(field.id, 'label', e.target.value)}
                        className="w-full px-3 py-1.5 rounded border text-xs font-bold bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => onFieldChange(field.id, 'placeholder', e.target.value)}
                        className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Options List Editor for Dropdown, Radio, Checkbox */}
                  {(field.type === 'DROPDOWN' || field.type === 'RADIO' || field.type === 'CHECKBOX') && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-[11px] font-bold text-[#FF7A00] uppercase">Options (Comma Separated)</label>
                      <input
                        type="text"
                        placeholder="Option 1, Option 2, Option 3"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => {
                          const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                          onFieldChange(field.id, 'options', opts);
                        }}
                        className="w-full px-3 py-1.5 rounded border text-xs bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  )}

                  {/* Toggle Required Switch */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.is_required}
                        onChange={(e) => onFieldChange(field.id, 'is_required', e.target.checked)}
                        className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                      />
                      <span>Required Field</span>
                    </label>

                    <button
                      onClick={() => setActiveConditionalFieldId(activeConditionalFieldId === field.id ? null : field.id)}
                      className="text-xs font-bold text-[#FF7A00] hover:underline flex items-center space-x-1"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{field.conditional_logic?.if || field.conditional_logic?.parent ? 'Conditional: Active' : 'Add Conditional Rule'}</span>
                    </button>
                  </div>

                  {/* Conditional Rule Editor Accordion */}
                  {activeConditionalFieldId === field.id && (
                    <div className="p-3 rounded bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-xs space-y-2 mt-2">
                      <p className="font-bold text-[#FF7A00]">Conditional Visibility Rule</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500">Show If Field Label Has Value</label>
                          <input
                            type="text"
                            placeholder="e.g. AI/ML & GenAI"
                            value={field.conditional_logic?.equals || ''}
                            onChange={(e) =>
                              onFieldChange(field.id, 'conditional_logic', { if: 'parent', equals: e.target.value })
                            }
                            className="w-full px-2.5 py-1 rounded border text-xs bg-white dark:bg-[#151722]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
