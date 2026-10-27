import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const exportFile = vi.hoisted(() => vi.fn());
const analytics = vi.hoisted(() => vi.fn());
const downloadServerExport = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/hackathons', () => ({
  hackathonApi: { exportFile: (...a: unknown[]) => exportFile(...a), admin: { analytics: (...a: unknown[]) => analytics(...a) } },
  apiErrorMessage: (err: any, fallback = 'Something went wrong') => err?.message || fallback,
}));
vi.mock('@/lib/exportApi', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/exportApi')>()), downloadServerExport: (...a: unknown[]) => downloadServerExport(...a) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

import { AnalyticsPanel } from '../hackathon/AnalyticsPanel';
import { AttendanceReportTab } from '../AttendanceReportTab';

const report = {
  sessions: [{ id: 1, day_index: 0, session_label: 'MORNING', date: '2026-11-01', attended_count: 1, total_registrants: 2, percentage: 50 }],
  registrants: [{ response_id: 5, display_name: 'Asha Rao', sessions: { 1: true } }],
} as any;

beforeEach(() => {
  [exportFile, analytics, downloadServerExport].forEach((fn) => fn.mockReset());
  exportFile.mockResolvedValue(undefined);
  downloadServerExport.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

const pick = (menuName: string, item: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: menuName }));
  fireEvent.click(screen.getByRole('menuitem', { name: item }));
};

describe('hackathon participants export', () => {
  it('asks the server for the participants file in the chosen format', async () => {
    analytics.mockResolvedValue({ funnel: [], by_branch: [], by_year: [], by_college: [], joined_per_day: [], checked_in: 0, waitlisted_teams: 0, capacity: { max_teams: null, max_participants: null, placed_teams: 0, placed_participants: 0 } });
    render(<AnalyticsPanel slug="demo" />);
    await screen.findByRole('button', { name: 'Export participants' });
    pick('Export participants', /Excel/);
    await waitFor(() => expect(exportFile).toHaveBeenCalledWith('demo', 'participants', 'xlsx'));
  });
});

describe('attendance report export', () => {
  it('downloads the server-rendered attendance grid for the selected form', async () => {
    render(<AttendanceReportTab formId={42} report={report} loading={false} formTitle="Workshop" />);
    pick('Export attendance', /CSV/);
    await waitFor(() => expect(downloadServerExport).toHaveBeenCalledWith('forms/42/attendance/report/export/', 'csv'));
  });

  it('cannot export without registrants or without a form', () => {
    const { rerender } = render(<AttendanceReportTab formId={42} report={{ ...report, registrants: [] }} loading={false} />);
    expect((screen.getByRole('button', { name: 'Export attendance' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<AttendanceReportTab formId={null} report={report} loading={false} />);
    expect((screen.getByRole('button', { name: 'Export attendance' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
