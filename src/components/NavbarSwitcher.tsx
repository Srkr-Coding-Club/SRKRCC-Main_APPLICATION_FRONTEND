'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import AdminNavbar from './admin/AdminNavbar';

interface NavbarSwitcherProps {
  moduleFlags?: Record<string, boolean>;
}

export default function NavbarSwitcher({ moduleFlags }: NavbarSwitcherProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return isAdminRoute ? <AdminNavbar /> : <Navbar moduleFlags={moduleFlags} />;
}
