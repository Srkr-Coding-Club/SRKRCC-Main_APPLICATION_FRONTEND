'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

/** Past this many options the list gets a search box. */
const SEARCH_THRESHOLD = 12;
const LIST_MAX_HEIGHT = 288;
const LIST_GAP = 6;
const VIEWPORT_MARGIN = 12;
/** Open upward when less than this fits below and more fits above. */
const MIN_ROOM_BELOW = 200;

interface ListPlacement {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

/**
 * Custom-styled replacement for a native <select> of forms. A native select's
 * dropdown popup is rendered by the OS/browser chrome, not by our CSS - on
 * some browsers that popup came through as large blank rows instead of dark
 * theme, showing a mostly-empty white box with only the hovered row legible.
 * This renders the whole list ourselves (mirrors the ModernSelect pattern
 * already used on the public form page), so it always matches the app's
 * theme and never depends on how a given browser paints native option rows.
 *
 * The list is portalled to <body> and positioned against the button, so a dialog or scroll area around the select
 * cannot clip it; it opens upward near the bottom of the screen. Long labels wrap, and long lists get a search box.
 */
export function FormSelect({
  value,
  options,
  placeholder,
  onChange,
  className = '',
  triggerClassName = '',
  allowClear = true,
  disabled = false,
  searchable,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  value: string;
  options: { value: string; label: string; hint?: string; disabled?: boolean }[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  /** Extra classes for the button that opens the list (height, weight, ...). */
  triggerClassName?: string;
  /** Show the placeholder as a selectable "none" row at the top. */
  allowClear?: boolean;
  disabled?: boolean;
  /** Force the search box on or off; by default it appears for lists longer than 12 options. */
  searchable?: boolean;
  /** Names the control for screen readers; give one of the two whenever no visible text names it. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState<ListPlacement | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  /** Sits under the button, or above it when the screen has more room there. */
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_MARGIN;
    const above = rect.top - LIST_GAP - VIEWPORT_MARGIN;
    const up = below < MIN_ROOM_BELOW && above > below;
    setPlacement({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(LIST_MAX_HEIGHT, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - rect.top + LIST_GAP } : { top: rect.bottom + LIST_GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    place();
    const follow = (event: Event) => {
      // Scrolling the list itself must not move it.
      if (!listRef.current?.contains(event.target as Node)) place();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', follow, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', follow, true);
    };
  }, [isOpen, place]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  const handleSelect = (v: string) => {
    onChange(v);
    close();
    triggerRef.current?.focus();
  };

  const optionButtons = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);

  /** Escape closes, arrows / Home / End move through the options, Tab leaves and closes the list. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const typing = (event.target as HTMLElement).tagName === 'INPUT';
    if (event.key === 'Escape' && isOpen) {
      // Closes the list only: a dialog around it must not also close and lose what was typed.
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'Tab') {
      // The list lives at the end of <body>, so hand focus back to the button first: Tab then moves on from there.
      if (isOpen && listRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
      close();
      return;
    }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : 0;
    if (!step || (typing && (step === 'first' || step === 'last'))) return;
    event.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      requestAnimationFrame(() => {
        const options = optionButtons();
        (options.find((option) => option.getAttribute('aria-selected') === 'true') ?? options[0])?.focus();
      });
      return;
    }
    const options = optionButtons();
    const at = options.indexOf(document.activeElement as HTMLButtonElement);
    const next = step === 'first' ? 0 : step === 'last' ? options.length - 1 : Math.min(Math.max(at + step, 0), options.length - 1);
    options[next]?.focus();
  };

  const rowClass = (active: boolean) =>
    `flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? 'bg-[#FF7A00]/10 font-semibold text-[#D85F00] dark:text-[#FF9A4A]' : 'text-[#1A1A2E] dark:text-slate-300 hover:bg-[#FF7A00]/[0.08]'
    }`;

  const list = isOpen && placement && (
    <div
      ref={listRef}
      role="listbox"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      style={{ position: 'fixed', left: placement.left, width: placement.width, top: placement.top, bottom: placement.bottom, maxHeight: placement.maxHeight }}
      className="z-[70] flex flex-col overflow-hidden rounded-xl glass-panel-solid bg-white dark:bg-[#151622] shadow-[0_12px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
    >
      {showSearch && (
        <div className="relative shrink-0 border-b border-slate-200/70 p-1.5 dark:border-slate-800">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search options"
            placeholder="Search…"
            autoComplete="off"
            // 16px on phones: iPhones zoom the page when a smaller text box is focused.
            className="h-10 w-full rounded-lg border border-slate-200 bg-transparent pl-8 pr-2 text-base text-[#1A1A2E] placeholder:text-slate-400 focus:border-orange-500/60 focus:outline-none dark:border-slate-700 dark:text-white sm:h-9 sm:text-sm"
          />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {allowClear && !needle && (
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect('')}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !value
                ? 'bg-[#FF7A00]/10 text-[#D85F00] dark:text-[#FF9A4A]'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-3.5 h-3.5" />}
          </button>
        )}
        {shown.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Nothing matches.</p>}
        {shown.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            aria-disabled={o.disabled}
            disabled={o.disabled}
            onClick={() => handleSelect(o.value)}
            className={rowClass(o.value === value)}
          >
            <span className={`min-w-0 break-words ${o.disabled ? 'opacity-40' : ''}`}>
              {o.label}
              {o.hint && <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">{o.hint}</span>}
            </span>
            {o.value === value && <Check className="mt-0.5 w-3.5 h-3.5 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={() => !disabled && (isOpen ? close() : setIsOpen(true))}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        // The name keeps the chosen value in it: a label alone would hide what is selected.
        aria-label={ariaLabel && !ariaLabelledBy ? `${ariaLabel}: ${selected?.label || placeholder}` : undefined}
        aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${triggerId}` : undefined}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 glass-panel border rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-orange-500/60' : 'border-slate-300 dark:border-slate-700'
        } ${triggerClassName}`}
      >
        <span className={`truncate ${selected ? 'text-[#1A1A2E] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} title={selected?.label}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {list && createPortal(list, document.body)}
    </div>
  );
}
