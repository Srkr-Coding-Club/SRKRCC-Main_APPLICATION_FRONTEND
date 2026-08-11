import { Sparkles, Trophy, Star, Users, Flame } from 'lucide-react';

export default function IconCodersPage() {
  const hallOfFame = [
    { year: '2025', team: 'Team Synergy', project: 'AI Medical Assistant', members: ['Ashok B.', 'Rohan K.', 'Sneha P.'] },
    { year: '2024', team: 'CyberKnights', project: 'Decentralized Identity Vault', members: ['Vikram S.', 'Ananya R.', 'Karthik N.'] },
    { year: '2023', team: 'CodeCrafters', project: 'Smart Agri Monitor', members: ['Praveen M.', 'Divya T.'] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center py-12 px-6 rounded-3xl glass-panel relative overflow-hidden border border-purple-500/20 mb-16">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
          IconCoders <span className="text-purple-400">Flagship</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-300 text-lg leading-relaxed">
          SRKR Coding Club’s annual flagship hackathon—where top innovators compete for glory and recognition.
        </p>
      </div>

      {/* Hall of Fame */}
      <div>
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold text-white">Hall of Fame</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hallOfFame.map((item) => (
            <div key={item.year} className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4 inline-block">
                Edition {item.year}
              </span>
              <h3 className="text-xl font-extrabold text-white mb-1">{item.team}</h3>
              <p className="text-sky-400 text-sm font-semibold mb-4">{item.project}</p>
              
              <div className="border-t border-slate-800 pt-4">
                <span className="text-xs text-slate-500 font-medium block mb-2">Winning Members</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.members.map((m) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
