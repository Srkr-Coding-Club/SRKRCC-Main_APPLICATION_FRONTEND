'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Loader2, Search } from 'lucide-react';
import {
  College,
  CollegeChoice,
  DEFAULT_COLLEGE_CODE,
  DEFAULT_COLLEGE_NAME,
  formatCollegeLocation,
} from '@/lib/colleges';
import { OTHER_COLLEGE_NAME_MAX_LENGTH } from '@/lib/validation/auth';
import { useCollegeSearch } from '@/lib/hooks/useCollegeSearch';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;
const SCROLL_PRELOAD_PX = 120;

interface CollegeSelectProps {
  id: string;
  value: CollegeChoice;
  onChange: (choice: CollegeChoice) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function CollegeSelect({
  id,
  value,
  onChange,
  disabled = false,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: CollegeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const { colleges, hasMore, status, loadMore, retry } = useCollegeSearch(debouncedQuery, isOpen);
  const isSearching = status === 'loading' || query.trim() !== debouncedQuery;
  const listboxId = `${id}-listbox`;
  const optionId = (college: College) => `${id}-option-${college.id}`;

  const closePanel = (restoreFocus: boolean) => {
    setIsOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  const isOtherMode = value.otherName !== null;
  const otherInputId = `${id}-other`;

  const select = (college: College) => {
    onChange({ college, otherName: null });
    closePanel(true);
  };

  const chooseOther = () => {
    onChange({ college: null, otherName: query.trim() || value.otherName || '' });
    closePanel(false);
    requestAnimationFrame(() => otherInputRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closePanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [debouncedQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!isOpen || !sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: listRef.current, rootMargin: `${SCROLL_PRELOAD_PX}px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, hasMore, loadMore, colleges.length]);

  useEffect(() => {
    const active = colleges[activeIndex];
    if (isOpen && active) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, colleges]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, colleges.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (colleges[activeIndex]) select(colleges[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        closePanel(true);
        break;
      case 'Tab':
        closePanel(false);
        break;
    }
  };

  const isSelected = (college: College) => {
    if (isOtherMode) return false;
    return value.college ? college.id === value.college.id : college.code === DEFAULT_COLLEGE_CODE;
  };
  const activeDescendant = colleges[activeIndex] ? optionId(colleges[activeIndex]) : undefined;
  const showEmpty = status === 'idle' && !isSearching && colleges.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen((previous) => !previous)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-xs shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#101117] ${
          isOpen
            ? 'border-[#FF7A00] ring-2 ring-[#FF7A00]/10'
            : 'border-slate-200 dark:border-slate-800 hover:border-[#FF7A00]/50'
        }`}
      >
        <span className="truncate font-medium text-slate-800 dark:text-slate-100">
          {isOtherMode ? 'Other (my college is not listed)' : value.college?.name ?? DEFAULT_COLLEGE_NAME}
        </span>
        <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#FF7A00]' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl glass-panel-solid bg-white shadow-[0_12px_35px_rgba(0,0,0,0.12)] dark:bg-[#151622] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
          <div className="relative border-b border-slate-200 p-2 dark:border-slate-800">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              aria-label="Search colleges"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              placeholder="Search your college..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full rounded-lg border border-slate-200 bg-[#FAFAFC] pl-9 pr-9 text-sm text-slate-800 outline-none focus:border-[#FF7A00] dark:border-slate-800 dark:bg-[#0D0E15] dark:text-slate-100"
            />
            {isSearching && (
              <Loader2 className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#FF7A00]" />
            )}
          </div>

          <div ref={listRef} id={listboxId} role="listbox" aria-label="Colleges" className="max-h-64 overflow-y-auto p-1.5">
            {colleges.map((college, index) => {
              const selected = isSelected(college);
              const location = formatCollegeLocation(college);
              return (
                <div
                  key={college.id}
                  id={optionId(college)}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(college)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    index === activeIndex ? 'bg-[#FF7A00]/[0.08]' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${selected ? 'font-semibold text-[#D85F00] dark:text-[#FF9A4A]' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                      {college.name}
                    </span>
                    {location && <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{location}</span>}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-[#FF7A00]" />}
                </div>
              );
            })}

            {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}

            {(status === 'loading' || status === 'loadingMore') && colleges.length === 0 && (
              <p role="status" className="px-3 py-4 text-center text-xs text-slate-500">Loading colleges...</p>
            )}
            {status === 'loadingMore' && (
              <p role="status" className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more...
              </p>
            )}
            {showEmpty && (
              <p role="status" className="px-3 py-4 text-center text-xs text-slate-500">
                No college matches &ldquo;{debouncedQuery}&rdquo;. Try a shorter name.
              </p>
            )}
            {status === 'error' && (
              <div role="alert" className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-rose-500">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Could not load colleges.
                </span>
                <button type="button" onClick={retry} className="font-bold text-[#FF7A00] hover:text-[#E06B00]">
                  Retry
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={chooseOther}
            className="w-full border-t border-slate-200 px-4 py-2.5 text-left text-xs font-bold text-[#D85F00] transition-colors hover:bg-[#FF7A00]/[0.06] dark:border-slate-800 dark:text-[#FF9A4A]"
          >
            My college is not listed - enter it manually
          </button>
        </div>
      )}

      {isOtherMode && (
        <input
          id={otherInputId}
          ref={otherInputRef}
          type="text"
          autoComplete="organization"
          maxLength={OTHER_COLLEGE_NAME_MAX_LENGTH}
          placeholder="Type your college name"
          aria-label="College name"
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          value={value.otherName ?? ''}
          disabled={disabled}
          onChange={(event) => onChange({ college: null, otherName: event.target.value })}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/10 disabled:opacity-50 dark:border-slate-800 dark:bg-[#101117] dark:text-slate-100"
        />
      )}
    </div>
  );
}
