import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ settings: vi.fn(), setEnabled: vi.fn(), pending: vi.fn(), seen: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/api/celebrations', () => ({ celebrationsApi: api }));
vi.mock('@/lib/api/hackathons', () => ({ apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { CelebrationSettingsCard } from '../CelebrationSettingsCard';

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  api.settings.mockResolvedValue({ enabled: true });
});
afterEach(() => cleanup());

describe('CelebrationSettingsCard', () => {
  it('shows the current choice', async () => {
    render(<CelebrationSettingsCard />);
    const toggle = await screen.findByRole('switch', { name: 'Celebrate my milestones' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('shows nothing when the choice cannot be read', async () => {
    api.settings.mockRejectedValue(new Error('offline'));
    const { container } = render(<CelebrationSettingsCard />);
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('saves turning them off on the account', async () => {
    api.setEnabled.mockResolvedValue({ enabled: false });
    render(<CelebrationSettingsCard />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Celebrate my milestones' }));
    await waitFor(() => expect(api.setEnabled).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Celebrate my milestones' }).getAttribute('aria-checked')).toBe('false'));
    expect(toast.success).toHaveBeenCalledWith('Celebrations are off');
  });

  it('keeps the old choice and says so when saving fails', async () => {
    api.setEnabled.mockRejectedValue(new Error('Server error'));
    render(<CelebrationSettingsCard />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Celebrate my milestones' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not change that', 'Server error'));
    expect(screen.getByRole('switch', { name: 'Celebrate my milestones' }).getAttribute('aria-checked')).toBe('true');
  });

  it('looks for waiting celebrations right after they are turned back on', async () => {
    api.settings.mockResolvedValue({ enabled: false });
    api.setEnabled.mockResolvedValue({ enabled: true });
    const check = vi.fn();
    window.addEventListener('celebrations:check', check);
    render(<CelebrationSettingsCard />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Celebrate my milestones' }));
    await waitFor(() => expect(check).toHaveBeenCalled());
    window.removeEventListener('celebrations:check', check);
  });
});
