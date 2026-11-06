import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildAttendanceSheet, printAttendanceSheet } from '../attendanceSheet';

const data = (name = 'Asha Rao') => ({
  session: { id: 1, name: 'Lunch' },
  totals: { teams: 1, present: 0, partial: 1, absent: 0, people: 2, people_in: 1 },
  teams: [{
    team_id: 1, name: 'Alpha', state: 'partial', present: 1, total: 2, first_at: null, last_at: null, leader_name: name, leader_email: '', leader_phone: '',
    members: [
      { user_id: 1, name, email: 'a@x.io', phone: '999', role: 'LEADER', checked_in: true, checked_in_at: '2026-11-05T07:30:00Z', checked_in_by: null, via: null, override_reason: '' },
      { user_id: 2, name: 'Ben Roy', email: 'b@x.io', phone: '', role: 'MEMBER', checked_in: false, checked_in_at: null, checked_in_by: null, via: null, override_reason: '' },
    ],
  }],
}) as any;

afterEach(() => vi.restoreAllMocks());

describe('buildAttendanceSheet', () => {
  it('lists every team with its people and who is present', () => {
    const doc = document.implementation.createHTMLDocument('');
    buildAttendanceSheet(doc, data(), 'Demo Hack');
    expect(doc.title).toBe('Demo Hack: Lunch');
    expect(doc.querySelector('h1')?.textContent).toBe('Demo Hack: Lunch');
    expect(doc.body.textContent).toContain('1 of 2 people in');
    expect(doc.querySelector('tr.team')?.textContent).toBe('Alpha: 1 of 2 in');
    const boxes = [...doc.querySelectorAll('td.box')].map((cell) => cell.textContent);
    expect(boxes[0]).toMatch(/^☑ /);
    expect(boxes[1]).toBe('☐');
  });

  it('treats a name as text, never as markup', () => {
    const doc = document.implementation.createHTMLDocument('');
    buildAttendanceSheet(doc, data('<img src=x onerror=alert(1)>'), 'Demo');
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('printAttendanceSheet', () => {
  it('opens a window, fills it and prints', () => {
    const popup = { document: document.implementation.createHTMLDocument(''), focus: vi.fn(), print: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    expect(printAttendanceSheet(data(), 'Demo')).toBe(true);
    expect(popup.print).toHaveBeenCalled();
    expect(popup.document.querySelector('table')).not.toBeNull();
  });

  it('says so when the browser blocks the window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(printAttendanceSheet(data(), 'Demo')).toBe(false);
  });
});
