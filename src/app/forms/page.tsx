import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';
import {
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forms & Registrations Center',
  description:
    'Browse active registration forms, RSVP to club workshops, and apply for hackathons and student lead positions.',
};

async function getPublishedForms(): Promise<Form[]> {
  try {
    const forms = await fetchApi<Form[]>('/forms/');
    const now = Date.now();
    return forms.filter((f) => {
      if (f.status !== 'PUBLISHED' && f.status !== 'SCHEDULED') return false;
      const closeTime = f.close_at ? new Date(f.close_at).getTime() : null;
      // Hide expired forms from active list
      if (closeTime && now >= closeTime) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export default async function FormsCenterPage() {
  const formsToDisplay = await getPublishedForms();
  const now = Date.now();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <ClipboardList className="w-4 h-4 text-[#FF7A00]" />
              <span>SRKR CODING CLUB FORMS CENTER</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Active Registrations & Submissions
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Explore and fill out official application forms for upcoming hackathons, workshops, core team recruitment, and feedback surveys.
            </p>
          </div>
        </div>

        {/* Filter & Count Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-[#FF7A00]" />
            <h2 className="text-xl font-bold text-[#1A1A2E] dark:text-white">
              Open Forms ({formsToDisplay.length})
            </h2>
          </div>

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing all active & open club forms
          </span>
        </div>

        {/* Forms Grid */}
        {formsToDisplay.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-[#1A1A2E] dark:text-white">No Public Forms Currently Active</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Check back soon for new hackathon registrations, workshop RSVPs, and membership application forms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {formsToDisplay.map((form) => {
              const openTime = form.open_at ? new Date(form.open_at).getTime() : null;
              const isUpcoming = form.status === 'SCHEDULED' && openTime !== null && now < openTime;

              return (
                <div
                  key={form.slug || form.id}
                  className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Form Cover Banner Image */}
                    {form.image_url ? (
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        <img
                          src={
                            form.image_url.startsWith('https://data:')
                              ? form.image_url.replace('https://', '')
                              : form.image_url
                          }
                          alt={form.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151722] via-transparent to-transparent pointer-events-none"></div>
                        {form.category && (
                          <span className="absolute top-3 left-4 text-xs font-bold uppercase tracking-wider text-white bg-[#FF7A00] px-3 py-1 rounded-md shadow-sm">
                            {form.category}
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="absolute top-3 right-4 text-xs font-bold tracking-wider text-white bg-blue-600 px-3 py-1 rounded-md shadow-sm">
                            Upcoming
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Content Box */}
                    <div className="p-6 space-y-4">
                      {/* Status Pill if no image */}
                      {!form.image_url && (
                        <div className="flex items-center justify-between">
                          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00]">
                            <FileText className="w-6 h-6" />
                          </div>

                          <span className={`inline-flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-md border ${
                            isUpcoming
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-400 border-blue-500/30'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {isUpcoming ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{isUpcoming ? 'UPCOMING / SCHEDULED' : 'OPEN / PUBLISHED'}</span>
                          </span>
                        </div>
                      )}

                      {/* Form Title & Description */}
                      <div>
                        <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition">
                          {form.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mt-2">
                          {form.description}
                        </p>
                      </div>

                      {/* Date & Meta Info */}
                      <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {form.open_at && (
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span>Opens: {new Date(form.open_at).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {form.close_at && (
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-rose-400" />
                            <span>Closes: {new Date(form.close_at).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      {isUpcoming ? 'Opens Soon' : 'Online Submission'}
                    </span>

                    <Link
                      href={`/forms/${form.slug}`}
                      className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition ${
                        isUpcoming
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-[#FF7A00] hover:bg-[#E06B00] text-white'
                      }`}
                    >
                      <span>{isUpcoming ? 'View Schedule' : 'Fill Form'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
