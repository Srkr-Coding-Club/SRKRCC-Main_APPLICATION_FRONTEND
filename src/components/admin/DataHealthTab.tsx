'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart2,
  AlertTriangle,
  CheckCircle,
  Upload,
  User,
  FileText,
  Activity,
  Clock,
  TrendingUp,
  Layers,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { DataHealthResponse, DataHealthWarning, ActivityItem } from '@/lib/types';
import { relativeTime } from '@/lib/dataManagement';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';

interface DataHealthTabProps {
  onSwitchSubtab: (tab: string) => void;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-5 flex flex-col gap-2 transition-all ${
        accent
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-slate-300 dark:border-slate-700/60 bg-white dark:bg-[#151722]'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</span>
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${accent ? 'text-amber-400' : 'text-slate-600'}`}
        />
      </div>
      <div
        className={`text-3xl font-black font-mono tracking-tight ${
          accent ? 'text-amber-400' : 'text-[#1A1A2E] dark:text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function WarningCard({
  warning,
  onFixClick,
}: {
  warning: DataHealthWarning;
  onFixClick: (tab: string) => void;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-300">{warning.form_title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{warning.message}</p>
      </div>
      <button
        onClick={() => onFixClick(warning.action_link)}
        className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300 whitespace-nowrap"
      >
        Fix this <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'submission') return <User className="w-3.5 h-3.5 text-emerald-400" />;
  if (type === 'csv_import') return <Upload className="w-3.5 h-3.5 text-blue-400" />;
  return <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
}

export function DataHealthTab({ onSwitchSubtab }: DataHealthTabProps) {
  const { toast } = useToast();
  const [data, setData] = useState<DataHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchApi<DataHealthResponse>('/forms/data-health/')
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          const message = 'Could not load health data. Is the backend running?';
          setError(message);
          toast.error('Failed to Load', message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [toast]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading health data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <BarChart2 className="w-12 h-12 text-slate-700" />
        <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white">No data yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          {error || 'Create your first form to start tracking club data.'}
        </p>
        <button
          onClick={() => onSwitchSubtab('forms')}
          className="mt-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition"
        >
          Go to Builder →
        </button>
      </div>
    );
  }

  const { stats, warnings, recent_activity } = data;

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Forms" value={stats.total_forms} icon={FileText} />
        <StatCard label="Published" value={stats.published_forms} icon={TrendingUp} />
        <StatCard label="Responses" value={stats.total_responses} icon={Layers} />
        <StatCard
          label="Completion"
          value={`${stats.completion_rate}%`}
          icon={CheckCircle}
        />
        <StatCard
          label="Warnings"
          value={stats.warning_count}
          icon={AlertTriangle}
          accent={stats.warning_count > 0}
        />
        <StatCard
          label="Last Export"
          value={stats.last_export ? relativeTime(stats.last_export) : 'Never'}
          icon={Clock}
        />
      </div>

      {/* Warnings Panel */}
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">
            Active Warnings
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-mono">
              {warnings.length}
            </span>
          </h3>
        </div>
        <div className="p-5">
          {warnings.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">All systems healthy</span>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((w, i) => (
                <WarningCard
                  key={i}
                  warning={w}
                  onFixClick={onSwitchSubtab}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Recent Activity</h3>
          </div>
          <button
            onClick={() => onSwitchSubtab('responses')}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
          >
            View Full Audit Log <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {recent_activity.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500 text-center">No recent activity.</div>
          ) : (
            recent_activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-3.5">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <ActivityIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200">
                    <span className="font-semibold text-[#1A1A2E] dark:text-white">{item.actor}</span>
                    {' '}
                    <span className="text-slate-500 dark:text-slate-400">{item.detail}</span>
                  </p>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap flex-shrink-0">
                  {relativeTime(item.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
