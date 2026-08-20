'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { BlogPost, JobListing } from '@/lib/types';
import { BookOpen, Briefcase, Plus, Sparkles, Building, MapPin } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export function ContentHubTab() {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedBlogs, fetchedJobs] = await Promise.all([
          fetchApi<BlogPost[]>('/blogs/').catch(() => []),
          fetchApi<JobListing[]>('/career/').catch(() => []),
        ]);
        setBlogs(fetchedBlogs || []);
        setJobs(fetchedJobs || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Blogs & Tutorials Section */}
      <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#FF7A00]" />
              <span>Technical Blogs & Write-ups ({blogs.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Manage technical articles and knowledge posts fetched from REST API.</p>
          </div>

          <button
            onClick={() => toast.info('Article Management', 'Use Django Admin or API to publish new technical write-ups.')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live blogs from backend...</div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No blog articles currently stored in backend.</div>
        ) : (
          <div className="space-y-4">
            {blogs.map((b) => (
              <div key={b.id} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">{b.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{b.excerpt}</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Published
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Career & Placements Section */}
      <div className="bg-white dark:bg-[#151722] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-[#8B2E3B]" />
              <span>Career Placement Drives ({jobs.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Manage internship opportunities and job postings fetched from REST API.</p>
          </div>

          <button
            onClick={() => toast.info('Career Management', 'Use Django Admin or API to post verified placement drives.')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8B2E3B] hover:bg-rose-900 text-white font-bold text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post Job</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live job listings from backend...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No career listings currently stored in backend.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((j) => (
              <div key={j.id} className="p-4 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white">{j.title}</h4>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center space-x-1 font-bold text-[#8B2E3B]">
                      <Building className="w-3.5 h-3.5" />
                      <span>{j.company_name}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>{j.location}</span>
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#FF7A00] border border-orange-200">
                  {j.job_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
