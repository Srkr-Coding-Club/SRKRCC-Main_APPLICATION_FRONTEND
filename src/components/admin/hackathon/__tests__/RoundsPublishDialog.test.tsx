import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { round } from './roundJudgingFixtures';

let roundRow: unknown;

const { publishRound, admin } = vi.hoisted(() => {
  const publish = vi.fn().mockResolvedValue({});
  // Every other admin call resolves to an empty answer; only the publish call is checked.
  const api = new Proxy({} as Record<string, unknown>, {
    get: (_t, key: string) => {
      if (key === 'publishRound') return publish;
      if (key === 'rounds') return () => Promise.resolve([roundRow]);
      return () => Promise.resolve([]);
    },
  });
  return { publishRound: publish, admin: api };
});
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { admin, exportFile: vi.fn() },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/lib/api-client', () => ({ fetchApi: () => Promise.resolve([]) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }) }));

import { RoundsAdminTab } from '../RoundsAdminTab';

afterEach(() => cleanup());

describe('Publishing round results', () => {
  roundRow = round({ kind: 'IDEA_REVIEW', evaluation_mode: 'NONE', entry_counts: { total: 3, PENDING: 0, SHORTLISTED: 2, REJECTED: 1, details_submitted: 0 } });
  it('emails the shortlisted teams without emailing the others', async () => {
    render(<RoundsAdminTab slug="demo" features={{} as any} />);
    fireEvent.click(await screen.findByRole('button', { name: /Publish results/ }));
    fireEvent.click(screen.getByLabelText('Also email it to every member of the shortlisted teams'));
    expect((screen.getByLabelText('Also email it to every member of those teams') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(publishRound).toHaveBeenCalledWith('demo', 5, {
      announce: true, message: '', announce_rejected: true, email_shortlisted: true, email_rejected: false,
    }));
  });
});
