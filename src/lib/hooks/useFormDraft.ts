'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api-client';
import { isNonAnswerType } from '@/lib/fieldTypes';
import { isEmpty } from '@/lib/formConditional';
import type { FormField } from '@/lib/types';

/**
 * Autosave for an unfinished form (`/forms/{slug}/draft/` on the server): the answers so far and the
 * page the person was on are restored when they come back, from any device.
 *
 * Files and signatures are never saved (they are too big to rewrite every few seconds), and nothing is
 * saved until the person has actually changed something.
 */

export interface RestoredDraft {
  answers: Record<string, any>;
  current_page: number;
  form_changed: boolean;
}

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

const NOT_SAVED_TYPES = ['FILE', 'MULTI_FILE', 'SIGNATURE'];
/** Files that go straight to storage are remembered by reference, so a draft can keep them. */
const UPLOAD_TYPES = ['FILE', 'MULTI_FILE'];
export const DRAFT_SAVE_DELAY_MS = 1500;

/** The answers worth keeping: real answers to ordinary questions, without files or profile-filled ones. */
export function persistableAnswers(fields: FormField[], formData: Record<string, any>, keepUploads = false): Record<string, any> {
  const kept: Record<string, any> = {};
  for (const field of fields) {
    if (field.is_deleted || isNonAnswerType(field.type) || (NOT_SAVED_TYPES.includes(field.type) && !(keepUploads && UPLOAD_TYPES.includes(field.type))) || field.profile_field) continue;
    const value = formData[String(field.id)];
    if (!isEmpty(value)) kept[String(field.id)] = value;
  }
  return kept;
}

/**
 * A copy in this tab's session storage, written on every change. It covers the moments the server cannot: the
 * session ran out (the next call bounces the person to the sign-in page and the autosave could not run), or the
 * connection dropped. Cleared on submit, and gone when the tab closes (answers can be personal).
 */
const BACKUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Keyed by person too: someone else signing in on the same tab must never be offered these answers.
const backupKey = (slug: string, owner: unknown) => `srkrcc_form_backup:${slug}:${owner ?? 'anon'}`;

export function readFormBackup(slug: string, owner: unknown): { answers: Record<string, any>; current_page: number } | null {
  try {
    const raw = sessionStorage.getItem(backupKey(slug, owner));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.answers !== 'object' || saved.answers === null || Date.now() - Number(saved.at) > BACKUP_MAX_AGE_MS) return null;
    return { answers: saved.answers, current_page: Number.isInteger(saved.current_page) ? saved.current_page : 0 };
  } catch {
    return null;
  }
}

function writeFormBackup(slug: string, owner: unknown, answers: Record<string, any>, currentPage: number) {
  try {
    if (Object.keys(answers).length === 0) sessionStorage.removeItem(backupKey(slug, owner));
    else sessionStorage.setItem(backupKey(slug, owner), JSON.stringify({ answers, current_page: currentPage, at: Date.now() }));
  } catch { /* storage full or blocked: the server copy still exists */ }
}

export function clearFormBackup(slug: string, owner: unknown) {
  try { sessionStorage.removeItem(backupKey(slug, owner)); } catch { /* nothing to clear */ }
}

const requestOptions = (extra: RequestInit = {}) => ({ silentAuth: true, ...extra }) as RequestInit;

export function useFormDraft({ slug, owner, fields, enabled, formData, currentPage, freshAnswers, keepUploads = false, onRestore }: {
  slug: string;
  /** Who is filling it in (their user id), so a local copy is only ever offered back to them. */
  owner?: string | number | null;
  fields: FormField[];
  /** Signed in, not editing a submitted response, and the form is still being filled in. */
  enabled: boolean;
  formData: Record<string, any>;
  currentPage: number;
  /**
   * What an untouched form holds (defaults and values from the link). Anything typed before the saved-draft lookup has
   * finished is then recognised as the person's own change instead of being taken as the starting point.
   */
  freshAnswers?: Record<string, any>;
  /** Files are uploaded straight to storage, so their references belong in the draft. */
  keepUploads?: boolean;
  onRestore: (draft: RestoredDraft) => void;
}) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const loadedFor = useRef<string | null>(null);
  const lastSaved = useRef<string | null>(null);   // snapshot the server has (or the starting point)
  const stopped = useRef(false);                   // the server said the form no longer takes drafts
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const freshRef = useRef(freshAnswers);
  freshRef.current = freshAnswers;

  // A different form: forget everything about the previous one.
  useEffect(() => {
    loadedFor.current = null;
    lastSaved.current = null;
    stopped.current = false;
    setReady(false);
    setStatus('idle');
    setSavedAt(null);
  }, [slug]);

  // Fetch the saved draft once, as soon as saving is allowed.
  useEffect(() => {
    if (!enabled || loadedFor.current === slug) return;
    loadedFor.current = slug;
    fetchApi<{ draft: (RestoredDraft & { updated_at?: string }) | null }>(`/forms/${slug}/draft/`, requestOptions())
      .then((res) => {
        const draft = res?.draft;
        if (draft) {
          lastSaved.current = JSON.stringify([draft.answers, draft.current_page]);
          onRestoreRef.current(draft);
        } else {
          useBackup();
        }
      })
      .catch(() => useBackup()) // the lookup failed (offline, signed out): this tab's own copy is the next best thing
      .finally(() => setReady(true));

    function useBackup() {
      const backup = readFormBackup(slug, owner);
      if (!backup) return;
      // Not "saved" yet: the next autosave pushes it to the server.
      lastSaved.current = JSON.stringify([{}, 0]);
      onRestoreRef.current({ ...backup, form_changed: false });
    }
  }, [enabled, slug]);

  // Save a moment after the last change.
  useEffect(() => {
    if (!enabled || !ready || stopped.current) return;
    const answers = persistableAnswers(fields, formData, keepUploads);
    const snapshot = JSON.stringify([answers, currentPage]);
    if (lastSaved.current === null) {
      // Nothing was restored: the untouched form is the starting point. Without that knowledge, whatever is on screen now is.
      lastSaved.current = freshRef.current ? JSON.stringify([persistableAnswers(fields, freshRef.current, keepUploads), 0]) : snapshot;
      if (lastSaved.current === snapshot) return;
    }
    if (snapshot === lastSaved.current) return;
    writeFormBackup(slug, owner, answers, currentPage);

    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        await fetchApi(`/forms/${slug}/draft/`, requestOptions({
          method: 'PUT',
          body: JSON.stringify({ answers, current_page: currentPage }),
        }));
        lastSaved.current = snapshot;
        setSavedAt(new Date());
        setStatus('saved');
      } catch (err: any) {
        // 409/404: the form closed or went away, so stop trying. Anything else may be a hiccup.
        if (err?.status === 409 || err?.status === 404) stopped.current = true;
        setStatus('error');
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, ready, fields, formData, currentPage, slug, owner, keepUploads]);

  return { status, savedAt };
}
