import { fetchApi } from '@/lib/api-client';
import { Problem } from '@/lib/types';
import { Terminal, Flame, Award, CheckCircle2 } from 'lucide-react';

async function getProblems(): Promise<Problem[]> {
  try {
    return await fetchApi<Problem[]>('/codequest/');
  } catch (error) {
    return [];
  }
}

export default async function CodequestPage() {
  const problems = await getProblems();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Terminal className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Codequest Daily</h1>
          <p className="text-slate-400 text-sm">Daily coding problems, streak counters, and leaderboards.</p>
        </div>
      </div>

      {problems.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">Today's problem will be published at midnight!</h3>
          <p className="text-sm text-slate-500 mt-1">Check back soon to maintain your daily streak!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((p) => (
            <div key={p.id} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {p.difficulty}
                </span>
                <span className="text-xs text-slate-400 font-mono">Date: {p.scheduled_date}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{p.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">{p.statement}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
