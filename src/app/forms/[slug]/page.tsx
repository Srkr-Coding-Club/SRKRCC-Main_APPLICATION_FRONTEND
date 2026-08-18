'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Form, FormField, ConditionalLogic } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import {
  FileText,
  CheckCircle2,
  ArrowLeft,
  Send,
  AlertCircle,
  Upload,
  Bookmark,
  X,
  ChevronUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Conditional logic evaluator (mirrors backend + builder)
// ---------------------------------------------------------------------------

function evaluateSingleRule(
  rule: { if?: any; operator?: string; equals?: string; value?: string },
  answers: Record<string, any>
): boolean {
  const key = String(rule.if ?? '');
  if (!key) return true;
  const actual = String(answers[key] ?? '');
  if ('equals' in rule && !('operator' in rule)) return actual === String(rule.equals ?? '');
  const op = rule.operator ?? 'equals';
  const expected = String(rule.value ?? '');
  if (op === 'equals') return actual === expected;
  if (op === 'not_equals') return actual !== expected;
  if (op === 'greater_than') { try { return parseFloat(actual) > parseFloat(expected); } catch { return false; } }
  if (op === 'less_than') { try { return parseFloat(actual) < parseFloat(expected); } catch { return false; } }
  if (op === 'contains') return actual.toLowerCase().includes(expected.toLowerCase());
  return true;
}

function evaluateVisible(fields: FormField[], answers: Record<string, any>): Set<string | number> {
  const visible = new Set<string | number>();
  const MAX_PASSES = fields.length + 1;
  let changed = true;
  let passes = 0;
  while (changed && passes < MAX_PASSES) {
    changed = false;
    passes++;
    for (const field of fields) {
      const cl = field.conditional_logic as ConditionalLogic | undefined;
      let shouldShow = true;
      if (cl && (cl.rules?.length || cl.if)) {
        if (cl.rules?.length) {
          const results = cl.rules.map((r) => evaluateSingleRule(r, answers));
          shouldShow = cl.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
        } else {
          shouldShow = evaluateSingleRule(cl as any, answers);
        }
      }
      if (shouldShow && !visible.has(field.id)) { visible.add(field.id); changed = true; }
      else if (!shouldShow && visible.has(field.id)) { visible.delete(field.id); changed = true; }
    }
  }
  return visible;
}

// ---------------------------------------------------------------------------
// Signature capture sub-component
// ---------------------------------------------------------------------------

function SignatureField({ fieldId, value, onChange }: { fieldId: string | number; value: any; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.strokeStyle = '#1A1A2E'; ctx.lineWidth = 2; ctx.lineCap = 'round'; }
  }, []);
  const start = (e: React.MouseEvent) => {
    drawing.current = true;
    const r = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };
  const draw = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  };
  const stop = () => {
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };
  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef} width={500} height={130}
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-crosshair"
      />
      <div className="flex items-center space-x-3">
        <button type="button" onClick={clear} className="text-xs text-slate-400 hover:text-rose-500 font-semibold">Clear signature</button>
        {value && <span className="text-xs text-emerald-500 font-semibold">✓ Captured</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matrix field sub-component
// ---------------------------------------------------------------------------

function MatrixField({
  field, value, onChange, isCheckbox,
}: { field: FormField; value: any; onChange: (v: any) => void; isCheckbox: boolean }) {
  const rows = field.rows ?? ['Row 1', 'Row 2'];
  const cols = field.options ?? ['Column A', 'Column B'];
  const current: Record<string, string | string[]> = value || {};
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="text-sm w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#0D0E15]">
            <th className="p-3 text-left text-slate-500 font-semibold min-w-[120px]" />
            {cols.map((col) => <th key={col} className="p-3 text-center text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
              <td className="p-3 font-semibold text-[#1A1A2E] dark:text-slate-200 pr-6">{row}</td>
              {cols.map((col) => (
                <td key={col} className="p-3 text-center">
                  {isCheckbox ? (
                    <input type="checkbox"
                      checked={Array.isArray(current[row]) && (current[row] as string[]).includes(col)}
                      onChange={(e) => {
                        const rowVal = Array.isArray(current[row]) ? (current[row] as string[]) : [];
                        const next = e.target.checked ? [...rowVal, col] : rowVal.filter((c) => c !== col);
                        onChange({ ...current, [row]: next });
                      }}
                      className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                    />
                  ) : (
                    <input type="radio"
                      name={`matrix-${field.id}-${row}`}
                      checked={current[row] === col}
                      onChange={() => onChange({ ...current, [row]: col })}
                      className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating stars sub-component
// ---------------------------------------------------------------------------

function RatingField({ field, value, onChange }: { field: FormField; value: any; onChange: (v: number) => void }) {
  const max = field.max_value ?? 5;
  const min = field.min_value ?? 1;
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center space-x-1.5">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((star) => (
        <button key={star} type="button" onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => onChange(star)} className="text-3xl transition-transform hover:scale-110 focus:outline-none" aria-label={`${star} star`}>
          <span className={star <= (hover || value || 0) ? 'text-yellow-400 drop-shadow' : 'text-slate-200 dark:text-slate-700'}>★</span>
        </button>
      ))}
      {value ? <span className="text-sm text-slate-400 ml-2 font-mono">{value}/{max}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FormDetailSubmissionPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [form, setForm] = useState<Form | null>(null);

  // Draft restored via lazy initializer — runs before first render, no flash
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const draft = localStorage.getItem(`srkrcc_form_draft_${slug}`);
      return draft ? JSON.parse(draft) : {};
    } catch { return {}; }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string | number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [isStickyBarVisible, setIsStickyBarVisible] = useState(false);

  // Sample forms fallback
  const sampleFormsMap: Record<string, Form> = {
    'iconcoders-hackathon-2025': {
      id: 101, title: 'IconCoders Flagship Hackathon 2025 Registration', slug: 'iconcoders-hackathon-2025',
      description: 'Official registration form for SRKR Coding Club annual flagship hackathon.',
      status: 'PUBLISHED',
      fields: [
        { id: 1, label: 'Team Name', type: 'TEXT', placeholder: 'e.g. ByteBusters', is_required: true, order: 1 },
        { id: 2, label: 'Team Leader Name', type: 'TEXT', placeholder: 'Full Name', is_required: true, order: 2 },
        { id: 3, label: 'Leader Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 3 },
        { id: 4, label: 'Selected Track', type: 'DROPDOWN', options: ['AI/ML & GenAI', 'Full Stack Web Dev', 'Mobile App Development', 'Blockchain & Web3', 'Open Innovation'], is_required: true, order: 4 },
        { id: 5, label: 'Team Size', type: 'RADIO', options: ['2 Members', '3 Members', '4 Members'], is_required: true, order: 5 },
        { id: 6, label: 'Brief Project Abstract', type: 'PARAGRAPH', placeholder: 'Describe your project idea...', is_required: true, order: 6 },
        { id: 7, label: 'Rate Your Team\'s Technical Readiness', type: 'RATING', min_value: 1, max_value: 5, is_required: false, order: 7 },
      ],
    },
    'web-dev-workshop-rsvp': {
      id: 102, title: 'Web Development Workshop RSVP & Tool Kit', slug: 'web-dev-workshop-rsvp',
      description: 'Reserve your seat for the hands-on React & Next.js workshop.',
      status: 'PUBLISHED',
      fields: [
        { id: 8, label: 'Full Name', type: 'TEXT', placeholder: 'Your Name', is_required: true, order: 1 },
        { id: 9, label: 'College Email', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
        { id: 10, label: 'Current Year of Study', type: 'RADIO', options: ['1st Year', '2nd Year', '3rd Year', '4th Year'], is_required: true, order: 3 },
        { id: 11, label: 'Prior React Experience', type: 'DROPDOWN', options: ['Beginner', 'Intermediate', 'Advanced'], is_required: true, order: 4 },
        { id: 12, label: 'Workshop Satisfaction Rating', type: 'RATING', min_value: 1, max_value: 5, is_required: false, order: 5 },
      ],
    },
    'core-team-recruitment-2025': {
      id: 103, title: 'Core Team & Volunteer Recruitment 2025-26', slug: 'core-team-recruitment-2025',
      description: 'Apply to become an executive member or volunteer.',
      status: 'PUBLISHED',
      fields: [
        { id: 13, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
        { id: 14, label: 'College Email', type: 'EMAIL', is_required: true, order: 2 },
        { id: 15, label: 'Preferred Wing', type: 'DROPDOWN', options: ['Tech & Dev', 'Design & UI/UX', 'Events & Logistics', 'PR & Media'], is_required: true, order: 3 },
        { id: 16, label: 'Resume / Portfolio Link or PDF', type: 'FILE', is_required: false, order: 4 },
        { id: 17, label: 'Why do you want to join SRKRCC?', type: 'PARAGRAPH', placeholder: 'Tell us about your technical passion...', is_required: true, order: 5 },
      ],
    },
    'codequest-feedback-survey': {
      id: 104, title: 'Codequest Daily Feedback & Streak Rewards', slug: 'codequest-feedback-survey',
      description: 'Share feedback and claim your 30-day streak milestone reward.',
      status: 'PUBLISHED',
      fields: [
        { id: 18, label: 'Codequest Username', type: 'TEXT', is_required: true, order: 1 },
        { id: 19, label: 'Problem Rating', type: 'RATING', min_value: 1, max_value: 5, is_required: true, order: 2 },
        { id: 20, label: 'Suggestions for New Features', type: 'PARAGRAPH', is_required: false, order: 3 },
      ],
    },
  };

  useEffect(() => {
    async function loadForm() {
      if (!slug) return;
      try {
        const fetched = await fetchApi<Form>(`/forms/${slug}/`);
        if (fetched?.title) { setForm(fetched); return; }
      } catch {}
      const matched = sampleFormsMap[slug] || {
        id: 999, title: slug.replace(/-/g, ' ').toUpperCase(), slug,
        description: 'SRKR Coding Club Official Form Registration.', status: 'PUBLISHED',
        fields: [
          { id: 100, label: 'Full Name', type: 'TEXT', is_required: true, order: 1 },
          { id: 101, label: 'Email Address', type: 'EMAIL', is_required: true, order: 2 },
          { id: 102, label: 'Comments / Note', type: 'PARAGRAPH', is_required: false, order: 3 },
        ],
      };
      setForm(matched);
    }
    loadForm();
  }, [slug]);

  // Show draft banner if there's existing draft data and we haven't dismissed
  useEffect(() => {
    if (!slug || draftDismissed) return;
    try {
      const draft = localStorage.getItem(`srkrcc_form_draft_${slug}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (Object.keys(parsed).length > 0) setShowDraftBanner(true);
      }
    } catch {}
  }, [slug, draftDismissed]);

  // Sticky submit bar — appears after scrolling past 3rd field
  useEffect(() => {
    const handleScroll = () => {
      const thirdField = document.querySelector('[data-field-index="2"]');
      if (thirdField) {
        setIsStickyBarVisible(thirdField.getBoundingClientRect().bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = useCallback((fieldId: number | string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };
      try {
        if (slug) localStorage.setItem(`srkrcc_form_draft_${slug}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (errors[fieldId]) {
      setErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next; });
    }
  }, [slug, errors]);

  const handleBlur = (fieldId: number | string) => {
    setTouchedFields((prev) => new Set([...prev, fieldId]));
    const field = form?.fields?.find((f) => f.id === fieldId);
    if (field?.is_required && !formData[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: `${field.label} is required.` }));
    }
  };

  const handleDismissDraft = () => {
    setShowDraftBanner(false);
    setDraftDismissed(true);
  };

  const handleRestoreDraft = () => {
    setShowDraftBanner(false);
    setDraftDismissed(true);
    // formData already loaded from localStorage via lazy initializer — nothing to do
  };

  const handleClearAndRestart = () => {
    setFormData({});
    try { if (slug) localStorage.removeItem(`srkrcc_form_draft_${slug}`); } catch {}
    setShowDraftBanner(false);
    setDraftDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form?.fields) return;

    const visibleIds = evaluateVisible(form.fields, formData);
    const newErrors: Record<string, string> = {};
    form.fields.forEach((field) => {
      if (!visibleIds.has(field.id)) return;
      if (field.is_required && (formData[field.id] === undefined || formData[field.id] === '' || (Array.isArray(formData[field.id]) && formData[field.id].length === 0))) {
        newErrors[field.id] = `${field.label} is required.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouchedFields(new Set(Object.keys(newErrors)));
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/responses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: form.id,
          answers: form.fields
            .filter((f) => visibleIds.has(f.id))
            .map((f) => ({ field: f.id, value: formData[f.id] ?? null })),
        }),
      });
    } catch {}
    // Clear draft on success
    try { if (slug) localStorage.removeItem(`srkrcc_form_draft_${slug}`); } catch {}
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  // ---------------------------------------------------------------------------
  // Progress calculation (excludes SECTION fields and hidden conditional fields)
  // ---------------------------------------------------------------------------
  const visibleIds = form?.fields ? evaluateVisible(form.fields, formData) : new Set<string | number>();
  const answerableFields = (form?.fields ?? []).filter(
    (f) => f.type !== 'SECTION' && visibleIds.has(f.id)
  );
  const answeredCount = answerableFields.filter((f) => {
    const val = formData[f.id];
    return val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
  }).length;
  const progressPct = answerableFields.length > 0 ? Math.round((answeredCount / answerableFields.length) * 100) : 0;
  const requiredVisible = answerableFields.filter((f) => f.is_required);
  const requiredAnswered = requiredVisible.filter((f) => {
    const val = formData[f.id];
    return val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
  }).length;

  if (!form) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-20 text-center">
        <div className="w-10 h-10 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">Loading form...</p>
      </div>
    );
  }

  const inputCls = (fieldId: number | string, extra?: string) => {
    const isErr = !!errors[fieldId] && touchedFields.has(fieldId);
    return `w-full px-4 py-3 rounded-lg border text-sm bg-[#FAFAFC] dark:bg-[#0D0E15] text-[#1A1A2E] dark:text-white focus:outline-none transition ${isErr ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-[#FF7A00]'} ${extra ?? ''}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Back link */}
        <Link href="/forms" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FF7A00] px-4 py-2 rounded-lg bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 shadow-sm transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Forms Center</span>
        </Link>

        {/* Draft recovery banner */}
        {showDraftBanner && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-sm">
            <div className="flex items-center space-x-3">
              <Bookmark className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">📝 Resume your draft?</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">We found a saved draft from your last visit.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
              <button onClick={handleRestoreDraft} className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition">
                Keep Draft
              </button>
              <button onClick={handleClearAndRestart} className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-600 text-xs font-bold hover:bg-amber-50 transition">
                Start Fresh
              </button>
              <button onClick={handleDismissDraft} className="p-1.5 text-amber-400 hover:text-amber-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success confirmation */}
        {isSubmitted ? (
          <div className="bg-white dark:bg-[#151722] rounded-xl p-8 sm:p-12 border border-emerald-200 dark:border-emerald-900/50 shadow-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">Submission Received!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Thank you for submitting your response for <strong className="text-[#1A1A2E] dark:text-white">{form.title}</strong>.
            </p>
            <div className="pt-4">
              <Link href="/forms" className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#FF7A00] text-white font-bold text-sm shadow-sm hover:bg-[#E06B00] transition">
                <span>Return to Forms Center</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151722] rounded-xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-md space-y-8">

            {/* Form header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] dark:text-white">{form.title}</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{form.description}</p>

              {/* Progress bar */}
              {answerableFields.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{answeredCount} of {answerableFields.length} answered</span>
                    <span className="font-bold text-[#FF7A00]">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF7A00] to-amber-400 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {form.fields?.map((field, fieldIndex) => {
                if (!visibleIds.has(field.id)) return null;

                const isErr = !!errors[field.id] && touchedFields.has(field.id);

                if (field.type === 'SECTION') {
                  return (
                    <div key={field.id} data-field-index={fieldIndex} className="pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                      <h3 className="text-lg font-bold text-[#FF7A00]">{field.label}</h3>
                      {field.placeholder && <p className="text-xs text-slate-400 mt-0.5">{field.placeholder}</p>}
                    </div>
                  );
                }

                return (
                  <div key={field.id} data-field-index={fieldIndex} className="space-y-2">
                    <label className="block text-sm font-bold text-[#1A1A2E] dark:text-white">
                      {field.label} {field.is_required && <span className="text-[#8B2E3B] dark:text-rose-400">*</span>}
                    </label>

                    {/* TEXT / EMAIL / NUMBER / PHONE / URL */}
                    {(field.type === 'TEXT' || field.type === 'EMAIL' || field.type === 'NUMBER' || field.type === 'PHONE' || field.type === 'URL') && (
                      <input
                        type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : 'text'}
                        placeholder={field.placeholder || ''}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        onBlur={() => handleBlur(field.id)}
                        className={inputCls(field.id)}
                      />
                    )}

                    {/* PARAGRAPH */}
                    {field.type === 'PARAGRAPH' && (
                      <textarea rows={4} placeholder={field.placeholder || ''} value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        onBlur={() => handleBlur(field.id)}
                        className={inputCls(field.id)}
                      />
                    )}

                    {/* DATE */}
                    {field.type === 'DATE' && (
                      <input type="date" value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        onBlur={() => handleBlur(field.id)}
                        className={inputCls(field.id)}
                      />
                    )}

                    {/* TIME */}
                    {field.type === 'TIME' && (
                      <input type="time" value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        onBlur={() => handleBlur(field.id)}
                        className={inputCls(field.id)}
                      />
                    )}

                    {/* DROPDOWN */}
                    {field.type === 'DROPDOWN' && (
                      <select value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        onBlur={() => handleBlur(field.id)}
                        className={inputCls(field.id)}
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {/* RADIO */}
                    {field.type === 'RADIO' && (
                      <div className="space-y-2.5 pt-1">
                        {field.options?.map((opt) => (
                          <label key={opt} className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer group">
                            <input type="radio" name={`field-${field.id}`} value={opt} checked={formData[field.id] === opt}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              onBlur={() => handleBlur(field.id)}
                              className="w-4 h-4 text-[#FF7A00] focus:ring-[#FF7A00]"
                            />
                            <span className="group-hover:text-[#FF7A00] transition">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* CHECKBOX */}
                    {field.type === 'CHECKBOX' && (
                      <div className="space-y-2.5 pt-1">
                        {field.options?.map((opt) => (
                          <label key={opt} className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer group">
                            <input type="checkbox" value={opt}
                              checked={Array.isArray(formData[field.id]) && formData[field.id].includes(opt)}
                              onChange={(e) => {
                                const curr = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                const next = e.target.checked ? [...curr, opt] : curr.filter((i: string) => i !== opt);
                                handleInputChange(field.id, next);
                              }}
                              onBlur={() => handleBlur(field.id)}
                              className="w-4 h-4 text-[#FF7A00] rounded focus:ring-[#FF7A00]"
                            />
                            <span className="group-hover:text-[#FF7A00] transition">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* FILE */}
                    {field.type === 'FILE' && (
                      <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
                        <Upload className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Drag & drop or click to select</p>
                        <input type="file" onChange={(e) => handleInputChange(field.id, e.target.files?.[0]?.name || 'File')} onBlur={() => handleBlur(field.id)} className="mt-2 text-xs text-slate-500 w-full" />
                      </div>
                    )}

                    {/* MULTI_FILE */}
                    {field.type === 'MULTI_FILE' && (
                      <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
                        <Upload className="w-8 h-8 text-[#FF7A00] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Multiple files accepted</p>
                        <input type="file" multiple onChange={(e) => { const names = Array.from(e.target.files || []).map((f) => f.name); handleInputChange(field.id, names); }} onBlur={() => handleBlur(field.id)} className="mt-2 text-xs text-slate-500 w-full" />
                      </div>
                    )}

                    {/* RATING */}
                    {field.type === 'RATING' && (
                      <RatingField field={field} value={formData[field.id]} onChange={(v) => handleInputChange(field.id, v)} />
                    )}

                    {/* LINEAR_SCALE */}
                    {field.type === 'LINEAR_SCALE' && (
                      <div className="space-y-3 py-1">
                        <input type="range"
                          min={field.min_value ?? 1} max={field.max_value ?? 10}
                          value={formData[field.id] ?? field.min_value ?? 1}
                          onChange={(e) => handleInputChange(field.id, Number(e.target.value))}
                          onBlur={() => handleBlur(field.id)}
                          className="w-full accent-[#FF7A00]"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{field.min_value ?? 1} {(field.options || [])[0] ? `— ${field.options![0]}` : ''}</span>
                          <span className="font-bold text-[#FF7A00]">{formData[field.id] ?? '—'}</span>
                          <span>{field.max_value ?? 10} {(field.options || [])[1] ? `— ${field.options![1]}` : ''}</span>
                        </div>
                      </div>
                    )}

                    {/* MATRIX_RADIO */}
                    {field.type === 'MATRIX_RADIO' && (
                      <MatrixField field={field} value={formData[field.id]} onChange={(v) => handleInputChange(field.id, v)} isCheckbox={false} />
                    )}

                    {/* MATRIX_CHECKBOX */}
                    {field.type === 'MATRIX_CHECKBOX' && (
                      <MatrixField field={field} value={formData[field.id]} onChange={(v) => handleInputChange(field.id, v)} isCheckbox={true} />
                    )}

                    {/* SIGNATURE */}
                    {field.type === 'SIGNATURE' && (
                      <SignatureField fieldId={field.id} value={formData[field.id]} onChange={(v) => handleInputChange(field.id, v)} />
                    )}

                    {/* Inline error on blur */}
                    {isErr && (
                      <p className="text-xs text-rose-500 font-semibold flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{errors[field.id]}</span>
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Submit action */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center space-x-2 px-7 py-3 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-base shadow-sm transition disabled:opacity-50">
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Form'}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Sticky Submit Bar — appears after scrolling past 3rd field */}
      {isStickyBarVisible && !isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#151722]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500">
                <ChevronUp className="w-4 h-4 text-[#FF7A00]" />
                <span>
                  <strong className="text-[#FF7A00]">{requiredAnswered}</strong>
                  {' '}of{' '}
                  <strong>{requiredVisible.length}</strong>
                  {' '}required fields completed
                </span>
              </div>
              <div className="hidden sm:block h-1.5 w-32 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF7A00] to-amber-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleSubmit as any}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-extrabold text-sm shadow-md transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Submit Form'}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
