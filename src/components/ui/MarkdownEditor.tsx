'use client';

import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  Eye,
  Edit3,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write detailed guidelines, eligibility criteria, rules, or instructions in Markdown...',
  minHeight = 'min-h-[140px]',
  label,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const selected = currentVal.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const nextVal =
      currentVal.substring(0, start) + replacement + currentVal.substring(end);

    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    // Find start of current line
    const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentVal.indexOf('\n', end);
    const actualEnd = lineEnd === -1 ? currentVal.length : lineEnd;

    const currentLine = currentVal.substring(lineStart, actualEnd);
    const updatedLine = `${prefix}${currentLine}`;

    const nextVal =
      currentVal.substring(0, lineStart) +
      updatedLine +
      currentVal.substring(actualEnd);

    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        lineStart + updatedLine.length,
        lineStart + updatedLine.length
      );
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormat('**', '**', 'bold text');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormat('*', '*', 'italic text');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        applyFormat('[', '](https://)', 'link title');
      }
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <span className="text-[10px] font-semibold text-orange-500 dark:text-orange-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Markdown Enabled</span>
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFC] dark:bg-[#0D0E15] overflow-hidden focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all shadow-sm">
        {/* Editor Toolbar Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#151722]/80 backdrop-blur flex-wrap gap-2">
          {/* Write / Preview Tab Toggle */}
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition ${
                mode === 'write'
                  ? 'bg-white dark:bg-[#0D0E15] text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition ${
                mode === 'preview'
                  ? 'bg-white dark:bg-[#0D0E15] text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Action Formatting Icons (Active in Write Mode) */}
          {mode === 'write' && (
            <div className="flex items-center gap-0.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyFormat('**', '**', 'bold text')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyFormat('*', '*', 'italic text')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => applyLinePrefix('## ')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyLinePrefix('### ')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => applyLinePrefix('- ')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyLinePrefix('1. ')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyLinePrefix('> ')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Quote Block"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => applyFormat('`', '`', 'code')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyFormat('[', '](https://)', 'link title')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Insert Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => applyLinePrefix('---\n')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-500 transition"
                title="Horizontal Divider"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => setShowCheatsheet(!showCheatsheet)}
                className={`p-1.5 rounded-lg transition ${
                  showCheatsheet
                    ? 'bg-orange-500/15 text-orange-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Markdown Cheatsheet"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Cheatsheet Helper Drawer */}
        {showCheatsheet && mode === 'write' && (
          <div className="p-3 bg-orange-500/5 border-b border-orange-500/20 text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="font-mono text-orange-400">**bold**</span> → <strong>bold</strong>
            </div>
            <div>
              <span className="font-mono text-orange-400">*italic*</span> → <em>italic</em>
            </div>
            <div>
              <span className="font-mono text-orange-400">## Title</span> → Heading 2
            </div>
            <div>
              <span className="font-mono text-orange-400">- item</span> → Bullet list
            </div>
            <div>
              <span className="font-mono text-orange-400">1. item</span> → Ordered list
            </div>
            <div>
              <span className="font-mono text-orange-400">&gt; quote</span> → Blockquote
            </div>
            <div>
              <span className="font-mono text-orange-400">[text](url)</span> → Link
            </div>
            <div>
              <span className="font-mono text-orange-400">`code`</span> → Code
            </div>
          </div>
        )}

        {/* Write Editor Area */}
        {mode === 'write' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full p-4 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-y leading-relaxed font-sans ${minHeight}`}
          />
        ) : (
          /* Live Markdown Preview Area */
          <div className={`p-4 bg-white dark:bg-[#151722] ${minHeight} overflow-y-auto`}>
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="h-full flex items-center justify-center py-8 text-slate-400 text-xs italic">
                No description written yet. Switch to "Write" to add guidelines.
              </div>
            )}
          </div>
        )}

        {/* Footer info pill */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/50 dark:bg-[#151722]/50 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-400">
          <span className="text-[10px]">
            {mode === 'write' ? 'Markdown Supported' : 'Rendered Preview'}
          </span>
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>
        </div>
      </div>
    </div>
  );
}
