import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api-client';

export type TaskState = 'needed' | 'due' | 'ok' | 'unavailable';

export interface TaskRun {
  id: number;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  trigger: 'admin' | 'command';
  started_at: string;
  finished_at: string | null;
  result: string;
  error: string;
  by: string | null;
}

export interface MaintenanceTask {
  key: string;
  label: string;
  description: string;
  state: TaskState;
  unavailable_reason: string | null;
  pending: number;
  pending_label: string;
  every_hours: number | null;
  running: boolean;
  last_run: TaskRun | null;
  last_success_at: string | null;
}

export interface MaintenanceOverview {
  tasks: MaintenanceTask[];
  attention: number;
}

export const loadMaintenance = () => fetchApi<MaintenanceOverview>('/admin/maintenance/');
export const runTask = (key: string) => fetchApi<MaintenanceTask>(`/admin/maintenance/${encodeURIComponent(key)}/run/`, { method: 'POST' });

/** The Maintenance page tells the menu how many tasks need attention, so the badge changes without another request. */
export const MAINTENANCE_EVENT = 'srkrcc:maintenance-attention';
export const announceAttention = (count: number) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MAINTENANCE_EVENT, { detail: count }));
};

/** How many housekeeping tasks need running; 0 until known or when this person cannot see it. */
export function useMaintenanceAttention(enabled: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadMaintenance().then((overview) => live && setCount(overview.attention)).catch(() => undefined);
    const listen = (event: Event) => setCount(Number((event as CustomEvent).detail) || 0);
    window.addEventListener(MAINTENANCE_EVENT, listen);
    return () => { live = false; window.removeEventListener(MAINTENANCE_EVENT, listen); };
  }, [enabled]);
  return count;
}

/** "3 minutes ago", "yesterday"... for the last-run line. */
export function ago(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export const STATE_TEXT: Record<TaskState, { label: string; tone: string }> = {
  needed: { label: 'Needs running', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300' },
  due: { label: 'Run soon', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300' },
  ok: { label: 'Up to date', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  unavailable: { label: 'Not in use', tone: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300' },
};
