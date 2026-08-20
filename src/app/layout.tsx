// The stylesheet is processed by Next.js; TypeScript may not resolve its side-effect import.
// @ts-ignore -- CSS is handled by the framework at build time.
import './globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import Footer from '@/components/Footer';
import { getModuleFlags } from '@/lib/moduleFlags';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://srkrcc.com'),
  title: {
    default: 'SRKR Coding Club — Innovate, Code, Excel',
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
  authors: [{ name: 'SRKR Coding Club Tech Wing', url: 'https://srkrcc.com' }],
  creator: 'SRKR Coding Club',
  publisher: 'SRKR Engineering College',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://srkrcc.com',
    siteName: 'SRKR Coding Club',
    title: 'SRKR Coding Club — Official Platform',
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
import { ToastContainer } from '@/components/ui/ToastContainer';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const moduleFlags = await getModuleFlags();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        {/* Blocking, runs before first paint — sets the `dark` class synchronously
            so there's no flash of the light theme while React hydrates. Dark is
            the default; a stored 'light' choice from a previous visit wins. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t?t==='dark':true);}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
        <ToastProvider>
          <NavbarSwitcher moduleFlags={moduleFlags} />
          <main className="flex-grow">{children}</main>
          <Footer />
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
