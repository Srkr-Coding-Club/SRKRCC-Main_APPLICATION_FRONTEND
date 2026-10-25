import type { Metadata } from 'next';

// The address bar carries a one-time token: never send it on to another site as a referrer, never index the page.
export const metadata: Metadata = {
  title: 'Verify your email',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
