import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SubmissionConfirmModal } from '../SubmissionConfirmModal';

describe('SubmissionConfirmModal', () => {
  afterEach(cleanup);

  it('does not render when isOpen is false', () => {
    render(
      <SubmissionConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        content="Rules"
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders modal with title and content when open', () => {
    render(
      <SubmissionConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Custom Title"
        content="Please obey all rules."
        confirmLabel="Yes, Continue"
        cancelLabel="No, Cancel"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Custom Title')).toBeTruthy();
    expect(screen.getByText(/Please obey all rules/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yes, Continue' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No, Cancel' })).toBeTruthy();
  });

  it('calls onClose when cancel or close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <SubmissionConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        content="Some content"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'No, Go Back' }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <SubmissionConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        content="Some content"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, I Agree & Submit' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isSubmitting is true', () => {
    render(
      <SubmissionConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        content="Some content"
        isSubmitting={true}
      />,
    );
    const submitBtn = screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement;
    const cancelBtn = screen.getByRole('button', { name: 'No, Go Back' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });
});
