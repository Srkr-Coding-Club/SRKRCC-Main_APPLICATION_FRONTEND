import { fetchApi } from '@/lib/api-client';
import { Event } from '@/lib/types';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

async function getEvents(): Promise<Event[]> {
  try {
    return await fetchApi<Event[]>('/events/');
  } catch (error) {
    return [];
  }
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
          <Calendar className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Events & Workshops</h1>
          <p className="text-slate-400 text-sm">Workshops, technical seminars, and official club meetups.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No events scheduled at the moment</h3>
          <p className="text-sm text-slate-500 mt-1">Check back soon for upcoming workshops and tech talks!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div key={evt.id} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-4 inline-block">
                {evt.category}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{evt.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{evt.description}</p>
              
              <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>{evt.venue}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Capacity: {evt.capacity} participants</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
