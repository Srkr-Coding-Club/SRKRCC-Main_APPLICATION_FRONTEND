import type { Metadata } from 'next';
import DataManagementCenter from '@/components/admin/DataManagementCenter';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Data Management Center | Admin',
  description: 'Unified metadata-driven workspace to explore, filter, and export all SRKR Coding Club platform data.',
  robots: { index: false, follow: false },
};

export default function DataManagementPage() {
  return <DataManagementCenter />;
}
