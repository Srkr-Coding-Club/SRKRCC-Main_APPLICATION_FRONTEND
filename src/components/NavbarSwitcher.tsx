'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

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
  // Admin routes get no navbar here. This component only knows the URL —
  // it has no idea whether the viewer is actually authorized, and rendering
  // AdminNavbar (its nav links, module names, and the viewer's own role
  // badge) purely from the path leaked the admin panel's shell to anyone who
  // navigated to /admin/*, even a signed-out or non-admin visitor, while
  // AdminGuard (one level deeper) correctly blocked the actual page content.
  // AdminGuard now renders AdminNavbar itself, only once it has confirmed
  // the viewer is really an admin/club lead.
  if (isAdminRoute) return null;
  return <Navbar moduleFlags={moduleFlags} />;
}
