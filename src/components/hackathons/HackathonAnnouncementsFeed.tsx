'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Megaphone, Siren } from 'lucide-react';
import type { HackathonAnnouncement } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

const TYPE_STYLE: Record<string, { icon: React.ElementType; bar: string; text: string }> = {
  INFO: { icon: Info, bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
  SUCCESS: { icon: CheckCircle2, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  WARNING: { icon: AlertTriangle, bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  URGENT: { icon: Siren, bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
};

export function formatDateTime(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function HackathonAnnouncementsFeed({
  announcements,
  emptyText = 'No announcements yet.',
  showAudience = false,
}: {
  announcements: HackathonAnnouncement[];
  emptyText?: string;
  showAudience?: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(announcements[0]?.id ?? null);

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Megaphone className="w-8 h-8 text-slate-400" />
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {announcements.map((a) => {
        const style = TYPE_STYLE[a.type] ?? TYPE_STYLE.INFO;
        const Icon = style.icon;
        const open = openId === a.id;
        return (
          <li key={a.id} className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-white/[0.02]">
            <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
            <button
              type="button"
              onClick={() => setOpenId(open ? null : a.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-3 pl-4 pr-3 py-3 text-left"
            >
              <Icon className={`mt-0.5 w-4 h-4 shrink-0 ${style.text}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDateTime(a.publish_at)}
                  {showAudience && a.audience !== 'PUBLIC' && (
                    <span className="ml-2 font-semibold text-[#FF7A00]">
                      · {a.audience_label}{a.round_name ? `: ${a.round_name}` : ''}
                    </span>
                  )}
                </p>
              </div>
              <ChevronDown className={`mt-0.5 w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="pl-11 pr-4 pb-4 text-sm">
                <MarkdownRenderer content={a.message} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
