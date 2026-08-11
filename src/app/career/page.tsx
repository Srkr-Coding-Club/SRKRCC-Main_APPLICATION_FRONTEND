import { fetchApi } from '@/lib/api-client';
import { JobListing } from '@/lib/types';
import { Briefcase, Building, MapPin, Clock } from 'lucide-react';

async function getJobs(): Promise<JobListing[]> {
  try {
    return await fetchApi<JobListing[]>('/career/');
  } catch (error) {
    return [];
  }
}

export default async function CareerPage() {
  const jobs = await getJobs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Briefcase className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Career Opportunities</h1>
          <p className="text-slate-400 text-sm">Internships, job drives, and referral applications.</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No active job drives at the moment</h3>
          <p className="text-sm text-slate-500 mt-1">Placement season listings will be updated here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((j) => (
            <div key={j.id} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 inline-block">
                {j.job_type}
              </span>
              <h3 className="text-xl font-bold text-white mb-1">{j.title}</h3>
              <p className="text-slate-400 text-sm font-medium mb-4">{j.company_name}</p>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>{j.location}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
