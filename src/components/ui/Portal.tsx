'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into <body>. Use for full-screen overlays: an ancestor with
 * backdrop-filter or transform (glass-panel, animated wrappers) would otherwise
 * become the containing block of a `fixed` overlay and clip or misplace it.
 */
export default function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
