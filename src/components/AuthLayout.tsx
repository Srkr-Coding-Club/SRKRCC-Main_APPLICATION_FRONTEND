import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  illustrationSrc?: string;
  illustrationAlt?: string;
}

/**
 * Shared split-screen shell for /login and /admin/login. Brand panel on the
 * left carries the visual weight (logo, headline, feature bullets) so the
 * form itself can stay minimal - plain fields, one solid CTA, no card-in-
 * card nesting or decorative noise competing with the inputs.
 */
export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  features,
  children,
  footer,
  illustrationSrc,
  illustrationAlt = '',
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-[calc(100dvh-4.625rem)] grid-cols-1 bg-[#FAFAFC] transition-colors duration-300 dark:bg-[#0D0E15] lg:grid-cols-2">
      {illustrationSrc ? (
        <div className="relative hidden min-h-0 bg-[radial-gradient(circle_at_20%_20%,_#FFE8D6_0%,_#FFF7F1_55%,_#FFFFFF_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,_rgba(255,122,0,0.18)_0%,_#1B1E2C_50%,_#151722_100%)] lg:block">
          <Image
            src={illustrationSrc}
            alt={illustrationAlt}
            fill
            priority
            sizes="(min-width: 640px) 380px, 100vw"
            className="object-contain p-6 sm:p-8"
          />
        </div>
      ) : (
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#12131C] p-12 text-white lg:flex">
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />
          <div
            className="pointer-events-none absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FF7A00, transparent 70%)' }}
          />

          <Link href="/" className="relative z-10 flex items-center gap-2.5">
            <BrainLogo size={32} showRays={false} animated={false} />
            <span className="text-sm font-bold tracking-wide">SRKR Coding Club</span>
          </Link>

          <div className="relative z-10 space-y-8">
            <div className="space-y-3">
              <span className="inline-block rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFA500]">
                {eyebrow}
              </span>
              <h1 className="text-3xl font-extrabold leading-tight xl:text-4xl">{title}</h1>
              <p className="max-w-sm text-sm leading-relaxed text-white/60">{subtitle}</p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                    <Icon className="h-4 w-4 text-[#FF7A00]" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[11px] text-white/35">© {new Date().getFullYear()} SRKR Coding Club. All rights reserved.</p>
        </div>
      )}

      {/* Form panel */}
      <div className="flex min-h-[calc(100dvh-4.625rem)] flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <BrainLogo size={30} showRays={true} animated={false} />
          <span className="font-bold text-sm text-[#1A1A2E] dark:text-white">SRKR Coding Club</span>
        </div>

        <div className="mx-auto w-full max-w-[440px]">
          {children}
        </div>

        {footer && <div className="mx-auto mt-8 w-full max-w-[440px]">{footer}</div>}
      </div>
    </div>
  );
}
