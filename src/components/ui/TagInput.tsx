'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags offered as one-click additions. */
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  id?: string;
}

/** Chip input: Enter or comma adds a tag, Backspace on an empty field removes the last one. */
export function TagInput({ value, onChange, suggestions = [], placeholder = 'Type a tag and press Enter', maxTags = 10, maxLength = 30, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const has = (tag: string) => value.some((existing) => existing.toLowerCase() === tag.toLowerCase());

  const add = (raw: string) => {
    const tag = raw.replace(/\s+/g, ' ').trim().slice(0, maxLength);
    if (!tag || has(tag) || value.length >= maxTags) return;
    onChange([...value, tag]);
  };

  const commit = () => {
    add(draft);
    setDraft('');
  };

  const available = suggestions
    .filter((tag) => !has(tag) && (!draft.trim() || tag.toLowerCase().includes(draft.trim().toLowerCase())))
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-[#FAFAFC] px-2.5 py-2 focus-within:border-[#FF7A00] dark:border-slate-800 dark:bg-[#0D0E15]">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[#FF7A00]/10 px-2 py-0.5 text-xs font-semibold text-[#C25A00] dark:text-[#FFB066]">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((existing) => existing !== tag))} aria-label={`Remove tag ${tag}`} className="rounded hover:bg-[#FF7A00]/20">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          maxLength={maxLength}
          disabled={value.length >= maxTags}
          onChange={(event) => {
            const text = event.target.value;
            if (text.includes(',')) {
              text.split(',').forEach(add);
              setDraft('');
            } else {
              setDraft(text);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={value.length >= maxTags ? `Up to ${maxTags} tags` : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-[#1A1A2E] outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>
      {available.length > 0 && value.length < maxTags && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400">Used elsewhere:</span>
          {available.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(tag)}
              className="rounded-md border border-slate-200 px-2 py-0.5 font-semibold text-slate-600 transition hover:border-[#FF7A00]/50 hover:text-[#FF7A00] dark:border-slate-700 dark:text-slate-300"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
