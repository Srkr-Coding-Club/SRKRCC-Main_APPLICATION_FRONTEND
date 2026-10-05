'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Trophy, Calendar, MapPin, Users, Plus, Link2, Pencil, Lock, Unlock, Trash2, Eye, EyeOff, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { EventFormPanel } from './EventFormPanel';

function StatusBadge({ status }: { status?: 'LIVE' | 'CLOSED' }) {
  const isClosed = status === 'CLOSED';
  return (
    <span
      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide ${
        isClosed
          ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
      }`}
    >
      {isClosed ? 'Closed' : 'Live'}
    </span>
  );
}

// Orthogonal to StatusBadge: status (LIVE/CLOSED) controls whether registration
// is open; this controls whether the item is publicly listed/findable at all.
// A CLOSED event still shows on the public site (with registration disabled);
// a HIDDEN one doesn't show up there in any form.
function VisibilityBadge({ isHidden }: { isHidden?: boolean }) {
  if (!isHidden) return null;
  return (
    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide bg-slate-800 text-slate-300 dark:bg-slate-700 dark:text-slate-200 inline-flex items-center gap-1">
      <EyeOff className="w-3 h-3" />
      Hidden
    </span>
  );
}

export function EventsHackathonsTab() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventPanel, setEventPanel] = useState<{ open: boolean; editing: Event | null }>({ open: false, editing: null });
  const [transitioningSlug, setTransitioningSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedEvents = await fetchApi<Event[]>('/events/').catch(() => []);
        setEvents(fetchedEvents || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleEventStatus = async (event: Event) => {
    const action = event.status === 'CLOSED' ? 'reopen' : 'close';
    setTransitioningSlug(event.slug);
    try {
      const updated = await fetchApi<Event>(`/events/${event.slug}/${action}/`, { method: 'POST' });
      setEvents((prev) => prev.map((e) => (e.slug === updated.slug ? updated : e)));
      toast.success(action === 'close' ? 'Event Closed' : 'Event Reopened', `"${updated.title}" is now ${updated.status}.`);
    } catch (err: any) {
      toast.error('Action Failed', err?.message || `Could not ${action} this event.`);
    } finally {
      setTransitioningSlug(null);
    }
  };

  const toggleEventVisibility = async (event: Event) => {
    const action = event.is_hidden ? 'show' : 'hide';
    setTransitioningSlug(event.slug);
    try {
      const updated = await fetchApi<Event>(`/events/${event.slug}/${action}/`, { method: 'POST' });
      setEvents((prev) => prev.map((e) => (e.slug === updated.slug ? updated : e)));
      toast.success(
        action === 'hide' ? 'Event Hidden' : 'Event Visible Again',
        action === 'hide' ? `"${updated.title}" no longer appears on the public site.` : `"${updated.title}" is visible to the public again.`
      );
    } catch (err: any) {
      toast.error('Action Failed', err?.message || `Could not ${action} this event.`);
    } finally {
      setTransitioningSlug(null);
    }
  };

  const deleteEvent = async (event: Event) => {
    const linked = event.form_title ? `\n\nThe linked registration form "${event.form_title}" and its responses are kept.` : '';
    if (!confirm(`Permanently delete event "${event.title}"?${linked}\n\nThis cannot be undone.`)) return;
    setTransitioningSlug(event.slug);
    try {
      await fetchApi(`/events/${event.slug}/`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.slug !== event.slug));
      if (eventPanel.editing?.slug === event.slug) setEventPanel({ open: false, editing: null });
      toast.success('Event Deleted', `"${event.title}" was removed.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || `Could not delete "${event.title}".`);
    } finally {
      setTransitioningSlug(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hackathons Navigation Callout (Replaces duplicate grid) */}
      <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-[#FF7A00]" />
            <span>Hackathon Management Center</span>
          </h3>
          <p className="text-xs text-slate-500">
            Create and manage hackathon contests, problem statements, rounds, shortlisting, squads, and broadcasts.
          </p>
        </div>

        <Link
          href="/admin/hackathons"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
        >
          <Settings2 className="w-4 h-4" />
          <span>Open Hackathon Center →</span>
        </Link>
      </div>

      {/* Events Hub Section */}
      <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#8B2E3B]" />
              <span>Workshops & Technical Seminars ({events.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Live scheduled events fetched from REST API backend.</p>
          </div>

          <button
            onClick={() => setEventPanel({ open: true, editing: null })}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8B2E3B] hover:bg-rose-900 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>

        {eventPanel.open && (
          <EventFormPanel
            isOpen={eventPanel.open}
            event={eventPanel.editing}
            onClose={() => setEventPanel({ open: false, editing: null })}
            onSaved={(saved) => {
              setEvents((prev) => {
                const exists = prev.some((e) => e.slug === saved.slug);
                return exists ? prev.map((e) => (e.slug === saved.slug ? saved : e)) : [saved, ...prev];
              });
            }}
          />
        )}

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live events from backend...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No scheduled events currently registered in backend.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((e) => {
              const registered = e.registration_count ?? 0;
              const fillRate = e.capacity > 0 ? Math.min(100, Math.round((registered / e.capacity) * 100)) : 0;
              return (
                <div key={e.id} className="p-5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-[#FF7A00]">{e.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>Capacity: {e.capacity}</span>
                      </span>
                      <VisibilityBadge isHidden={e.is_hidden} />
                      <StatusBadge status={e.status} />
                    </div>
                  </div>

                  <h4 className="font-bold text-[#1A1A2E] dark:text-white text-base">{e.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{e.description}</p>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span>{e.venue}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{registered} / {e.capacity} registered</span>
                      <span>{fillRate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#8B2E3B]"
                        style={{ width: `${fillRate}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Link2 className="w-3.5 h-3.5 text-[#8B2E3B]" />
                      <span>{e.form_title || 'No form linked'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setEventPanel({ open: true, editing: e })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleEventStatus(e)}
                      disabled={transitioningSlug === e.slug}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition disabled:opacity-50 ${
                        e.status === 'CLOSED'
                          ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/40 dark:hover:bg-emerald-950/30'
                          : 'text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      {e.status === 'CLOSED' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {e.status === 'CLOSED' ? 'Reopen' : 'Close'}
                    </button>
                    <button
                      onClick={() => toggleEventVisibility(e)}
                      disabled={transitioningSlug === e.slug}
                      title={e.is_hidden ? 'Show this event on the public site' : 'Hide this event from the public site entirely'}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {e.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {e.is_hidden ? 'Show' : 'Hide'}
                    </button>
                    <button
                      onClick={() => deleteEvent(e)}
                      disabled={transitioningSlug === e.slug}
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
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
