import { fetchApi } from '@/lib/api-client';
import { FeatureFlag } from '@/lib/types';
import { ShieldCheck, ToggleLeft, ToggleRight, CheckCircle2, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';


async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await fetchApi<FeatureFlag[]>('/feature-flags/');
  } catch (error) {
    console.error('Failed to fetch feature flags:', error);
    return [];
  }
}

export default async function AdminPage() {
  const flags = await getFeatureFlags();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin Control Room</h1>
          <p className="text-slate-400 text-sm">Manage platform feature flags, dynamic forms, and module visibility.</p>
        </div>
      </div>

      {/* Feature Flags Manager */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-12">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white">Module Feature Flags</h2>
          </div>
          <span className="text-xs bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full border border-sky-500/20">
            PostgreSQL Connected
          </span>
        </div>

        {flags.length === 0 ? (
          <p className="text-slate-400 text-sm italic py-4">No feature flags found or backend is offline.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{flag.name}</span>
                    <span className="text-xs text-slate-500 font-mono">({flag.key})</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{flag.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      flag.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {flag.is_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
