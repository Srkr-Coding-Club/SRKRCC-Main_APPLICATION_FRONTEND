'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Trash2,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api/notifications';
import type { UserNotification, AnnouncementType } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTypeIcon(type: AnnouncementType) {
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'URGENT':
      return <AlertOctagon className="h-4 w-4 text-rose-500" />;
    case 'INFO':
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getTypeBadgeColor(type: AnnouncementType) {
  switch (type) {
    case 'SUCCESS':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'WARNING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'URGENT':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse';
    case 'INFO':
    default:
      return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  }
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count lightweight
  const fetchCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.unread_count);
    } catch {
      // Ignore if unauthenticated or network error
    }
  }, []);

  // Fetch full notification list
  const fetchList = useCallback(async (isUnreadOnly = false) => {
    setLoading(true);
    try {
      const res = await notificationsApi.list(isUnreadOnly, 50);
      setNotifications(res.results);
      setUnreadCount(res.unread_count);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll count periodically (every 40 seconds)
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 40000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Load notifications when popover opens or tab switches
  useEffect(() => {
    if (open) {
      fetchList(tab === 'unread');
    }
  }, [open, tab, fetchList]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    setActionBusy(id);
    try {
      const res = await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(res.unread_count);
    } catch {
      toast.error('Failed', 'Could not mark notification as read');
    } finally {
      setActionBusy(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All Read', `Marked ${res.marked_count} notification(s) as read`);
    } catch {
      toast.error('Failed', 'Could not mark all notifications as read');
    }
  };

  const handleDelete = async (id: number) => {
    setActionBusy(id);
    try {
      const res = await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount(res.unread_count);
    } catch {
      toast.error('Failed', 'Could not remove notification');
    } finally {
      setActionBusy(null);
    }
  };

  const displayedList =
    tab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[#1A1A2E]/70 dark:text-white/70 hover:text-[#FF7A00] hover:border-[#FF7A00]/40 hover:bg-[#FF7A00]/5 transition duration-150 active:scale-95"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF7A00] px-1 font-mono text-[9px] font-extrabold text-white shadow-sm shadow-[#FF7A00]/40 animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] sm:w-[400px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0E1017]/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Top gradient hairline */}
          <div className="h-[2px] w-full bg-gradient-to-r from-[#8B2E3B] via-[#FF7A00] to-[#FFA500]" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 py-3 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#FF7A00]" />
              <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#FF7A00]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[#FF7A00] hover:bg-[#FF7A00]/10 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Filter */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/80 px-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`py-2 px-3 border-b-2 transition ${
                tab === 'all'
                  ? 'border-[#FF7A00] text-[#FF7A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab('unread')}
              className={`py-2 px-3 border-b-2 transition flex items-center gap-1.5 ${
                tab === 'unread'
                  ? 'border-[#FF7A00] text-[#FF7A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-xs text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-[#FF7A00] mb-2" />
                <span>Loading notifications…</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400 mb-3">
                  <CheckCheck className="h-6 w-6 text-emerald-500/80" />
                </div>
                <h4 className="text-xs font-bold text-[#1A1A2E] dark:text-white">
                  All caught up!
                </h4>
                <p className="text-[11px] text-slate-400 max-w-[220px] mt-1">
                  {tab === 'unread'
                    ? 'No unread notifications right now.'
                    : 'You have no notifications in your inbox.'}
                </p>
              </div>
            ) : (
              displayedList.map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative p-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] flex items-start gap-3 ${
                    !notif.is_read
                      ? 'bg-[#FF7A00]/[0.03] dark:bg-[#FF7A00]/[0.02]'
                      : ''
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div className="shrink-0 mt-0.5">{getTypeIcon(notif.type)}</div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-block rounded-full border px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase tracking-wider ${getTypeBadgeColor(
                          notif.type
                        )}`}
                      >
                        {notif.category}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold leading-snug truncate ${
                        notif.is_read
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-[#1A1A2E] dark:text-white'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Action Link if provided */}
                    {notif.link_url && (
                      <div className="pt-1">
                        <Link
                          href={notif.link_url}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7A00] hover:underline"
                        >
                          <span>Open action</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    {!notif.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        disabled={actionBusy === notif.id}
                        className="rounded p-1 text-slate-400 hover:text-emerald-500 transition"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(notif.id)}
                      disabled={actionBusy === notif.id}
                      className="rounded p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.is_read && (
                    <span className="absolute top-4 right-2 h-1.5 w-1.5 rounded-full bg-[#FF7A00]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
