import type { Metadata } from 'next';
import AdminGuard from '@/components/admin/AdminGuard';

export const metadata: Metadata = {
  title: 'Admin Control Room',
  description: 'SRKR Coding Club central administrator portal, data management, and system diagnostics.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
