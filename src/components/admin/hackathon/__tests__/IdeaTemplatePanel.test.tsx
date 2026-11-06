import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = { ideaTemplateRemove: vi.fn(), ideaTemplateLink: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }),
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
const uploadIdeaTemplate = vi.fn();
vi.mock('@/lib/ideaUpload', () => ({
  IDEA_TEMPLATE_RULES: { allowedFileTypes: '.pptx', maxFileSizeMB: 25, label: 'template' },
  uploadIdeaTemplate: (...args: unknown[]) => uploadIdeaTemplate(...args),
}));
let uploadWith: ((file: File, progress: (f: number) => void, signal: AbortSignal) => Promise<unknown>) | undefined;
vi.mock('@/components/forms/FileUploadField', () => ({
  default: (props: any) => { uploadWith = props.uploadWith; return <div>file field</div>; },
}));
vi.mock('@/components/hackathons/IdeaFileActions', () => ({ IdeaFileActions: ({ file }: any) => <div>saved: {file.name}</div> }));

const save = vi.fn();
vi.mock('../useHackathonPatch', () => ({
  useHackathonPatch: () => ({ busy: false, errors: {}, save: (...args: unknown[]) => save(...args), saved: false, clearSaved: () => undefined }),
}));

import { IdeaTemplatePanel } from '../IdeaTemplatePanel';

const hackathon = { slug: 'demo', idea_template_url: '' } as any;
const show = (template: any = null, over: Record<string, unknown> = {}) =>
  render(<IdeaTemplatePanel hackathon={{ ...hackathon, ...over }} onSaved={vi.fn()} template={template} />);

const template = { id: 't1', name: 'idea-template.pptx', size: 1000, type: 'application/vnd.ms-powerpoint' };

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
  uploadIdeaTemplate.mockReset();
  uploadWith = undefined;
  save.mockReset();
  save.mockResolvedValue(true);
});
afterEach(() => cleanup());

describe('IdeaTemplatePanel', () => {
  it('offers only the uploader while there is no template', () => {
    show();
    expect(screen.getByText('file field')).toBeTruthy();
    expect(screen.queryByText(/Remove the template/)).toBeNull();
  });

  it('shows the current template with a remove button', () => {
    show(template);
    expect(screen.getByText('saved: idea-template.pptx')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove the template' })).toBeTruthy();
  });

  it('removes the template and tells the organizer', async () => {
    api.ideaTemplateRemove.mockResolvedValue(null);
    show(template);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the template' }));
    await waitFor(() => expect(screen.queryByText('saved: idea-template.pptx')).toBeNull());
    expect(api.ideaTemplateRemove).toHaveBeenCalledWith('demo');
    expect(toast.success).toHaveBeenCalledWith('Template removed');
  });

  it('keeps the template and shows the reason when removing fails', async () => {
    api.ideaTemplateRemove.mockRejectedValue(new Error('Not allowed'));
    show(template);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the template' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not remove it', 'Not allowed'));
    expect(screen.getByText('saved: idea-template.pptx')).toBeTruthy();
  });

  it('shows the new file as the template as soon as an upload is saved', async () => {
    uploadIdeaTemplate.mockResolvedValue({ upload_id: 't2', name: 'new.pdf', size: 5, type: 'application/pdf' });
    show();
    await act(async () => { await uploadWith!(new File(['x'], 'new.pdf'), () => undefined, new AbortController().signal); });
    expect(uploadIdeaTemplate).toHaveBeenCalledWith('demo', expect.any(File), expect.any(Function), expect.anything());
    expect(screen.getByText('saved: new.pdf')).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith('Template saved', expect.any(String));
  });

  it('saves a Google Drive link as the fallback', async () => {
    show();
    fireEvent.change(screen.getByLabelText(/Google Drive link/), { target: { value: 'https://drive.google.com/file/d/abc/view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ idea_template_url: 'https://drive.google.com/file/d/abc/view' }, 'Template link saved'));
  });

  it('refuses a link that is not on Google Drive or Docs, without asking the server', () => {
    show();
    fireEvent.change(screen.getByLabelText(/Google Drive link/), { target: { value: 'https://example.com/template.pptx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(screen.getByRole('alert').textContent).toContain('Google Drive or Google Docs');
    expect(save).not.toHaveBeenCalled();
  });

  it('clears the link when the field is emptied and saved', async () => {
    show(null, { idea_template_url: 'https://docs.google.com/document/d/abc' });
    fireEvent.change(screen.getByLabelText(/Google Drive link/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ idea_template_url: '' }, 'Template link removed'));
  });
});
