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
  // The login screen is a full-bleed auth layout with its own branding —
  // no nav bar belongs on top of it.
  const isAuthRoute = pathname === '/login';

  if (isAuthRoute) return null;
  return isAdminRoute ? <AdminNavbar /> : <Navbar moduleFlags={moduleFlags} />;
}
