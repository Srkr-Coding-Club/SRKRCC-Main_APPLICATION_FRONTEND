'use client';

import React from 'react';
import { ExternalLink, FileDown } from 'lucide-react';
import { hackathonApi } from '@/lib/api/hackathons';
import type { IdeaTemplateInfo } from '@/lib/types';
import { IdeaFileActions } from './IdeaFileActions';

interface IdeaTemplateDownloadProps {
  slug: string;
  /** The file the organizers uploaded. Used first. */
  template?: IdeaTemplateInfo | null;
  /** Google Drive link, the fallback when there is no uploaded file. */
  url?: string;
}

/** The template the organizers want ideas to follow: the uploaded file (Download, Preview for PDFs), else their Google Drive link. */
export function IdeaTemplateDownload({ slug, template, url }: IdeaTemplateDownloadProps) {
  if (!template && !url) return null;
  return (
    <div className="space-y-2 rounded-xl border border-journey-text/10 bg-journey-text/[0.03] p-3 dark:border-slate-700">
      <p className="flex items-center gap-2 text-sm font-bold text-journey-text">
        <FileDown className="h-4 w-4 text-journey-accent" aria-hidden="true" /> Idea template
      </p>
      <p className="text-xs text-journey-muted">The organizers prepared a template. Open it, fill it in and upload it as your presentation.</p>
      {template ? (
        <IdeaFileActions slug={slug} link={(inline) => hackathonApi.ideaTemplateLink(slug, inline)} file={template} />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-journey-text/15 px-3 text-xs font-semibold text-journey-text hover:bg-journey-text/5 dark:border-slate-700">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open the template in Google Drive
        </a>
      )}
    </div>
  );
}
