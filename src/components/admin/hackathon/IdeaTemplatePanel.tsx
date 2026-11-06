'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import type { Hackathon, IdeaTemplateInfo } from '@/lib/types';
import { apiErrorMessage, hackathonApi } from '@/lib/api/hackathons';
import { IDEA_TEMPLATE_RULES, uploadIdeaTemplate } from '@/lib/ideaUpload';
import { linkProblem } from '@/lib/validation/submissionLinks';
import { useToast } from '@/context/ToastContext';
import FileUploadField from '@/components/forms/FileUploadField';
import { IdeaFileActions } from '@/components/hackathons/IdeaFileActions';
import { ActionButton } from '@/components/ui/ActionButton';
import { BTN_PRIMARY, INPUT, LABEL, PANEL } from './shared';
import { useHackathonPatch } from './useHackathonPatch';

interface IdeaTemplatePanelProps {
  hackathon: Hackathon;
  onSaved: (hackathon: Hackathon) => void;
  /** The template the hackathon has now (null = none). */
  template: IdeaTemplateInfo | null;
}

/** The file teams download and follow when writing their idea. It is saved the moment it uploads, not with the settings form. */
export function IdeaTemplatePanel({ hackathon, onSaved, template: initial }: IdeaTemplatePanelProps) {
  const slug = hackathon.slug;
  const { toast } = useToast();
  const { busy: savingLink, errors, save, saved, clearSaved } = useHackathonPatch(hackathon, onSaved);
  const [link, setLink] = useState(hackathon.idea_template_url ?? '');
  const [linkProblemText, setLinkProblemText] = useState('');
  const [template, setTemplate] = useState<IdeaTemplateInfo | null>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => setTemplate(initial), [initial]);

  const upload = useMemo(() => async (file: File, progress: (fraction: number) => void, signal: AbortSignal) => {
    const saved = await uploadIdeaTemplate(slug, file, progress, signal);
    setTemplate({ id: saved.upload_id, name: saved.name, size: saved.size, type: saved.type });
    toast.success('Template saved', 'Teams can download it from their idea form.');
    return saved;
  }, [slug, toast]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await hackathonApi.ideaTemplateRemove(slug);
      setTemplate(null);
      toast.success('Template removed');
    } catch (err) {
      toast.error('Could not remove it', apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [slug, toast]);

  const saveLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = linkProblem(link, 'The template link', 'drive');
    setLinkProblemText(problem);
    if (problem) return;
    await save({ idea_template_url: link.trim() }, link.trim() ? 'Template link saved' : 'Template link removed');
  };

  return (
    <section className={`${PANEL} space-y-3`}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E] dark:text-white"><FileDown className="h-4 w-4 text-journey-accent" /> Idea template</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Upload a file (.ppt, .pptx, .pdf, .doc or .docx, up to {IDEA_TEMPLATE_RULES.maxFileSizeMB} MB) that shows teams what their idea should cover. Any signed-in user can download it. One file only: uploading again replaces it.
      </p>
      {template && (
        <div className="flex flex-wrap items-center gap-3">
          <IdeaFileActions slug={slug} link={(inline) => hackathonApi.ideaTemplateLink(slug, inline)} file={template} />
          <button type="button" onClick={remove} disabled={busy} className="text-xs font-bold text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400">
            Remove the template
          </button>
        </div>
      )}
      <FileUploadField
        inputId="idea-template-file"
        uploadWith={upload}
        multiple={false}
        rules={IDEA_TEMPLATE_RULES}
        defaultMb={IDEA_TEMPLATE_RULES.maxFileSizeMB}
        value={null}
        onChange={() => undefined}
        onBusyChange={() => undefined}
        onProblem={(message) => message && toast.error('Template', message)}
      />

      <form onSubmit={saveLink} className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <label htmlFor="idea-template-url" className={LABEL}>Google Drive link (fallback)</label>
        <div className="flex flex-wrap items-start gap-2">
          <input
            id="idea-template-url" type="url" value={link} maxLength={200} placeholder="https://drive.google.com/file/d/…"
            onChange={(e) => { setLink(e.target.value); setLinkProblemText(''); }}
            aria-invalid={Boolean(linkProblemText || errors.idea_template_url)} className={`${INPUT} min-w-[14rem] flex-1`}
          />
          <ActionButton type="submit" pending={savingLink} success={saved} onSuccessShown={clearSaved} successLabel="Saved" className={BTN_PRIMARY}>Save link</ActionButton>
        </div>
        {(linkProblemText || errors.idea_template_url)
          ? <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">{linkProblemText || errors.idea_template_url}</p>
          : <p className="text-[11px] text-slate-500 dark:text-slate-400">Teams see this link only when no file is uploaded above. Set the file to &quot;Anyone with the link can view&quot; in Drive. Blank = no link.</p>}
      </form>
    </section>
  );
}
