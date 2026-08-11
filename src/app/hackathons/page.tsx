import { fetchApi } from '@/lib/api-client';
import { Hackathon } from '@/lib/types';
import { Trophy, Award, Calendar } from 'lucide-react';

async function getHackathons(): Promise<Hackathon[]> {
  try {
    return await fetchApi<Hackathon[]>('/hackathons/');
  } catch (error) {
    return [];
  }
}

export default async function HackathonsPage() {
  const hackathons = await getHackathons();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Hackathons Engine</h1>
          <p className="text-slate-400 text-sm">Team registration, multi-round evaluations, and project judging.</p>
        </div>
      </div>

      {hackathons.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No active hackathons right now</h3>
          <p className="text-sm text-slate-500 mt-1">Stay tuned for upcoming hackathon announcements!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hackathons.map((h) => (
            <div key={h.id} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Prize Pool: {h.prize_pool}
                </span>
                {h.is_flagship && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Flagship Edition
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{h.title}</h3>
              <p className="text-slate-400 text-sm mb-4">Theme: {h.theme}</p>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">{h.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
