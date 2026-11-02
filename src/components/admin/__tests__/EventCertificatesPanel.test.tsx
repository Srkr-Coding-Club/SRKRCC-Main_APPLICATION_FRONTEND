import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.fn();
const saveSettings = vi.fn();
vi.mock('@/lib/api/events', () => ({ eventCertificateApi: { settings: (...a: unknown[]) => settings(...a), saveSettings: (...a: unknown[]) => saveSettings(...a) } }));
vi.mock('@/lib/api/hackathons', () => ({ apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { EventCertificatesPanel } from '../EventCertificatesPanel';

const preview = { kind: 'PARTICIPATION', title: 'Certificate of Participation', body: 'Admin attended Web Workshop.', name: 'Admin', event: 'Web Workshop', organizer: 'SRKR Coding Club', date: null, signatory_name: '', signatory_title: '', code: 'PREVIEW' };
const loaded = (over: Record<string, unknown> = {}) => ({ certificates_released: false, certificate_body: '', certificate_signatory_name: '', certificate_signatory_title: '', eligible_count: 3, preview, ...over });
const event = { slug: 'web-workshop', title: 'Web Workshop' };

beforeEach(() => { settings.mockReset(); saveSettings.mockReset(); settings.mockResolvedValue(loaded()); toast.success.mockReset(); });
afterEach(cleanup);

describe('EventCertificatesPanel', () => {
  it('shows how many people will be able to open a certificate and a preview', async () => {
    render(<EventCertificatesPanel event={event} onClose={() => {}} />);
    expect(await screen.findByText(/3 people were checked in/)).toBeTruthy();
    expect(screen.getByText('Admin attended Web Workshop.')).toBeTruthy();
  });

  it('saves the release switch and wording together', async () => {
    saveSettings.mockResolvedValue(loaded({ certificates_released: true, certificate_body: '{name} completed {event}.' }));
    render(<EventCertificatesPanel event={event} onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('switch', { name: /Release certificates/ }));
    fireEvent.change(screen.getByLabelText('Wording'), { target: { value: '{name} completed {event}.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveSettings).toHaveBeenCalledWith('web-workshop', {
      certificates_released: true, certificate_body: '{name} completed {event}.', certificate_signatory_name: '', certificate_signatory_title: '',
    }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Certificate settings saved', 'Attendees can now open their certificates.'));
  });

  it('shows the field message when the wording is rejected', async () => {
    saveSettings.mockRejectedValue({ body: { certificate_body: ['Unknown placeholder(s): team.'] } });
    render(<EventCertificatesPanel event={event} onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Unknown placeholder(s): team.');
  });

  it('loads nothing while closed', () => {
    render(<EventCertificatesPanel event={null} onClose={() => {}} />);
    expect(settings).not.toHaveBeenCalled();
  });
});
