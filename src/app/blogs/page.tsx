'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { BlogPost } from '@/lib/types';
import {
  BookOpen,
  User,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  Sparkles,
  Flame,
  Search,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const FALLBACK_BLOGS: BlogPost[] = [
  {
    id: 1,
    title: 'Building Scalable Microservices with Next.js 15 & Django REST Framework',
    slug: 'building-scalable-microservices-nextjs-django',
    excerpt: 'Learn how to architect high-performance full-stack web applications by leveraging Next.js 15 Server Components alongside Django SimpleJWT backend authentication.',
    content: 'Full step-by-step tutorial on building production-grade web systems...',
    author: 'Rahul Sharma',
    author_role: 'Club Lead & Core Dev',
    read_time: '7 min read',
    category: 'Web Dev & System Design',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    tags: ['Next.js 15', 'Django', 'Architecture', 'REST API'],
    published_at: '2025-05-15',
  },
  {
    id: 2,
    title: 'How We Placed Top 3 at National Hackathon: IconCoders Blueprint',
    slug: 'how-we-placed-top-3-national-hackathon-blueprint',
    excerpt: 'A comprehensive retrospective on team dynamics, rapid prototyping under 36-hour pressure, and key pitch presentation strategies that won us the gold.',
    content: 'In depth breakdown of hackathon winning strategies...',
    author: 'Ananya Verma',
    author_role: 'Hackathon Lead',
    read_time: '5 min read',
    category: 'Hackathon Guide',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    tags: ['Hackathon', 'Teamwork', 'Prototyping', 'Pitching'],
    published_at: '2025-05-10',
  },
  {
    id: 3,
    title: 'Demystifying Generative AI: Fine-Tuning LLMs for Real-world Apps',
    slug: 'demystifying-generative-ai-fine-tuning-llms',
    excerpt: 'Explore how open-source LLMs can be fine-tuned using LoRA and PyTorch to power customized AI assistants for campus project deployments.',
    content: 'Deep dive into parameter efficient fine tuning (PEFT) and LoRA...',
    author: 'Karthik Raju',
    author_role: 'AI/ML Wing Lead',
    read_time: '10 min read',
    category: 'AI & Machine Learning',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tags: ['AI/ML', 'PyTorch', 'LLMs', 'LoRA'],
    published_at: '2025-05-04',
  },
  {
    id: 4,
    title: 'Mastering Dynamic Programming for Competitive Programming Competitions',
    slug: 'mastering-dynamic-programming-competitive-programming',
    excerpt: 'A visual guide to identifying subproblems, establishing state transition equations, and optimizing memoization tables in C++ for Codequest.',
    content: 'Step-by-step breakdown of DP memoization techniques...',
    author: 'Siddharth Roy',
    author_role: 'CP Track Lead',
    read_time: '8 min read',
    category: 'Competitive Programming',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    tags: ['C++', 'Algorithms', 'DP', 'Codequest'],
    published_at: '2025-04-28',
  },
  {
    id: 5,
    title: 'Navigating Tech Placements: From Tier-3 College to Top MNC Offers',
    slug: 'navigating-tech-placements-tier-3-to-mnc-offers',
    excerpt: 'Alumni career insights on building resume-worthy projects, solving LeetCode efficiently, and cracking technical interview rounds.',
    content: 'Detailed interview preparation checklist and roadmap...',
    author: 'Priya Rao',
    author_role: 'SRKRCC Alumni',
    read_time: '6 min read',
    category: 'Career & Insights',
    image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80',
    tags: ['Placements', 'Interviews', 'Career', 'Resume'],
    published_at: '2025-04-20',
  },
];

function getAuthorInitial(author: any): string {
  if (!author) return 'U';
  if (typeof author === 'string') return author.charAt(0).toUpperCase();
  if (typeof author === 'object' && author.name) return author.name.charAt(0).toUpperCase();
  if (typeof author === 'object' && author.username) return author.username.charAt(0).toUpperCase();
  if (typeof author === 'object' && author.email) return author.email.charAt(0).toUpperCase();
  return 'A';
}

function getAuthorName(author: any): string {
  if (!author) return 'SRKRCC Author';
  if (typeof author === 'string') return author;
  if (typeof author === 'object' && (author.first_name || author.last_name)) return `${author.first_name || ''} ${author.last_name || ''}`.trim();
  if (typeof author === 'object' && author.username) return author.username;
  if (typeof author === 'object' && author.email) return author.email;
  return `Author #${author}`;
}

export default function BlogsPage() {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<BlogPost[]>(FALLBACK_BLOGS);

  useEffect(() => {
    async function loadBlogs() {
      try {
        const fetched = await fetchApi<BlogPost[]>('/blogs/');
        if (fetched && fetched.length > 0) {
          setBlogs(fetched);
        }
      } catch {
        // keep FALLBACK_BLOGS
      }
    }
    loadBlogs();
  }, []);

  const featuredPost = blogs[0];
  const remainingBlogs = blogs.slice(1);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SRKRCC Tech Publication</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Engineering Insights & Student Stories
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl">
              Explore deep dives into web development, systems architecture, competitive algorithms, and real campus placement success stories.
            </p>
          </div>
        </div>

        {/* Featured Story */}
        {featuredPost && (
          <div className="bg-white dark:bg-[#151722] rounded-xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-7 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-slate-900">
              <img
                src={featuredPost.image_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'}
                alt={featuredPost.title}
                className="w-full h-full object-cover transform hover:scale-105 transition duration-500"
              />
              <div className="absolute top-4 left-4">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#8B2E3B] text-white shadow">
                  Featured Story
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#FF7A00]">
                  <span>{featuredPost.category || 'Tech Guide'}</span>
                  <span>•</span>
                  <span>{featuredPost.read_time || '5 min read'}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A1A2E] dark:text-white leading-snug">
                  {featuredPost.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                {featuredPost.tags && featuredPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {featuredPost.tags.map((t, idx) => (
                      <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#8B2E3B] text-white font-bold flex items-center justify-center text-sm shadow">
                    {getAuthorInitial(featuredPost.author)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A2E] dark:text-white">{getAuthorName(featuredPost.author)}</p>
                    <p className="text-[11px] text-slate-400">{featuredPost.author_role || 'Core Contributor'}</p>
                  </div>
                </div>

                <button
                  onClick={() => toast.info('Article Reader', `Opening "${featuredPost.title}"`)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#E06B00] text-white font-bold text-xs shadow-sm transition"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blogs Grid Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-[#1A1A2E] dark:text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#FF7A00]" />
              <span>Latest Published Articles ({remainingBlogs.length})</span>
            </h3>
            <span className="text-xs font-medium text-slate-500">Updated weekly by club mentors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {remainingBlogs.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-[#151722] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Cover Image */}
                  {(post.image_url || post.cover_image) && (
                    <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                      <img
                        src={post.image_url || post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                      />
                      <span className="absolute top-3 left-4 text-[11px] font-bold uppercase tracking-wider text-white bg-[#8B2E3B] px-2.5 py-0.5 rounded shadow">
                        {post.category || 'Tutorial'}
                      </span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recently Published'}</span>
                      <span>{post.read_time || '5 min read'}</span>
                    </div>

                    <h4 className="text-lg font-bold text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition line-clamp-2 leading-snug">
                      {post.title}
                    </h4>

                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {post.tags?.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Author & Read Action */}
                <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-[#1A1A2E] dark:text-white font-bold flex items-center justify-center text-xs">
                      {getAuthorInitial(post.author)}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{getAuthorName(post.author)}</span>
                  </div>

                  <button
                    onClick={() => toast.info('Article Reader', `Opening "${post.title}"`)}
                    className="text-xs font-bold text-[#FF7A00] hover:text-[#E06B00] flex items-center space-x-1"
                  >
                    <span>Read</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
