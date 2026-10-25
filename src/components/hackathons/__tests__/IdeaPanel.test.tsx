import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  myIdea: vi.fn(),
  saveIdea: vi.fn(),
  ideaFileDiscard: vi.fn(),
  ideaFileLink: vi.fn(),
  ideaQrLink: vi.fn(),
};
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (api as any)[name](...args) }),
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
const uploadIdeaFile = vi.fn();
vi.mock('@/lib/ideaUpload', async () => {
  const real = await vi.importActual<typeof import('@/lib/ideaUpload')>('@/lib/ideaUpload');
  return { ...real, uploadIdeaFile: (...args: unknown[]) => uploadIdeaFile(...args) };
});

import { IdeaPanel } from '../IdeaPanel';

const hackathon = { slug: 'demo' } as any;
const config = (over: Record<string, unknown> = {}) => ({ fee_amount: 0, payment_note: '', deck_required: false, linkedin_required: false, files_available: true, payment_qr: null, edits_enabled: true, edits_until: null, ...over });
const payload = (over: Record<string, unknown> = {}) => ({
  state: 'OPEN', opens_at: null, deadline: null, review_required: true, project_requires_idea: false, idea: null, can_edit: true, edit_blocked_reason: '', config: config(), ...over,
});
const idea = (over: Record<string, unknown> = {}) => ({
  id: 9, team_id: 1, team_name: 'Team', title: 'Smart bins', problem: 'Waste', solution: 'Sensors', plan: '', tech_stack: [], deck_url: null, linkedin_url: null, deck_file: null,
  payment_proof: null, transaction_id: '', status: 'SUBMITTED', feedback: '', reviewed_at: null, score: 0, review_count: 0, created_at: '', updated_at: '', ...over,
});

const png = (name = 'pay.png') => {
  const f = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(f, 'size', { value: 1000 });
  return f;
};
const pick = (inputIndex: number, file: File) => fireEvent.change(document.querySelectorAll('input[type=file]')[inputIndex], { target: { files: [file] } });

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  uploadIdeaFile.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => cleanup());

const show = async (data: unknown) => {
  api.myIdea.mockResolvedValue(data);
  render(<IdeaPanel hackathon={hackathon} />);
  await screen.findByLabelText(/Idea title/);
};

describe('IdeaPanel: what the form asks for', () => {
  it('asks only for the basics when the organizers ask for nothing more', async () => {
    await show(payload());
    expect(screen.queryByText(/Payment:/)).toBeNull();
    expect(document.querySelector('#idea-payment-file')).toBeNull();
    expect(screen.getByLabelText(/LinkedIn post link/)).toBeTruthy();
    expect(screen.getByText(/Presentation \(\.ppt or \.pptx\)/)).toBeTruthy();
    expect(document.querySelector('label[for=idea-linkedin] .text-rose-500, label[for=idea-linkedin] [aria-hidden]')).toBeNull();
  });

  it('shows the fee, the way to pay, the screenshot picker and the optional transaction id', async () => {
    await show(payload({ config: config({ fee_amount: 200, payment_note: 'UPI: club@upi' }) }));
    expect(screen.getByText('Payment: ₹200')).toBeTruthy();
    expect(screen.getByText('UPI: club@upi')).toBeTruthy();
    expect(document.querySelector('#idea-payment-file')).toBeTruthy();
    expect(screen.getByLabelText(/Transaction ID/)).toBeTruthy();
    expect(screen.getByText('Only the organizers can see this screenshot.')).toBeTruthy();
  });

  it('warns and blocks submitting when files are needed but uploads are off', async () => {
    await show(payload({ config: config({ fee_amount: 200, files_available: false }) }));
    expect(screen.getByRole('alert').textContent).toContain('File uploads are not available right now');
    expect((screen.getByRole('button', { name: 'Submit idea' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('IdeaPanel: the payment QR code', () => {
  it('shows the QR the organizers uploaded, with what to do with it', async () => {
    api.ideaQrLink.mockResolvedValue({ url: 'https://bucket/qr.png?sig=1', expires_in: 60, inline: true });
    await show(payload({ config: config({ fee_amount: 200, payment_qr: { id: 'q1', name: 'qr.png' } }) }));
    const image = await screen.findByAltText('Payment QR code');
    expect(image.getAttribute('src')).toBe('https://bucket/qr.png?sig=1');
    expect(screen.getByText(/Scan this QR code with any UPI app and pay ₹200/)).toBeTruthy();
    expect(api.ideaQrLink).toHaveBeenCalledWith('demo');
  });

  it('shows no QR area when the organizers did not upload one, and asks for no link', async () => {
    await show(payload({ config: config({ fee_amount: 200 }) }));
    expect(screen.queryByAltText('Payment QR code')).toBeNull();
    expect(api.ideaQrLink).not.toHaveBeenCalled();
  });

  it('says so when the code cannot be loaded, and Try again fetches a fresh link', async () => {
    api.ideaQrLink.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce({ url: 'https://bucket/qr2.png', expires_in: 60, inline: true });
    await show(payload({ config: config({ fee_amount: 200, payment_qr: { id: 'q1', name: 'qr.png' } }) }));
    expect(await screen.findByText('The QR code could not be loaded.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect((await screen.findByAltText('Payment QR code')).getAttribute('src')).toBe('https://bucket/qr2.png');
  });

  it('asks again when a different QR code is uploaded', async () => {
    api.ideaQrLink.mockResolvedValue({ url: 'https://bucket/a.png', expires_in: 60, inline: true });
    api.myIdea.mockResolvedValue(payload({ config: config({ fee_amount: 200, payment_qr: { id: 'q1', name: 'qr.png' } }) }));
    const { PaymentQr } = await import('../PaymentQr');
    const { rerender } = render(<PaymentQr slug="demo" version="q1" />);
    await screen.findByAltText('Payment QR code');
    rerender(<PaymentQr slug="demo" version="q2" />);
    await waitFor(() => expect(api.ideaQrLink).toHaveBeenCalledTimes(2));
  });
});

describe('IdeaPanel: saving', () => {
  it('sends the uploaded files by id, with the link and transaction id', async () => {
    uploadIdeaFile.mockResolvedValue({ upload_id: 'pay-1', name: 'pay.png', size: 1000, type: 'image/png' });
    api.saveIdea.mockResolvedValue(payload({ idea: idea() }));
    await show(payload({ config: config({ fee_amount: 200 }) }));
    fireEvent.change(screen.getByLabelText(/Idea title/), { target: { value: 'Smart bins' } });
    fireEvent.change(screen.getByLabelText(/LinkedIn post link/), { target: { value: 'https://www.linkedin.com/posts/x' } });
    fireEvent.change(screen.getByLabelText(/Transaction ID/), { target: { value: 'UPI123' } });
    pick(1, png());
    await screen.findByText(/uploaded/, {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Submit idea' }));
    await waitFor(() => expect(api.saveIdea).toHaveBeenCalled(), { timeout: 5000 });
    expect(api.saveIdea.mock.calls[0][1]).toMatchObject({
      title: 'Smart bins', linkedin_url: 'https://www.linkedin.com/posts/x', transaction_id: 'UPI123', payment_file_id: 'pay-1', deck_file_id: null,
    });
  });

  it('cannot be submitted while a file is still uploading', async () => {
    let finish!: (v: unknown) => void;
    uploadIdeaFile.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await show(payload({ config: config({ fee_amount: 200 }) }));
    pick(1, png());
    await screen.findByRole('progressbar');
    const button = screen.getByRole('button', { name: 'Uploading…' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await act(async () => finish({ upload_id: 'p', name: 'pay.png', size: 1, type: 'image/png' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Submit idea' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('shows the server\'s message next to the field it is about', async () => {
    api.saveIdea.mockRejectedValue(Object.assign(new Error('Upload the screenshot of your payment of ₹200.'), { body: { field: 'payment_file_id' } }));
    api.myIdea.mockResolvedValue(payload({ config: config({ fee_amount: 200 }) }));
    render(<IdeaPanel hackathon={hackathon} />);
    await screen.findByLabelText(/Idea title/);
    fireEvent.click(screen.getByRole('button', { name: 'Submit idea' }));
    expect((await screen.findByText(/Upload the screenshot of your payment/)).closest('fieldset')).toBeTruthy();
  });

  it('shows a saved file already attached when the idea is edited, without uploading again', async () => {
    api.saveIdea.mockResolvedValue(payload({ idea: idea() }));
    api.myIdea.mockResolvedValue(payload({ idea: idea({ payment_proof: { id: 'pay-9', name: 'old.png', size: 2048, type: 'image/png', state: 'ATTACHED' } }), config: config({ fee_amount: 200 }) }));
    render(<IdeaPanel hackathon={hackathon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit submission' }));
    expect(await screen.findByText('old.png')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.saveIdea).toHaveBeenCalled());
    expect(api.saveIdea.mock.calls[0][1]).toMatchObject({ payment_file_id: 'pay-9' });
    expect(uploadIdeaFile).not.toHaveBeenCalled();
  });
});

describe('IdeaPanel: the submission card', () => {
  const submitted = (over: Record<string, unknown> = {}) => payload({
    idea: idea({ linkedin_url: 'https://www.linkedin.com/posts/x', transaction_id: 'UPI9', created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-20T10:00:00Z', tech_stack: ['React'], deck_file: { id: 'd', name: 'deck.pptx', size: 5000, type: 'application/x', state: 'ATTACHED' }, payment_proof: { id: 'p', name: 'pay.png', size: 900, type: 'image/png', state: 'ATTACHED' } }),
    ...over,
  });

  it('shows the submission as a card, not the form, once an idea exists', async () => {
    api.myIdea.mockResolvedValue(submitted());
    render(<IdeaPanel hackathon={hackathon} />);
    const card = await screen.findByRole('article', { name: 'Your submission' });
    expect(card.textContent).toContain('Smart bins');
    expect(card.textContent).toContain('deck.pptx');
    expect(card.textContent).toContain('Transaction ID: UPI9');
    expect(card.textContent).toContain('Tech: React');
    expect(screen.queryByLabelText(/Idea title/)).toBeNull();
  });

  it('offers Edit when editing is allowed; it opens the form, and Cancel brings the card back', async () => {
    api.myIdea.mockResolvedValue(submitted());
    render(<IdeaPanel hackathon={hackathon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit submission' }));
    const title = await screen.findByLabelText(/Idea title/);
    fireEvent.change(title, { target: { value: 'Changed my mind' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('article', { name: 'Your submission' })).toBeTruthy();
    expect(screen.queryByLabelText(/Idea title/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit submission' }));
    expect((await screen.findByLabelText(/Idea title/) as HTMLInputElement).value).toBe('Smart bins');   // the abandoned change is gone
  });

  it('goes back to the card after saving', async () => {
    api.myIdea.mockResolvedValue(submitted());
    api.saveIdea.mockResolvedValue(submitted({ idea: idea({ title: 'Smarter bins' }) }));
    render(<IdeaPanel hackathon={hackathon} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit submission' }));
    await screen.findByLabelText(/Idea title/);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('article', { name: 'Your submission' })).textContent).toContain('Smarter bins');
  });

  it('with editing switched off there is no Edit button, only the card and the reason', async () => {
    api.myIdea.mockResolvedValue(submitted({ can_edit: false, edit_blocked_reason: 'The organizers have switched off editing, so a submitted idea cannot be changed.' }));
    render(<IdeaPanel hackathon={hackathon} />);
    await screen.findByRole('article', { name: 'Your submission' });
    expect(screen.queryByRole('button', { name: 'Edit submission' })).toBeNull();
    expect(screen.getByText(/switched off editing/)).toBeTruthy();
  });

  it('every team member sees the card; a member who cannot edit is told who can', async () => {
    api.myIdea.mockResolvedValue(submitted({ can_edit: false, edit_blocked_reason: '' }));
    render(<IdeaPanel hackathon={hackathon} />);
    await screen.findByRole('article', { name: 'Your submission' });
    expect(screen.queryByRole('button', { name: 'Edit submission' })).toBeNull();
    expect(screen.getByText('Only your team leader can change the submission.')).toBeTruthy();
  });

  it('shows the form straight away when nothing has been submitted', async () => {
    await show(payload());
    expect(screen.queryByRole('article', { name: 'Your submission' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });
});

describe('IdeaPanel: editing control', () => {
  it('tells the team why it cannot edit and shows the saved idea with its files', async () => {
    api.myIdea.mockResolvedValue(payload({
      can_edit: false, edit_blocked_reason: 'The organizers have switched off editing, so a submitted idea cannot be changed.',
      idea: idea({ linkedin_url: 'https://www.linkedin.com/posts/x', transaction_id: 'UPI9', deck_file: { id: 'd', name: 'deck.pptx', size: 5000, type: 'application/x', state: 'ATTACHED' }, payment_proof: { id: 'p', name: 'pay.png', size: 900, type: 'image/png', state: 'ATTACHED' } }),
    }));
    render(<IdeaPanel hackathon={hackathon} />);
    expect(await screen.findByText(/switched off editing/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save changes|Submit idea/ })).toBeNull();
    expect(screen.getByText('deck.pptx')).toBeTruthy();
    expect(screen.getByText('pay.png')).toBeTruthy();
    expect(screen.getByText('Transaction ID: UPI9')).toBeTruthy();
    expect((screen.getByText('https://www.linkedin.com/posts/x') as HTMLAnchorElement).getAttribute('rel')).toContain('noopener');
  });

  it('opens a saved image through a fresh link, and an expired or refused link shows a message', async () => {
    api.ideaFileLink.mockResolvedValueOnce({ url: 'https://bucket/x', expires_in: 60, inline: true }).mockRejectedValueOnce(new Error('Not found'));
    api.myIdea.mockResolvedValue(payload({ can_edit: false, idea: idea({ payment_proof: { id: 'p', name: 'pay.png', size: 900, type: 'image/png', state: 'ATTACHED' } }) }));
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<IdeaPanel hackathon={hackathon} />);
    fireEvent.click(await screen.findByRole('button', { name: /pay\.png/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://bucket/x', '_blank', 'noopener,noreferrer'));
    expect(api.ideaFileLink).toHaveBeenCalledWith('demo', 9, 'payment', true);
    fireEvent.click(screen.getByRole('button', { name: /pay\.png/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Not found');
    open.mockRestore();
  });

  it('says until when editing is open', async () => {
    api.myIdea.mockResolvedValue(payload({ idea: idea(), config: config({ edits_until: '2026-12-01T10:00:00Z' }) }));
    render(<IdeaPanel hackathon={hackathon} />);
    expect(await screen.findByText(/You can edit your idea until/)).toBeTruthy();
  });

  it('has no accessibility violations with payment shown', async () => {
    await show(payload({ config: config({ fee_amount: 200, payment_note: 'UPI: club@upi', deck_required: true, linkedin_required: true }) }));
    const { violations } = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});
