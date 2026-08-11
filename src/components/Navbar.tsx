'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Calendar, Trophy, Sparkles, Terminal, Briefcase, BookOpen, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home', icon: Code2 },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/hackathons', label: 'Hackathons', icon: Trophy },
    { href: '/iconcoders', label: 'IconCoders', icon: Sparkles },
    { href: '/codequest', label: 'Codequest', icon: Terminal },
    { href: '/career', label: 'Career', icon: Briefcase },
    { href: '/blogs', label: 'Blogs', icon: BookOpen },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition">
              <Code2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-wide">SRKR <span className="text-sky-400">Coding Club</span></span>
              <span className="text-xs text-slate-400 font-medium">Unified Platform</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
