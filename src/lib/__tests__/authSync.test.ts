import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAndSyncCurrentUser, getStoredUser, setStoredUser } from '../auth';

const signedIn = { id: 1, email: 'ada@srkr.ac.in', username: 'ada', first_name: 'Ada', role: 'ADMIN' as const };

beforeEach(() => {
  localStorage.clear();
  setStoredUser(signedIn);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('fetchAndSyncCurrentUser', () => {
  it('keeps the club ID and membership status the server sends, so the signed-in bar can show them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...signedIn, last_name: 'Min', club_id: '26SCC014', membership_status: 'ACTIVE' }) }));
    const user = await fetchAndSyncCurrentUser();
    expect(user).toMatchObject({ club_id: '26SCC014', membership_status: 'ACTIVE', last_name: 'Min' });
    expect(getStoredUser()).toMatchObject({ club_id: '26SCC014', membership_status: 'ACTIVE' });
  });

  it('does not invent a club ID for someone without one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...signedIn }) }));
    const user = await fetchAndSyncCurrentUser();
    expect(user?.club_id).toBeUndefined();
  });
});
