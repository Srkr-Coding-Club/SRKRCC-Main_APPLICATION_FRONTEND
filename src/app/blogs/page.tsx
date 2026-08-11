import { fetchApi } from '@/lib/api-client';
import { BlogPost } from '@/lib/types';
import { BookOpen, User, Calendar } from 'lucide-react';

async function getBlogs(): Promise<BlogPost[]> {
  try {
    return await fetchApi<BlogPost[]>('/blogs/');
  } catch (error) {
    return [];
  }
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Blogs & Write-ups</h1>
          <p className="text-slate-400 text-sm">Tech tutorials, member experiences, and club news.</p>
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No blog posts published yet</h3>
          <p className="text-sm text-slate-500 mt-1">Check back soon for articles written by club members!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {blogs.map((b) => (
            <div key={b.id} className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-2">{b.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{b.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
