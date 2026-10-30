import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ideaFileLink = vi.fn();
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { ideaFileLink: (...a: unknown[]) => ideaFileLink(...a) },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('../FilePreviewDialog', () => ({ FilePreviewDialog: () => <div>preview</div> }));

import { IdeaFileActions } from '../IdeaFileActions';

const file = { name: 'pay.png', size: 2048, type: 'image/png' };
const assign = vi.fn();

beforeEach(() => {
  ideaFileLink.mockReset().mockResolvedValue({ url: 'https://files/idea' });
  assign.mockReset();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
});
afterEach(() => cleanup());

describe('IdeaFileActions', () => {
  it('downloads an idea file through the idea link', async () => {
    render(<IdeaFileActions slug="demo" ideaId={4} kind="payment" file={file} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download pay.png' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://files/idea'));
    expect(ideaFileLink).toHaveBeenCalledWith('demo', 4, 'payment', false);
  });

  it('uses the given link for a file that is not an idea file, such as a registration payment', async () => {
    const link = vi.fn().mockResolvedValue({ url: 'https://files/payment' });
    render(<IdeaFileActions slug="demo" link={link} file={file} label="Screenshot" />);
    expect(screen.getByText('Screenshot')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download pay.png' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://files/payment'));
    expect(link).toHaveBeenCalledWith(false);
    expect(ideaFileLink).not.toHaveBeenCalled();
  });

  it('shows the error when the link cannot be made', async () => {
    const link = vi.fn().mockRejectedValue(new Error('This file is still being checked for viruses.'));
    render(<IdeaFileActions slug="demo" link={link} file={file} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download pay.png' }));
    expect(await screen.findByText('This file is still being checked for viruses.')).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it('offers a preview for an image', () => {
    render(<IdeaFileActions slug="demo" link={vi.fn()} file={file} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview pay.png' }));
    expect(screen.getByText('preview')).toBeTruthy();
  });
});
