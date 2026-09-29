'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Info, CheckCircle2, AlertTriangle, AlertOctagon, X } from 'lucide-react';
import { Announcement, AnnouncementType } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

const DISMISSED_KEY = 'srkrcc_dismissed_announcements';

const TYPE_STYLE: Record<AnnouncementType, { text: string; icon: React.ElementType }> = {
  INFO: { text: 'text-blue-500 dark:text-blue-400', icon: Info },
  SUCCESS: { text: 'text-emerald-500 dark:text-emerald-400', icon: CheckCircle2 },
  WARNING: { text: 'text-amber-500 dark:text-amber-400', icon: AlertTriangle },
  URGENT: { text: 'text-rose-500 dark:text-rose-400', icon: AlertOctagon },
};

function readDismissed(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: number[]) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // localStorage can throw in private-browsing/blocked-storage contexts —
    // dismissal still applies for this render via component state.
  }
}

export default function AnnouncementBannerClient({ announcements }: { announcements: Announcement[] }) {
  // Starts as "nothing dismissed" so server and first client render match
  // (avoids a hydration mismatch) — the real per-viewer dismiss state from
  // localStorage is applied right after mount, in the effect below.
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setDismissedIds(readDismissed());
  }, []);

  const visible = announcements.filter((a) => !dismissedIds.includes(a.id));
  const expanded = visible.find((a) => a.id === expandedId) || null;

  // Roughly constant scroll speed regardless of item count — more items
  // means a longer track, so it needs proportionally more time to cross.
  const durationSeconds = Math.max(15, visible.length * 6);

  const dismissAll = () => {
    const next = Array.from(new Set([...dismissedIds, ...visible.map((a) => a.id)]));
    setDismissedIds(next);
    setExpandedId(null);
    writeDismissed(next);
  };

  const dismissOne = (id: number) => {
    const next = Array.from(new Set([...dismissedIds, id]));
    setDismissedIds(next);
    if (expandedId === id) setExpandedId(null);
    writeDismissed(next);
  };

  const renderItems = (hidden: boolean) =>
    visible.map((a) => {
      const style = TYPE_STYLE[a.type];
      const Icon = style.icon;
      return (
        <button
          key={`${hidden ? 'dup' : 'src'}-${a.id}`}
          type="button"
          tabIndex={hidden ? -1 : 0}
          aria-hidden={hidden}
          onClick={() => setExpandedId((cur) => (cur === a.id ? null : a.id))}
          className="inline-flex items-center gap-1.5 shrink-0 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:opacity-75 transition"
        >
          <Icon className={`w-3.5 h-3.5 shrink-0 ${style.text}`} />
          <span className="whitespace-nowrap">{a.title}</span>
        </button>
      );
    });

  if (visible.length === 0) return null;

  return (
    <div>
      <div className="group flex items-center bg-white/90 dark:bg-[#0D0E15]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 pl-4 pr-3 py-2 shrink-0 border-r border-slate-200 dark:border-slate-800 text-[#FF7A00]">
          <Megaphone className="w-4 h-4" />
        </div>

        <div className="relative flex-1 min-w-0 overflow-hidden py-2">
          <div
            className="flex w-max animate-marquee"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-800">{renderItems(false)}</div>
            <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-800" aria-hidden="true">
              {renderItems(true)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissAll}
          aria-label="Dismiss all announcements"
          className="shrink-0 p-2 mx-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="bg-white dark:bg-[#0D0E15] border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-start gap-3">
            {(() => {
              const style = TYPE_STYLE[expanded.type];
              const Icon = style.icon;
              return <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.text}`} />;
            })()}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">{expanded.title}</p>
              <MarkdownRenderer content={expanded.message} className="text-xs" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => dismissOne(expanded.id)}
                className="text-[11px] font-bold px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                aria-label="Collapse"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
