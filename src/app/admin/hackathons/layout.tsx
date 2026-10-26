import type { Metadata } from 'next';

// A page of its own in the browser tab, history and screen-reader page announcements (the site title template adds the club name).
export const metadata: Metadata = { title: 'Hackathon management' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
