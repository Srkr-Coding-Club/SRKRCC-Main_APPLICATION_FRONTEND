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
        className={`flex h-11 w-full items-center justify-between rounded-md border border-journey-text/10 bg-journey-bg/70 px-3 text-left text-sm text-journey-text outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen
            ? 'border-journey-accent ring-2 ring-journey-accent/15'
            : 'hover:border-journey-accent/40'
        }`}
      >
        <span className="truncate font-medium text-journey-text">
          {isOtherMode ? 'Other (my college is not listed)' : value.college?.name ?? DEFAULT_COLLEGE_NAME}
        </span>
        <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-journey-muted transition-transform ${isOpen ? 'rotate-180 text-journey-accent' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-journey-text/10 bg-journey-surface shadow-[0_16px_40px_-18px_rgba(30,41,59,0.35)] backdrop-blur-xl dark:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.85)]">
          <div className="relative border-b border-journey-text/10 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-journey-muted" />
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
              className="h-10 w-full rounded-md border border-journey-text/10 bg-journey-bg pl-9 pr-9 text-sm text-journey-text outline-none placeholder:text-journey-muted focus:border-journey-accent focus:ring-2 focus:ring-journey-accent/15"
            />
            {isSearching && (
              <Loader2 className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-journey-accent" />
            )}
          </div>

          <div ref={listRef} id={listboxId} role="listbox" aria-label="Colleges" className="max-h-[min(55vh,20rem)] overflow-y-auto p-1.5">
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
                    index === activeIndex ? 'bg-journey-accent/10' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${selected ? 'font-semibold text-journey-accent' : 'font-medium text-journey-text'}`}>
                      {college.name}
                    </span>
                    {location && <span className="block truncate text-xs text-journey-muted">{location}</span>}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-journey-accent" />}
                </div>
              );
            })}

            {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}

            {(status === 'loading' || status === 'loadingMore') && colleges.length === 0 && (
              <p role="status" className="px-3 py-4 text-center text-xs text-journey-muted">Loading colleges...</p>
            )}
            {status === 'loadingMore' && (
              <p role="status" className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-journey-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more...
              </p>
            )}
            {showEmpty && (
              <p role="status" className="px-3 py-4 text-center text-xs text-journey-muted">
                No college matches &ldquo;{debouncedQuery}&rdquo;. Try a shorter name.
              </p>
            )}
            {status === 'error' && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs text-journey-live">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Could not load colleges.
                </span>
                <button type="button" onClick={retry} className="min-h-9 rounded-md px-2 font-semibold text-journey-accent hover:bg-journey-accent/10">
                  Retry
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={chooseOther}
            className="min-h-11 w-full border-t border-journey-text/10 px-4 py-3 text-left text-xs font-semibold text-journey-accent transition-colors hover:bg-journey-accent/5"
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
          className="mt-2 h-11 w-full rounded-md border border-journey-text/10 bg-journey-bg/70 px-3 text-sm text-journey-text outline-none placeholder:text-journey-muted focus:border-journey-accent focus:ring-2 focus:ring-journey-accent/15 disabled:opacity-50"
        />
      )}
    </div>
  );
}
