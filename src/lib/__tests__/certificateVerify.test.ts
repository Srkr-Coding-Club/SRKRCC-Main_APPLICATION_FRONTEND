import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchApi = vi.fn();
vi.mock('@/lib/api-client', () => ({ fetchApi: (...a: unknown[]) => fetchApi(...a) }));
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }));

import { lookupCertificate } from '@/lib/certificateVerify';

beforeEach(() => { fetchApi.mockReset(); fetchApi.mockResolvedValue(undefined); });

describe('lookupCertificate', () => {
  it('sends an event code to the events module', async () => {
    fetchApi.mockResolvedValue({ valid: true, kind: 'PARTICIPATION', name: 'Asha Rao', event: 'Web Workshop', date: null });
    const result = await lookupCertificate('ev.abc:def');
    expect(fetchApi).toHaveBeenCalledWith('/events/certificates/verify/ev.abc%3Adef/');
    expect(result).toEqual({ name: 'Asha Rao', subject: 'Web Workshop', type: 'Participation', team: null });
  });

  it('sends any other code to the hackathons module and keeps the award and team', async () => {
    fetchApi.mockResolvedValue({ valid: true, kind: 'WINNER', name: 'Ravi', hackathon: 'HackFest', award: 'Best Project', team: 'Bytes' });
    const result = await lookupCertificate('abc:def');
    expect(fetchApi).toHaveBeenCalledWith('/hackathons/certificates/verify/abc%3Adef/');
    expect(result).toEqual({ name: 'Ravi', subject: 'HackFest', type: 'Award: Best Project', team: 'Bytes' });
  });

  it('returns null when the code is not genuine', async () => {
    fetchApi.mockImplementation(() => Promise.reject(new Error('404')));
    expect(await lookupCertificate('ev.nope')).toBeNull();
  });
});
