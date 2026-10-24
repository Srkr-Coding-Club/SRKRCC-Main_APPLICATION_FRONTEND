import type { Page } from '@playwright/test';

// One audit for any screen: nothing sideways, nothing cut off, nothing too small to tap, nothing off screen.
export interface Issue { kind: string; where: string }

export async function audit(page: Page, opts: { minTarget?: number; ignore?: string[] } = {}): Promise<Issue[]> {
  const minTarget = opts.minTarget ?? 24; // WCAG 2.2 AA: at least 24 x 24 CSS px
  return page.evaluate(({ minTarget, ignore }) => {
    const out: { kind: string; where: string }[] = [];
    const doc = document.documentElement;
    const name = (el: Element) => {
      const text = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${text ? ` "${text}"` : ''}`;
    };
    const skip = (el: Element) => ignore.some((sel) => el.closest(sel)) || !!el.closest('.sr-only, [aria-hidden="true"]') || !!el.closest('[data-nextjs-toast], nextjs-portal, #next-logo, [data-nextjs-dev-tools-button]');
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
    };

    if (doc.scrollWidth - doc.clientWidth > 1) out.push({ kind: 'page scrolls sideways', where: `${doc.scrollWidth}px wide in a ${doc.clientWidth}px window` });

    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (skip(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      // inside a scroller on purpose (tables, code)? then wide content is fine
      let scroller: Element | null = el.parentElement;
      let scrolls = false;
      while (scroller && scroller !== document.body) {
        const ox = getComputedStyle(scroller).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && scroller.scrollWidth > scroller.clientWidth) { scrolls = true; break; }
        if (ox === 'hidden' && scroller.getBoundingClientRect().right <= doc.clientWidth + 1) break;
        scroller = scroller.parentElement;
      }
      const pos = getComputedStyle(el).position;
      if (!scrolls && pos !== 'fixed' && r.right > doc.clientWidth + 1 && r.left < doc.clientWidth) {
        const tag = el.tagName.toLowerCase();
        if (['button', 'a', 'input', 'select', 'textarea', 'label', 'h1', 'h2', 'h3', 'p', 'span'].includes(tag)) out.push({ kind: 'runs off the right edge', where: `${name(el)} ends at ${Math.round(r.right)}px` });
      }
      if (r.left < -1 && pos !== 'fixed' && r.width > 4 && !el.closest('.sr-only')) {
        if (!getComputedStyle(el).position.includes('absolute')) out.push({ kind: 'starts off the left edge', where: `${name(el)} at ${Math.round(r.left)}px` });
      }

      const tag = el.tagName.toLowerCase();
      const interactive = ['button', 'a', 'select', 'textarea'].includes(tag) || (tag === 'input' && !['hidden'].includes((el as HTMLInputElement).type)) || el.getAttribute('role') === 'button';
      if (interactive) {
        const type = (el as HTMLInputElement).type;
        const checkable = type === 'checkbox' || type === 'radio';
        const label = el.closest('label');
        const box = checkable && label ? label.getBoundingClientRect() : r; // a whole option row is the target
        const sr = el.closest('.sr-only') || el.className?.toString().includes('sr-only');
        if (!sr && (box.width < minTarget || box.height < minTarget) && tag !== 'a') out.push({ kind: `tap target under ${minTarget}px`, where: `${name(el)} is ${Math.round(box.width)}x${Math.round(box.height)}` });
      }

      // text that is cut off without an ellipsis or a way to scroll
      if (['button', 'label', 'h1', 'h2', 'h3', 'p', 'span', 'a', 'th', 'td'].includes(tag) && (el as HTMLElement).innerText?.trim()) {
        const s = getComputedStyle(el);
        const clipped = el.scrollWidth > el.clientWidth + 2 && ['hidden', 'clip'].includes(s.overflowX) && s.textOverflow !== 'ellipsis';
        if (clipped) out.push({ kind: 'text is cut off', where: name(el) });
      }
    }

    // fixed things on top of each other or covering the page's main action
    const fixed = Array.from(document.querySelectorAll('body *')).filter((el) => getComputedStyle(el).position === 'fixed' && visible(el) && !skip(el) && !el.closest('[role="dialog"]'));
    for (const el of fixed) {
      const r = el.getBoundingClientRect();
      if (r.width > doc.clientWidth + 1 || r.height > window.innerHeight + 1) {
        if (!(r.width >= doc.clientWidth - 1 && r.height >= window.innerHeight - 1)) out.push({ kind: 'fixed element larger than the screen', where: name(el) });
      }
    }
    return out;
  }, { minTarget, ignore: opts.ignore ?? [] });
}

export const report = (issues: Issue[]) => {
  const unique = new Map<string, Issue>();
  for (const i of issues) unique.set(`${i.kind}|${i.where}`, i);
  return Array.from(unique.values()).map((i) => `${i.kind}: ${i.where}`);
};

