import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchApiBlob = vi.hoisted(() => vi.fn());
const dmc = vi.hoisted(() => ({ export: vi.fn(), getExportJobStatus: vi.fn() }));
const saveBlob = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ fetchApiBlob }));
vi.mock('@/lib/dmc-api', () => ({ dmcApi: dmc }));
vi.mock('@/lib/dataManagement', () => ({ saveBlob }));

import { downloadDatasetRows, downloadServerExport } from '../exportApi';

const blob = new Blob(['x']);

beforeEach(() => {
  vi.useFakeTimers();
  [fetchApiBlob, dmc.export, dmc.getExportJobStatus, saveBlob].forEach((fn) => fn.mockReset());
});
afterEach(() => vi.useRealTimers());

describe('downloadServerExport', () => {
  it('asks for the format, drops empty parameters and saves under the name the server chose', async () => {
    fetchApiBlob.mockResolvedValue({ blob, filename: 'demo-teams-20261027_115200.xlsx' });
    await downloadServerExport('/hackathons/demo/export/teams/', 'xlsx', { ids: '1,2', round: undefined, status: '', page: 0 });
    expect(fetchApiBlob).toHaveBeenCalledWith('/hackathons/demo/export/teams/?ids=1%2C2&page=0&export_format=xlsx');
    expect(saveBlob).toHaveBeenCalledWith(blob, 'demo-teams-20261027_115200.xlsx');
  });

  it('falls back to a file name when the server sends none', async () => {
    fetchApiBlob.mockResolvedValue({ blob, filename: null });
    await downloadServerExport('/x/', 'json');
    expect(saveBlob).toHaveBeenCalledWith(blob, 'export.json');
    await downloadServerExport('/x/', 'csv', {}, 'mine.csv');
    expect(saveBlob).toHaveBeenLastCalledWith(blob, 'mine.csv');
  });

  it('lets a refusal reach the caller and saves nothing', async () => {
    fetchApiBlob.mockRejectedValue(new Error('You are not allowed to download this.'));
    await expect(downloadServerExport('/x/', 'csv')).rejects.toThrow('You are not allowed');
    expect(saveBlob).not.toHaveBeenCalled();
  });
});

describe('downloadDatasetRows', () => {
  it('exports the chosen rows in every permitted column and saves a small export at once', async () => {
    dmc.export.mockResolvedValue({ mode: 'sync', blob, filename: 'users-export-20261027_115200.csv' });
    await downloadDatasetRows('users', ['4', '9'], 'csv');
    expect(dmc.export).toHaveBeenCalledWith('users', expect.objectContaining({
      format: 'csv', row_scope: 'selected', column_scope: 'all_permitted', selected_record_ids: ['4', '9'],
    }));
    expect(saveBlob).toHaveBeenCalledWith(blob, 'users-export-20261027_115200.csv');
  });

  it('waits for a large export to finish, then downloads the finished file', async () => {
    dmc.export.mockResolvedValue({ mode: 'async', jobId: 7 });
    dmc.getExportJobStatus.mockResolvedValueOnce({ status: 'RUNNING', downloadable: false }).mockResolvedValueOnce({ status: 'COMPLETED', downloadable: true });
    fetchApiBlob.mockResolvedValue({ blob, filename: 'users-export-20261027_115200.xlsx' });
    const done = downloadDatasetRows('users', ['1'], 'xlsx');
    await vi.advanceTimersByTimeAsync(2000);
    expect(saveBlob).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    await done;
    expect(fetchApiBlob).toHaveBeenCalledWith('admin/dmc/exports/7/download/');
    expect(saveBlob).toHaveBeenCalledWith(blob, 'users-export-20261027_115200.xlsx');
  });

  it('reports a failed background job with its message', async () => {
    dmc.export.mockResolvedValue({ mode: 'async', jobId: 8 });
    dmc.getExportJobStatus.mockResolvedValue({ status: 'FAILED', downloadable: false, error_message: 'Disk full' });
    const done = downloadDatasetRows('users', ['1'], 'csv');
    const failure = expect(done).rejects.toThrow('Disk full');
    await vi.advanceTimersByTimeAsync(2000);
    await failure;
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('gives up with a clear message if the job never finishes', async () => {
    dmc.export.mockResolvedValue({ mode: 'async', jobId: 9 });
    dmc.getExportJobStatus.mockResolvedValue({ status: 'RUNNING', downloadable: false });
    const done = downloadDatasetRows('users', ['1'], 'csv');
    const failure = expect(done).rejects.toThrow(/taking longer than expected/);
    await vi.advanceTimersByTimeAsync(2000 * 151);
    await failure;
  });

  it('passes a refused export on to the caller', async () => {
    dmc.export.mockRejectedValue(new Error('Export failed: 403'));
    await expect(downloadDatasetRows('users', ['1'], 'csv')).rejects.toThrow('403');
  });
});
