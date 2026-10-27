import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));

import { ExportMenu } from '../ExportMenu';

const setup = (props: Record<string, unknown> = {}) => {
  const onExport = vi.fn().mockResolvedValue(undefined);
  const utils = render(<ExportMenu subject="teams" onExport={onExport} {...props} />);
  return { onExport, trigger: screen.getByRole('button', { name: 'Export teams' }), ...utils };
};

beforeEach(() => { toast.success.mockReset(); toast.error.mockReset(); });
afterEach(() => cleanup());

describe('ExportMenu', () => {
  it('offers CSV, Excel and JSON and exports in the one chosen', async () => {
    const { onExport, trigger } = setup();
    fireEvent.click(trigger);
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['CSV (.csv)', 'Excel (.xlsx)', 'JSON (.json)']);
    fireEvent.click(screen.getByRole('menuitem', { name: /JSON/ }));
    await waitFor(() => expect(onExport).toHaveBeenCalledWith('json'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows Preparing and blocks a second export while one runs', async () => {
    let finish: () => void = () => undefined;
    const { onExport, trigger } = setup({ onExport: vi.fn(() => new Promise<void>((resolve) => { finish = resolve; })) });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /CSV/ }));
    await screen.findByText('Preparing…');
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    finish();
    await waitFor(() => expect(screen.queryByText('Preparing…')).toBeNull());
    expect(onExport).toBeDefined();
  });

  it('reports a failed export in a toast and becomes usable again', async () => {
    const { trigger } = setup({ onExport: vi.fn().mockRejectedValue(new Error('You are not allowed to download this.')) });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not export', 'You are not allowed to download this.'));
    expect((trigger as HTMLButtonElement).disabled).toBe(false);
  });

  it('uses a generic message when the failure carries none', async () => {
    const { trigger } = setup({ onExport: vi.fn().mockRejectedValue('boom') });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /CSV/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not export', 'Please try again.'));
  });

  it('is disabled when there is nothing to export', () => {
    const { trigger } = setup({ disabled: true });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens with ArrowDown on the first item, moves with the arrows and closes with Escape without reaching a dialog', () => {
    const escapes = vi.fn();
    const outer = (event: KeyboardEvent) => { if (event.key === 'Escape') escapes(); };
    const { trigger } = setup();
    document.addEventListener('keydown', outer);
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    return new Promise<void>((resolve) => requestAnimationFrame(() => {
      expect(document.activeElement?.textContent).toBe('CSV (.csv)');
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
      expect(document.activeElement?.textContent).toBe('Excel (.xlsx)');
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
      fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
      expect(document.activeElement?.textContent).toBe('JSON (.json)');
      fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
      document.removeEventListener('keydown', outer);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(escapes).not.toHaveBeenCalled();
      resolve();
    }));
  });

  it('closes when clicking elsewhere or tabbing away', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('describes itself for screen readers and has no axe violations open or closed', async () => {
    const { trigger } = setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const rules = { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } };
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu', { name: 'Export teams as' })).toBeTruthy();
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
  });
});
