'use client';

import React, { useState } from 'react';
import { Lock, X, CheckCircle2, UserPlus, AlertCircle, Send } from 'lucide-react';
import { Form, FormField } from '@/lib/types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedForm: Form | null;
  onSubmit: (e: React.FormEvent) => void;
  manualEntryAnswers: Record<string, any>;
  setManualEntryAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export function ManualEntryModal({
  isOpen,
  onClose,
  selectedForm,
  onSubmit,
  manualEntryAnswers,
  setManualEntryAnswers,
}: ManualEntryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !selectedForm) return null;

  const handleInputChange = (fieldIdOrKey: string | number, value: any) => {
    setManualEntryAnswers((prev) => ({
      ...prev,
      [fieldIdOrKey]: value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeFields = selectedForm.fields?.filter((f) => f.type !== 'SECTION' && !f.is_deleted) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#151722] rounded-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5 text-orange-500">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <UserPlus className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Manual Data Entry</h3>
              <p className="text-xs text-slate-500">Offline response recording override</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Form info */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target Form</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedForm.title}</p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
              selectedForm.status === 'PUBLISHED'
                ? 'bg-emerald-500/15 text-emerald-400'
                : selectedForm.status === 'SCHEDULED'
                ? 'bg-blue-500/15 text-blue-400'
                : selectedForm.status === 'CLOSED'
                ? 'bg-slate-700 text-slate-300'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {selectedForm.status}
          </span>
        </div>

        {/* Form Fields for Manual Entry */}
        <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
          
          {/* Base Candidate Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Candidate Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Candidate Full Name"
                value={manualEntryAnswers['Full Name'] || manualEntryAnswers['Name'] || ''}
                onChange={(e) => handleInputChange('Full Name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Candidate Email *
              </label>
              <input
                type="email"
                required
                placeholder="student@srkr.ac.in"
                value={manualEntryAnswers['College Email'] || manualEntryAnswers['Email'] || ''}
                onChange={(e) => handleInputChange('College Email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Dynamic Form-specific Fields */}
          {activeFields.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Form Fields ({activeFields.length})
              </p>

              {activeFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                  </label>

                  {/* Text / Email / Phone / URL / Number */}
                  {['TEXT', 'EMAIL', 'PHONE', 'URL', 'NUMBER'].includes(field.type) && (
                    <input
                      type={field.type === 'NUMBER' ? 'number' : field.type === 'EMAIL' ? 'email' : 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      required={field.is_required}
                      value={manualEntryAnswers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  )}

                  {/* Paragraph / Long text */}
                  {field.type === 'PARAGRAPH' && (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      required={field.is_required}
                      value={manualEntryAnswers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  )}

                  {/* Dropdown */}
                  {field.type === 'DROPDOWN' && (
                    <select
                      required={field.is_required}
                      value={manualEntryAnswers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Radio */}
                  {field.type === 'RADIO' && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name={`field-${field.id}`}
                            value={opt}
                            checked={manualEntryAnswers[field.id] === opt}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="text-orange-500 focus:ring-orange-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.type === 'CHECKBOX' && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            value={opt}
                            checked={Array.isArray(manualEntryAnswers[field.id]) && manualEntryAnswers[field.id].includes(opt)}
                            onChange={(e) => {
                              const curr = Array.isArray(manualEntryAnswers[field.id]) ? manualEntryAnswers[field.id] : [];
                              const next = e.target.checked ? [...curr, opt] : curr.filter((i: string) => i !== opt);
                              handleInputChange(field.id, next);
                            }}
                            className="rounded text-orange-500 focus:ring-orange-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Date */}
                  {field.type === 'DATE' && (
                    <input
                      type="date"
                      required={field.is_required}
                      value={manualEntryAnswers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] hover:brightness-110 text-white text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording...' : 'Record Manual Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
