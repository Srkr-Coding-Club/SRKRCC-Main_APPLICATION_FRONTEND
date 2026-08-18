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
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <NavbarSwitcher moduleFlags={moduleFlags} />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
