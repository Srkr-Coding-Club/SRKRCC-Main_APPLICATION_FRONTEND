import { useCallback, useEffect, useRef, useState } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * What a modal dialog owes keyboard and screen-reader users: focus moves into it when it opens and returns to where it
 * came from when it closes, Escape closes it, and Tab stays inside it. Give the returned ref (and `tabIndex={-1}`) to the
 * element that has `role="dialog"`; the behaviour lasts as long as that element is on the page.
 */
export function useDialog(onClose: () => void) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;
    const opener = document.activeElement as HTMLElement | null;
    (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus({ preventScroll: true });

    // On the document, not the dialog: when the focused button disappears (a list reloads, an item is removed) focus
    // drops to the page, and Escape and Tab must still belong to the dialog. With several open, only the top one acts.
    const isTop = () => {
      const open = document.querySelectorAll('[role="dialog"]');
      return open[open.length - 1] === node;
    };
    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && (active === first || active === node)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [node]);

  return ref;
}
