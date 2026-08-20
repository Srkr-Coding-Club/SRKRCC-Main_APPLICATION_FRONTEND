import React from 'react';
import Link from 'next/link';
import BrainLogo from './BrainLogo';

interface Feature {
  icon: React.ElementType;
  text: string;
}

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: Feature[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Shared split-screen shell for /login and /admin/login. Brand panel on the
 * left carries the visual weight (logo, headline, feature bullets) so the
 * form itself can stay minimal — plain fields, one solid CTA, no card-in-
 * card nesting or decorative noise competing with the inputs.
 */
export default function AuthLayout({ eyebrow, title, subtitle, features, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[#FAFAFC] dark:bg-[#0D0E15] transition-colors duration-300">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col justify-between bg-[#12131C] text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FF7A00, transparent 70%)' }}
        />

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <BrainLogo size={32} showRays={false} animated={false} />
          <span className="font-bold text-sm tracking-wide">SRKR Coding Club</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#FFA500]">
              {eyebrow}
            </span>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">{title}</h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">{subtitle}</p>
          </div>

          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#FF7A00]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-white/35">© {new Date().getFullYear()} SRKR Coding Club. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <BrainLogo size={30} showRays={true} animated={false} />
          <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">SRKR Coding Club</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {children}
        </div>

        {footer && <div className="w-full max-w-sm mx-auto lg:mx-0 mt-8">{footer}</div>}
      </div>
    </div>
  );
}
