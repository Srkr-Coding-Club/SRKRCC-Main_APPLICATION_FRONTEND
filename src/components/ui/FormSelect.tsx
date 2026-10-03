'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Custom-styled replacement for a native <select> of forms. A native select's
 * dropdown popup is rendered by the OS/browser chrome, not by our CSS - on
 * some browsers that popup came through as large blank rows instead of dark
 * theme, showing a mostly-empty white box with only the hovered row legible.
 * This renders the whole list ourselves (mirrors the ModernSelect pattern
 * already used on the public form page), so it always matches the app's
 * theme and never depends on how a given browser paints native option rows.
 */
export function FormSelect({
  value,
  options,
  placeholder,
  onChange,
  className = '',
  allowClear = true,
  disabled = false,
}: {
  value: string;
  options: { value: string; label: string; hint?: string; disabled?: boolean }[];
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  /** Show the placeholder as a selectable "none" row at the top. */
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (v: string) => {
    onChange(v);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 glass-panel border rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-orange-500/60' : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <span className={`truncate ${selected ? 'text-[#1A1A2E] dark:text-white' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-xl glass-panel-solid bg-white dark:bg-[#151622] p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
        >
          {allowClear && <button
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
          </button>}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled}
              disabled={o.disabled}
              onClick={() => handleSelect(o.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                o.value === value
                  ? 'bg-[#FF7A00]/10 font-semibold text-[#D85F00] dark:text-[#FF9A4A]'
                  : 'text-[#1A1A2E] dark:text-slate-300 hover:bg-[#FF7A00]/[0.08]'
              }`}
            >
              <span className={`truncate ${o.disabled ? 'opacity-40' : ''}`}>
                {o.label}
                {o.hint && <span className="ml-2 text-[11px] font-normal text-slate-400">{o.hint}</span>}
              </span>
              {o.value === value && <Check className="ml-2 w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
