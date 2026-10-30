// The stylesheet is processed by Next.js; TypeScript may not resolve its side-effect import.
// @ts-ignore -- CSS is handled by the framework at build time.
import './globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import Footer from '@/components/Footer';
import { getModuleFlags } from '@/lib/moduleFlags';
import { SITE_URL } from '@/lib/site';
import { INTRO_CINEMA_SCRIPT } from '@/components/hero-intro/introEligibility';

import type { Metadata } from 'next';
import { Archivo, Inter, JetBrains_Mono, Poppins } from 'next/font/google';

/* Self-hosted by next/font. Each sets the CSS variable globals.css and
   tailwind.config.ts read (--font-inter, --font-display, ...); applied on
   <body>, so they override the plain-name fallbacks declared on :root. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SRKR Coding Club | Innovate, Code, Excel',
    template: '%s | SRKR Coding Club',
  },
  description:
    'The premier technical hub of SRKR Engineering College. Discover flagship hackathons like IconCoders, daily CodeQuest challenges, hands-on developer workshops, tech blogs, and dynamic registrations.',
  keywords: [
    'SRKR',
    'SRKR Engineering College',
    'SRKR Coding Club',
    'SRKRCC',
    'IconCoders',
    'CodeQuest',
    'Hackathons',
    'Coding Contests',
    'Web Development',
    'AI/ML',
    'Competitive Programming',
    'Student Developer Community',
  ],
  authors: [{ name: 'SRKR Coding Club Tech Wing', url: SITE_URL }],
  creator: 'SRKR Coding Club',
  publisher: 'SRKR Engineering College',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'SRKR Coding Club',
    title: 'SRKR Coding Club | Official Platform',
    description:
      'Participate in annual hackathons, solve daily CodeQuest challenges, attend tech workshops, and join the developer community.',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: 'SRKR Coding Club Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SRKR Coding Club Platform',
    description:
      'The unified portal for SRKR Engineering College student developers, flagship hackathons, CodeQuest, and workshops.',
    images: ['/icon.png'],
    creator: '@srkrcc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

import { ToastProvider } from '@/context/ToastContext';
import { EmailVerificationProvider } from '@/context/EmailVerificationContext';
import { VerificationBanner } from '@/components/verification/VerificationBanner';
import { VerificationGate } from '@/components/verification/VerificationGate';
import { ToastContainer } from '@/components/ui/ToastContainer';
import BackendHeartbeat from '@/components/BackendHeartbeat';
import { CelebrationHost } from '@/components/celebrations/CelebrationHost';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const moduleFlags = await getModuleFlags();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${archivo.variable} ${jetbrainsMono.variable} ${poppins.variable} min-h-screen flex flex-col antialiased`}>
        {/* Blocking, runs before first paint - sets the `dark` class synchronously
            so there's no flash of the light theme while React hydrates. Dark is
            the default; a stored 'light' choice from a previous visit wins. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t?t==='dark':true);}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
        {/* Also pre-paint: hides the navbar and banner on the home page while its
            scroll intro plays, so they don't flash in and out (see HeroIntro). */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_CINEMA_SCRIPT }} />
        <ToastProvider>
          <EmailVerificationProvider>
            <BackendHeartbeat />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-journey-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-journey-on-accent"
            >
              Skip to main content
            </a>
            <NavbarSwitcher moduleFlags={moduleFlags} />
            <VerificationBanner />
            <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
              <VerificationGate>{children}</VerificationGate>
            </main>
            <Footer />
            <ToastContainer />
            <CelebrationHost />
          </EmailVerificationProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
