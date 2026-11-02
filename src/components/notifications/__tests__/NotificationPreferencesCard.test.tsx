import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const preferences = vi.fn();
const setEventReminderEmails = vi.fn();
vi.mock('@/lib/api/notifications', () => ({
  notificationsApi: { preferences: (...a: unknown[]) => preferences(...a), setEventReminderEmails: (...a: unknown[]) => setEventReminderEmails(...a) },
}));
vi.mock('@/lib/api/hackathons', () => ({ apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { NotificationPreferencesCard } from '../NotificationPreferencesCard';

beforeEach(() => {
  preferences.mockReset(); setEventReminderEmails.mockReset(); toast.success.mockReset(); toast.error.mockReset();
  preferences.mockResolvedValue({ event_reminder_emails: true });
});
afterEach(cleanup);

describe('NotificationPreferencesCard', () => {
  it('shows the current choice and saves a change', async () => {
    setEventReminderEmails.mockResolvedValue({ event_reminder_emails: false });
    render(<NotificationPreferencesCard />);
    const toggle = await screen.findByRole('switch', { name: /Email me before events/ });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(setEventReminderEmails).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.getByRole('switch', { name: /Email me before events/ }).getAttribute('aria-checked')).toBe('false'));
    expect(toast.success).toHaveBeenCalledWith('Event reminder emails are off');
  });

  it('keeps the old choice and says so when saving fails', async () => {
    setEventReminderEmails.mockImplementation(() => Promise.reject(new Error('Network down')));
    render(<NotificationPreferencesCard />);
    fireEvent.click(await screen.findByRole('switch', { name: /Email me before events/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not change that', 'Network down'));
    expect(screen.getByRole('switch', { name: /Email me before events/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('shows nothing when the choice cannot be loaded', async () => {
    preferences.mockImplementation(() => Promise.reject(new Error('401')));
    const { container } = render(<NotificationPreferencesCard />);
    await waitFor(() => expect(preferences).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
