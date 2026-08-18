'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import AdminNavbar from './admin/AdminNavbar';

export default function NavbarSwitcher() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return isAdminRoute ? <AdminNavbar /> : <Navbar />;
}
