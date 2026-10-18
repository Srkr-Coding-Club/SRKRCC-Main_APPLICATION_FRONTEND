'use client';

import React, { useState } from 'react';
import type { Hackathon } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { DeleteHackathonDialog } from './DeleteHackathonDialog';

interface UseHackathonLifecycleOptions {
  onChanged: (hackathon: Hackathon) => void;
  onDeleted: (slug: string) => void;
}

/** Hide / show / delete for a hackathon, shared by the admin list and the settings tab. Render `dialogs` once. */
export function useHackathonLifecycle({ onChanged, onDeleted }: UseHackathonLifecycleOptions) {
  const { toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hackathon | null>(null);

  const toggleVisibility = async (hackathon: Hackathon) => {
    const hiding = !hackathon.is_manually_hidden;
    if (hiding) {
      const ok = await confirm({
        title: 'Hide this hackathon?',
        message: 'It disappears from the public site and its public page returns "not found". Teams, rounds and registrations are untouched, and you can show it again any time.',
        confirmLabel: 'Hide hackathon',
      });
      if (!ok) return;
    }
    setBusySlug(hackathon.slug);
    try {
      const updated = hiding ? await hackathonApi.admin.hide(hackathon.slug) : await hackathonApi.admin.show(hackathon.slug);
      onChanged(updated);
      toast.success(hiding ? 'Hackathon hidden' : 'Hackathon visible again', updated.is_hidden && !hiding ? 'It is still outside its scheduled visibility window.' : undefined);
    } catch (err) {
      toast.error('Could not change visibility', apiErrorMessage(err));
    } finally {
      setBusySlug(null);
    }
  };

  const deleteHackathon = async (hackathon: Hackathon) => {
    setBusySlug(hackathon.slug);
    try {
      await hackathonApi.admin.remove(hackathon.slug, hackathon.slug);
      setDeleteTarget(null);
      onDeleted(hackathon.slug);
      toast.success('Hackathon deleted', `"${hackathon.title}" was removed.`);
    } catch (err) {
      toast.error('Delete failed', apiErrorMessage(err));
    } finally {
      setBusySlug(null);
    }
  };

  const dialogs = (
    <>
      {confirmDialog}
      {deleteTarget && (
        <DeleteHackathonDialog
          hackathon={deleteTarget}
          busy={busySlug === deleteTarget.slug}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteHackathon(deleteTarget)}
          onHideInstead={
            deleteTarget.is_manually_hidden || deleteTarget.status === 'DRAFT'
              ? undefined
              : () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  void toggleVisibility(target);
                }
          }
        />
      )}
    </>
  );

  return { busySlug, toggleVisibility, requestDelete: setDeleteTarget, dialogs };
}
