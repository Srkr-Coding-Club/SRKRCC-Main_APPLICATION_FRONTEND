import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { CertificateActions, linkedInCertificateUrl } from '../CertificateActions';

const props = { subject: 'Web Workshop', code: 'ev.abc:def', organizer: 'SRKR Coding Club', date: '2026-10-05T10:00:00Z' };

beforeEach(() => { toast.error.mockReset(); });
afterEach(cleanup);

describe('linkedInCertificateUrl', () => {
  it('fills the Add to Profile form with the certificate and its verification link', () => {
    const url = new URL(linkedInCertificateUrl(props, 'https://club.test/certificates/verify/ev.abc%3Adef'));
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/profile/add');
    expect(url.searchParams.get('name')).toBe('Web Workshop participation');
    expect(url.searchParams.get('organizationName')).toBe('SRKR Coding Club');
    expect(url.searchParams.get('certUrl')).toBe('https://club.test/certificates/verify/ev.abc%3Adef');
    expect(url.searchParams.get('certId')).toBe('ev.abc:def');
    expect(url.searchParams.get('issueYear')).toBe('2026');
    expect(url.searchParams.get('issueMonth')).toBe('10');
  });
});

describe('CertificateActions', () => {
  it('prints, links to LinkedIn safely and shows the public verification link', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<CertificateActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Print or save as PDF/ }));
    expect(print).toHaveBeenCalled();
    const linkedin = screen.getByRole('link', { name: /Add to LinkedIn/ });
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer');
    expect(linkedin.getAttribute('target')).toBe('_blank');
    expect(screen.getByText(/certificates\/verify\/ev\.abc%3Adef/)).toBeTruthy();
  });

  it('copies the verification link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CertificateActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy verification link/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Link copied/ })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/certificates/verify/ev.abc%3Adef'));
  });

  it('tells the person when the browser blocks copying', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<CertificateActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy verification link/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
