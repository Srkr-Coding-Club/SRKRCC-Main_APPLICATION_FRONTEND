'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api-client';
import { Event, Hackathon } from '@/lib/types';
import { Trophy, Calendar, MapPin, Users, Flame, Plus, Link2, Pencil, Lock, Unlock, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { EventFormPanel } from './EventFormPanel';
import { HackathonFormPanel } from './HackathonFormPanel';

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
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventPanel, setEventPanel] = useState<{ open: boolean; editing: Event | null }>({ open: false, editing: null });
  const [hackathonPanel, setHackathonPanel] = useState<{ open: boolean; editing: Hackathon | null }>({ open: false, editing: null });
  const [transitioningSlug, setTransitioningSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedEvents, fetchedHackathons] = await Promise.all([
          fetchApi<Event[]>('/events/').catch(() => []),
          fetchApi<Hackathon[]>('/hackathons/').catch(() => []),
        ]);
        setEvents(fetchedEvents || []);
        setHackathons(fetchedHackathons || []);
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

  const toggleHackathonStatus = async (hackathon: Hackathon) => {
    const action = hackathon.status === 'CLOSED' ? 'reopen' : 'close';
    setTransitioningSlug(hackathon.slug);
    try {
      const updated = await fetchApi<Hackathon>(`/hackathons/${hackathon.slug}/${action}/`, { method: 'POST' });
      setHackathons((prev) => prev.map((h) => (h.slug === updated.slug ? updated : h)));
      toast.success(action === 'close' ? 'Hackathon Closed' : 'Hackathon Reopened', `"${updated.title}" is now ${updated.status}.`);
    } catch (err: any) {
      toast.error('Action Failed', err?.message || `Could not ${action} this hackathon.`);
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

  const toggleHackathonVisibility = async (hackathon: Hackathon) => {
    const action = hackathon.is_hidden ? 'show' : 'hide';
    setTransitioningSlug(hackathon.slug);
    try {
      const updated = await fetchApi<Hackathon>(`/hackathons/${hackathon.slug}/${action}/`, { method: 'POST' });
      setHackathons((prev) => prev.map((h) => (h.slug === updated.slug ? updated : h)));
      toast.success(
        action === 'hide' ? 'Hackathon Hidden' : 'Hackathon Visible Again',
        action === 'hide' ? `"${updated.title}" no longer appears on the public site.` : `"${updated.title}" is visible to the public again.`
      );
    } catch (err: any) {
      toast.error('Action Failed', err?.message || `Could not ${action} this hackathon.`);
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

  const deleteHackathon = async (hackathon: Hackathon) => {
    const teams = hackathon.team_count ?? 0;
    const linked = hackathon.form_title ? ` The linked registration form "${hackathon.form_title}" and its responses are kept.` : '';
    if (!confirm(
      `Permanently delete hackathon "${hackathon.title}"?\n\n` +
      `This also deletes its ${teams} team(s) and their project submissions.${linked}\n\n` +
      `This cannot be undone.`
    )) return;
    setTransitioningSlug(hackathon.slug);
    try {
      await fetchApi(`/hackathons/${hackathon.slug}/`, { method: 'DELETE' });
      setHackathons((prev) => prev.filter((h) => h.slug !== hackathon.slug));
      if (hackathonPanel.editing?.slug === hackathon.slug) setHackathonPanel({ open: false, editing: null });
      toast.success('Hackathon Deleted', `"${hackathon.title}" and its teams were removed.`);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || `Could not delete "${hackathon.title}".`);
    } finally {
      setTransitioningSlug(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hackathons Engine Section */}
      <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[#FF7A00]" />
              <span>Hackathons & IconCoders Engine ({hackathons.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Live hackathon contests and team submissions fetched from REST API.</p>
          </div>

          <button
            onClick={() => setHackathonPanel({ open: true, editing: null })}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Hackathon</span>
          </button>
        </div>

        {hackathonPanel.open && (
          <HackathonFormPanel
            isOpen={hackathonPanel.open}
            hackathon={hackathonPanel.editing}
            onClose={() => setHackathonPanel({ open: false, editing: null })}
            onSaved={(saved) => {
              setHackathons((prev) => {
                const exists = prev.some((h) => h.slug === saved.slug);
                return exists ? prev.map((h) => (h.slug === saved.slug ? saved : h)) : [saved, ...prev];
              });
            }}
          />
        )}

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading live hackathons from backend...</div>
        ) : hackathons.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No hackathons currently registered in backend.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hackathons.map((h) => (
              <div key={h.id} className="p-5 rounded-lg bg-[#FAFAFC] dark:bg-[#0D0E15] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] border border-orange-200 dark:border-orange-800">
                      Prize: {h.prize_pool}
                    </span>
                    {h.is_flagship && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#8B2E3B] text-white flex items-center space-x-1">
                        <Flame className="w-3 h-3" />
                        <span>IconCoders Flagship</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <VisibilityBadge isHidden={h.is_hidden} />
                    <StatusBadge status={h.status} />
                  </div>
                </div>

                <h4 className="font-bold text-[#1A1A2E] dark:text-white text-base">{h.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{h.description}</p>
                <div className="text-[11px] font-mono text-slate-400">Theme: {h.theme}</div>

                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#FF7A00]" />
                    {h.registration_count ?? 0} registrations · {h.team_count ?? 0} teams
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                    {h.form_title || 'No form linked'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setHackathonPanel({ open: true, editing: h })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleHackathonStatus(h)}
                    disabled={transitioningSlug === h.slug}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition disabled:opacity-50 ${
                      h.status === 'CLOSED'
                        ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/40 dark:hover:bg-emerald-950/30'
                        : 'text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    {h.status === 'CLOSED' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {h.status === 'CLOSED' ? 'Reopen' : 'Close'}
                  </button>
                  <button
                    onClick={() => toggleHackathonVisibility(h)}
                    disabled={transitioningSlug === h.slug}
                    title={h.is_hidden ? 'Show this hackathon on the public site' : 'Hide this hackathon from the public site entirely'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {h.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {h.is_hidden ? 'Show' : 'Hide'}
                  </button>
                  <button
                    onClick={() => deleteHackathon(h)}
                    disabled={transitioningSlug === h.slug}
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
