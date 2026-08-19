import './globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import Footer from '@/components/Footer';
import { getModuleFlags } from '@/lib/moduleFlags';

export const metadata = {
  title: 'SRKR Coding Club Platform',
  description: 'Unified platform for SRKR Coding Club events, hackathons, IconCoders, codequest daily problems, and career drives.',
};

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
        <NavbarSwitcher moduleFlags={moduleFlags} />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
