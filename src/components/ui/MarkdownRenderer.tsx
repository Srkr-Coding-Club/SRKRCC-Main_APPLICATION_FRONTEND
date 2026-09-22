'use client';

import React from 'react';
import { isSafeHref } from '@/lib/urlSafety';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

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

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content || !content.trim()) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-slate-600 dark:text-slate-300 pl-2">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="text-sm leading-relaxed">{item}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 text-slate-600 dark:text-slate-300 pl-2">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="text-sm leading-relaxed">{item}</li>
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
          <code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-mono text-xs border border-slate-200 dark:border-slate-700">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Image: ![alt](url) — must be checked before the link pattern below,
      // since "![alt](url)" would otherwise fall through un-matched on the
      // leading "!" (it isn't "[", so the link regex never fires on it), then
      // the next pass sees a bare "[alt](url)" and renders it as a clickable
      // text link instead of an image — the exact bug this fixes.
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
              className="max-w-full h-auto rounded-lg my-2 border border-slate-200 dark:border-slate-800"
            />
          ) : (
            <span key={keyIdx++} className="text-rose-500 text-xs italic">[blocked image: unsafe URL]</span>
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
              className="text-orange-500 hover:text-orange-600 underline font-semibold transition"
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
          <strong key={keyIdx++} className="font-extrabold text-slate-900 dark:text-white">
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
          <em key={keyIdx++} className="italic text-slate-700 dark:text-slate-200">
            {renderInline(italicMatch[2])}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Plain text character chunk — "!" is included here (even though it has
      // no rendering of its own) so a chunk never swallows the "!" that
      // belongs to a following "![alt](url)" image marker. Without it, this
      // scan finds the "[" one character later, the chunk ends up including
      // "...text!" with the "!" glued onto its end, and by the time control
      // returns to the top of the loop "remaining" starts with "[alt](url)"
      // — the image branch above never gets to see the "!" it requires.
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
          <pre key={`code-${i}`} className="p-3 my-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
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
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200 dark:border-slate-800" />);
      continue;
    }

    // GFM Table — a row containing "|" whose very next line is a separator
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
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60">
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-3 py-2 text-left font-bold text-slate-900 dark:text-white border-b-2 border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 dark:border-slate-800 last:border-0 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-600 dark:text-slate-300 align-top">
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

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-black text-slate-900 dark:text-white mt-4 mb-1.5">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-black text-slate-900 dark:text-white mt-4 mb-2">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${i}`} className="border-l-4 border-orange-500 pl-3 py-1 my-2 italic text-slate-600 dark:text-slate-400 bg-orange-500/5 rounded-r-lg text-sm">
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
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 my-1">
        {renderInline(rawLine)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
