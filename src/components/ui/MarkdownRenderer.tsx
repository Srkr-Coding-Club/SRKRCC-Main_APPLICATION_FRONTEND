'use client';

import React from 'react';
import { isSafeHref } from '@/lib/urlSafety';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /**
   * `compact` (default) is the small, neutral rendering used in cards, previews and editors.
   * `article` is for long-form pages (a hackathon's overview or rules): a clear heading hierarchy, readable line
   * length, accent bullets and numbered steps, all on the journey-* theme tokens.
   */
  variant?: 'compact' | 'article';
}

/** Class names for every element, per variant. */
const STYLES = {
  compact: {
    root: 'space-y-1',
    h1: 'text-xl font-black text-slate-900 dark:text-white mt-4 mb-2',
    h2: 'text-lg font-black text-slate-900 dark:text-white mt-4 mb-1.5',
    h3: 'text-base font-bold text-slate-900 dark:text-white mt-3 mb-1',
    h4: 'text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1',
    p: 'text-sm leading-relaxed text-slate-600 dark:text-slate-300 my-1',
    ul: 'list-disc list-inside space-y-1 my-2 text-slate-600 dark:text-slate-300 pl-2',
    ol: 'list-decimal list-inside space-y-1 my-2 text-slate-600 dark:text-slate-300 pl-2',
    li: 'text-sm leading-relaxed',
    strong: 'font-extrabold text-slate-900 dark:text-white',
    em: 'italic text-slate-700 dark:text-slate-200',
    code: 'px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-mono text-xs border border-slate-200 dark:border-slate-700',
    link: 'text-orange-500 hover:text-orange-600 underline font-semibold transition',
    img: 'max-w-full h-auto rounded-lg my-2 border border-slate-200 dark:border-slate-800',
    quote: 'border-l-4 border-orange-500 pl-3 py-1 my-2 italic text-slate-600 dark:text-slate-400 bg-orange-500/5 rounded-r-lg text-sm',
    hr: 'my-4 border-slate-200 dark:border-slate-800',
    pre: 'p-3 my-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800',
    tableWrap: 'my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800',
    table: 'min-w-full text-sm border-collapse',
    thead: 'bg-slate-50 dark:bg-slate-900/60',
    th: 'px-3 py-2 text-left font-bold text-slate-900 dark:text-white border-b-2 border-slate-200 dark:border-slate-700 whitespace-nowrap',
    tr: 'border-b border-slate-100 dark:border-slate-800 last:border-0 even:bg-slate-50/50 dark:even:bg-slate-900/30',
    td: 'px-3 py-2 text-slate-600 dark:text-slate-300 align-top',
  },
  article: {
    root: 'max-w-[78ch]',
    h1: 'mt-10 mb-3 text-2xl font-black tracking-tight text-journey-text first:mt-0 sm:text-3xl',
    h2: 'mt-10 mb-3 flex items-center gap-3 border-t border-journey-text/10 pt-6 text-xl font-extrabold tracking-tight text-journey-text first:mt-0 first:border-0 first:pt-0 [h1+&]:mt-3 [h1+&]:border-0 [h1+&]:pt-0 [hr+&]:mt-0 [hr+&]:border-0 [hr+&]:pt-0 sm:text-2xl',
    h3: 'mt-7 mb-1.5 text-base font-bold text-journey-text sm:text-lg',
    h4: 'mt-5 mb-1 text-xs font-bold uppercase tracking-wider text-journey-accent',
    p: 'my-3 break-words text-[15px] leading-7 text-journey-text/80 sm:text-base sm:leading-8',
    ul: 'my-4 space-y-2.5',
    ol: 'my-4 space-y-3 [counter-reset:step]',
    li: 'relative break-words text-[15px] leading-7 text-journey-text/80 sm:text-base sm:leading-8',
    strong: 'font-bold text-journey-text',
    em: 'italic text-journey-text/90',
    code: 'rounded-md border border-journey-text/10 bg-journey-text/5 px-1.5 py-0.5 font-mono text-[0.85em] text-journey-accent',
    link: 'font-semibold text-journey-accent underline decoration-journey-accent/40 underline-offset-4 transition hover:decoration-journey-accent',
    img: 'my-4 h-auto max-w-full rounded-xl border border-journey-text/10',
    quote: 'my-5 rounded-r-xl border-l-4 border-journey-accent bg-journey-accent/5 px-4 py-3 text-[15px] leading-7 text-journey-text/85 sm:text-base',
    hr: 'my-6 border-journey-text/10',
    pre: 'my-4 overflow-x-auto rounded-xl border border-journey-text/10 bg-journey-text/5 p-4 font-mono text-xs leading-6 text-journey-text',
    tableWrap: 'my-5 overflow-x-auto rounded-xl border border-journey-text/10',
    table: 'min-w-full border-collapse text-sm',
    thead: 'bg-journey-text/5',
    th: 'whitespace-nowrap border-b border-journey-text/15 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-journey-text',
    tr: 'border-b border-journey-text/10 last:border-0 even:bg-journey-text/[0.03]',
    td: 'px-4 py-2.5 align-top text-journey-text/80',
  },
} as const;

/** Marker drawn in front of each list item in the article variant (an accent dot, or a numbered badge). */
const ARTICLE_BULLET = "pl-6 before:absolute before:left-0.5 before:top-[0.75em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-journey-accent before:content-[''] sm:before:top-[1em]";
const ARTICLE_STEP = 'pl-10 [counter-increment:step] before:absolute before:left-0 before:top-0.5 before:grid before:h-7 before:w-7 before:place-items-center before:rounded-full before:bg-journey-accent/15 before:text-xs before:font-bold before:text-journey-accent before:content-[counter(step)]';

/** True if `line` looks like a GFM table separator row, e.g. `| --- | :---: | ---: |`. */
function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-') || !trimmed.includes('|')) return false;
  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

/** Splits a `| a | b |` row into trimmed cell strings, dropping the empty
 * segments produced by leading/trailing pipes. */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

export function MarkdownRenderer({ content, className = '', variant = 'compact' }: MarkdownRendererProps) {
  if (!content || !content.trim()) return null;

  const st = STYLES[variant];
  const article = variant === 'article';

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className={st.ul}>
            {currentList.items.map((item, idx) => (
              <li key={idx} className={`${st.li} ${article ? ARTICLE_BULLET : ''}`}>{item}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className={st.ol}>
            {currentList.items.map((item, idx) => (
              <li key={idx} className={`${st.li} ${article ? ARTICLE_STEP : ''}`}>{item}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Process markdown inline tokens: bold, italic, code, links, strikethrough
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline Code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code key={keyIdx++} className={st.code}>
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Image: ![alt](url) - must be checked before the link pattern below,
      // since "![alt](url)" would otherwise fall through un-matched on the
      // leading "!" (it isn't "[", so the link regex never fires on it), then
      // the next pass sees a bare "[alt](url)" and renders it as a clickable
      // text link instead of an image - the exact bug this fixes.
      const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        tokens.push(
          isSafeHref(src) ? (
            <img
              key={keyIdx++}
              src={src}
              alt={alt}
              loading="lazy"
              className={st.img}
            />
          ) : (
            <span key={keyIdx++} className="text-rose-600 dark:text-rose-400 text-xs italic">[blocked image: unsafe URL]</span>
          )
        );
        remaining = remaining.slice(imageMatch[0].length);
        continue;
      }

      // Link: [label](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push(
          isSafeHref(linkMatch[2]) ? (
            <a
              key={keyIdx++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className={st.link}
            >
              {linkMatch[1]}
            </a>
          ) : (
            <span key={keyIdx++}>{linkMatch[1]}</span>
          )
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={keyIdx++} className={st.strong}>
            {renderInline(boldMatch[2])}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        tokens.push(
          <em key={keyIdx++} className={st.em}>
            {renderInline(italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Plain text character chunk - "!" is included here (even though it has
      // no rendering of its own) so a chunk never swallows the "!" that
      // belongs to a following "![alt](url)" image marker. Without it, this
      // scan finds the "[" one character later, the chunk ends up including
      // "...text!" with the "!" glued onto its end, and by the time control
      // returns to the top of the loop "remaining" starts with "[alt](url)"
      // - the image branch above never gets to see the "!" it requires.
      const nextSpecial = remaining.search(/[`\[\*_!]/);
      if (nextSpecial === -1) {
        tokens.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      } else if (nextSpecial === 0) {
        tokens.push(<span key={keyIdx++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      } else {
        tokens.push(<span key={keyIdx++}>{remaining.slice(0, nextSpecial)}</span>);
        remaining = remaining.slice(nextSpecial);
      }
    }

    return <>{tokens}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Fenced Code Block start/end
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        elements.push(
          <pre key={`code-${i}`} className={st.pre}>
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className={st.hr} />);
      continue;
    }

    // GFM Table - a row containing "|" whose very next line is a separator
    // row (| --- | --- |) is a table header; every following "|"-row is a
    // body row until a blank line or a line that stops containing "|".
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])) {
      flushList();
      const headerCells = splitTableRow(trimmed);
      let cursor = i + 2; // skip header row + separator row
      const bodyRows: string[][] = [];
      while (cursor < lines.length && lines[cursor].trim().includes('|')) {
        bodyRows.push(splitTableRow(lines[cursor]));
        cursor++;
      }
      elements.push(
        <div key={`table-${i}`} className={st.tableWrap}>
          <table className={st.table}>
            <thead>
              <tr className={st.thead}>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className={st.th}
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={st.tr}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={st.td}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = cursor - 1; // -1 because the outer for-loop's i++ advances past it
      continue;
    }

    // Headings (#### down to #)
    const heading = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const body = renderInline(heading[2]);
      if (level === 1) elements.push(<h1 key={`h1-${i}`} className={st.h1}>{body}</h1>);
      else if (level === 2) {
        elements.push(
          <h2 key={`h2-${i}`} className={st.h2}>
            {article && <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full bg-journey-accent" />}
            <span>{body}</span>
          </h2>
        );
      } else if (level === 3) elements.push(<h3 key={`h3-${i}`} className={st.h3}>{body}</h3>);
      else elements.push(<h4 key={`h4-${i}`} className={st.h4}>{body}</h4>);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${i}`} className={st.quote}>
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInline(ulMatch[1]));
      continue;
    }

    // Ordered List (1. )
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInline(olMatch[1]));
      continue;
    }

    // Empty Line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Standard Paragraph Line
    flushList();
    elements.push(
      <p key={`p-${i}`} className={st.p}>
        {renderInline(rawLine)}
      </p>
    );
  }

  flushList();

  return <div className={`${st.root} ${className}`}>{elements}</div>;
}
