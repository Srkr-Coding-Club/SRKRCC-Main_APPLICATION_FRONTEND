'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Announcement, AnnouncementType } from '@/lib/types';
import { Megaphone, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { AnnouncementFormPanel } from './AnnouncementFormPanel';

const TYPE_BADGE: Record<AnnouncementType, string> = {
  INFO: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  SUCCESS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  WARNING: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  URGENT: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

export function AnnouncementsTab() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<{ open: boolean; editing: Announcement | null }>({ open: false, editing: null });
  const [transitioningId, setTransitioningId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const fetched = await fetchApi<Announcement[]>('/announcements/').catch(() => []);
        setAnnouncements(fetched || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleActive = async (announcement: Announcement) => {
    const nextActive = !announcement.is_active;
    setTransitioningId(announcement.id);
    // Optimistic — flip immediately, then best-effort persist.
    setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? { ...a, is_active: nextActive } : a)));
    try {
      const updated = await fetchApi<Announcement>(`/announcements/${announcement.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });
      setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(
        nextActive ? 'Announcement Activated' : 'Announcement Deactivated',
        nextActive ? `"${updated.title}" is now visible on the landing page.` : `"${updated.title}" no longer appears on the landing page.`
      );
    } catch (err: any) {
      // Roll the optimistic change back — it never actually persisted.
      setAnnouncements((prev) => prev.map((a) => (a.id === announcement.id ? announcement : a)));
      toast.error('Action Failed', err?.message || 'Could not update this announcement.');
    } finally {
      setTransitioningId(null);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!confirm(`Permanently delete "${announcement.title}"?\n\nThis cannot be undone.`)) return;
    setTransitioningId(announcement.id);
    try {
      await fetchApi(`/announcements/${announcement.id}/`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
      if (panel.editing?.id === announcement.id) setPanel({ open: false, editing: null });
      toast.success('Announcement Deleted', `"${announcement.title}" was removed.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || `Could not delete "${announcement.title}".`);
    } finally {
      setTransitioningId(null);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-[#FF7A00]" />
            <span>Announcements ({announcements.length})</span>
          </h3>
          <p className="text-xs text-slate-500">Shown as a banner on the landing page while Active.</p>
        </div>

        <button
          onClick={() => setPanel({ open: true, editing: null })}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {panel.open && (
        <AnnouncementFormPanel
          isOpen={panel.open}
          announcement={panel.editing}
          onClose={() => setPanel({ open: false, editing: null })}
          onSaved={(saved) => {
            setAnnouncements((prev) => {
              const exists = prev.some((a) => a.id === saved.id);
              return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
            });
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-6 text-xs text-slate-400">Loading announcements from backend...</div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400">
          No announcements yet. Create one to show it on the landing page.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-lg border space-y-2 transition-opacity ${
                a.is_active
                  ? 'bg-[#FAFAFC] dark:bg-[#0D0E15] border-slate-200 dark:border-slate-800'
                  : 'bg-[#FAFAFC]/50 dark:bg-[#0D0E15]/50 border-slate-200/60 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide border ${TYPE_BADGE[a.type]}`}>
                    {a.type}
                  </span>
                  <h4 className="font-bold text-[#1A1A2E] dark:text-white text-sm">{a.title}</h4>
                </div>
                <button
                  onClick={() => toggleActive(a)}
                  disabled={transitioningId === a.id}
                  title={a.is_active ? 'Deactivate (hide from landing page)' : 'Activate (show on landing page)'}
                  className="shrink-0 transition-transform duration-100 active:scale-90 disabled:opacity-50"
                >
                  {a.is_active ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 whitespace-pre-wrap">{a.message}</p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setPanel({ open: true, editing: a })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => deleteAnnouncement(a)}
                  disabled={transitioningId === a.id}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
