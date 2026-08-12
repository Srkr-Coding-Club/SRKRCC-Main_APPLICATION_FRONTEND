'use client';

import React from 'react';
import {
  Eye,
  Layers,
  Trash2,
  Type,
  Mail,
  AlignLeft,
  List,
  CheckCircle,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
} from 'lucide-react';
import { Form, FormField } from '@/lib/types';

const PALETTE_ITEMS = [
  { type: 'TEXT', label: 'Short Text Input', icon: Type, desc: 'Single-line text entry' },
  { type: 'EMAIL', label: 'Email Address', icon: Mail, desc: 'Validated email format' },
  { type: 'NUMBER', label: 'Phone / Number', icon: HashIcon, desc: 'Numeric or phone input' },
  { type: 'PARAGRAPH', label: 'Long Paragraph', icon: AlignLeft, desc: 'Multi-line text area' },
  { type: 'DROPDOWN', label: 'Dropdown List', icon: List, desc: 'Select one option from list' },
  { type: 'RADIO', label: 'Radio Choice', icon: CheckCircle, desc: 'Single selection radio' },
  { type: 'CHECKBOX', label: 'Checkboxes', icon: CheckSquare, desc: 'Multiple selection checkboxes' },
  { type: 'DATE', label: 'Date Picker', icon: Calendar, desc: 'Calendar date selector' },
  { type: 'TIME', label: 'Time Picker', icon: Clock, desc: 'Time format selector' },
  { type: 'FILE', label: 'File Upload', icon: Upload, desc: 'PDF / Image document upload' },
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-[#151722] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MICROSOFT FORMS DRAG & DROP BUILDER CANVAS</span>
        
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center space-x-2 ${
            isPreviewMode ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>{isPreviewMode ? 'Exit Preview' : '👁️ Live Preview Mode'}</span>
        </button>
      </div>

      {isPreviewMode ? (
        <div className="bg-white dark:bg-[#151722] rounded-xl p-8 border border-purple-200 dark:border-purple-900 shadow-xl max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/50 pb-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">LIVE PREVIEW MODE — END USER VIEW</span>
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
            <h2 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{formMeta.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{formMeta.description}</p>
          </div>

          <form onSubmit={onTestPreviewSubmit} className="space-y-6">
            {builderFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                  {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === 'TEXT' && (
                  <input
                    type="text"
                    required={field.is_required}
                    placeholder={field.placeholder}
                    onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                )}

                {field.type === 'EMAIL' && (
                  <input
                    type="email"
                    required={field.is_required}
                    placeholder={field.placeholder}
                    onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                )}

                {field.type === 'DROPDOWN' && (
                  <select
                    required={field.is_required}
                    onChange={(e) => setPreviewAnswers({ ...previewAnswers, [field.label]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  >
                    <option value="">Select option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-6 py-3 rounded-lg bg-purple-600 text-white font-bold text-sm shadow-md">
                Test Submit Response
              </button>
            </div>
          </form>
        </div>
      ) : (
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
              <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">Form Canvas & Settings</h2>
              <button onClick={onSaveForm} className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm">
                Save & Publish Form
              </button>
            </div>

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

            <div className="space-y-3">
              {builderFields.map((field, idx) => (
                <div key={field.id} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono font-bold text-[#FF7A00]">#{idx + 1}</span>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onFieldChange(field.id, 'label', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded border text-xs font-bold bg-white dark:bg-[#151722] text-[#1A1A2E] dark:text-white border-slate-200 dark:border-slate-800"
                  />
                  <button onClick={() => onRemoveField(field.id)} className="text-rose-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
