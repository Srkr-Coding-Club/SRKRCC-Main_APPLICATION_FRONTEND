import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PickerEntry } from '@/lib/problemPicker';

vi.mock('@/components/ui/MarkdownRenderer', () => ({ MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div> }));

import { ProblemPicker } from '../ProblemPicker';

const entry = (id: number, over: Partial<PickerEntry> = {}): PickerEntry => ({
  id: String(id), code: `PS-0${id}`, title: `Statement number ${id} with a rather long title that must wrap instead of being cut off`,
  domain: id % 2 ? 'HealthTech' : 'IoT', description: `Details of ${id}`, tags: [], hint: '', disabled: false, ...over,
});
const entries = [entry(1), entry(2, { hint: '2 left' }), entry(3, { hint: 'Full', disabled: true }), entry(4, { description: '' })];

/** jsdom has no matchMedia; this makes the "wide" query match or not. */
function mockWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide, media: query, addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const setup = (props: Record<string, unknown> = {}) => {
  const onChange = vi.fn();
  const onSheetOpenChange = vi.fn();
  const utils = render(<ProblemPicker entries={entries} value="" onChange={onChange} onSheetOpenChange={onSheetOpenChange} {...props} />);
  return { onChange, onSheetOpenChange, ...utils };
};

beforeEach(() => mockWide(false));
afterEach(() => { cleanup(); delete (window as { matchMedia?: unknown }).matchMedia; });

describe('ProblemPicker on a phone', () => {
  it('shows a field that says nothing is chosen yet and opens a sheet with every statement', () => {
    const { onSheetOpenChange } = setup();
    const field = screen.getByRole('button', { name: 'Problem statement: none chosen' });
    fireEvent.click(field);
    expect(onSheetOpenChange).toHaveBeenLastCalledWith(true);
    const sheet = screen.getByRole('dialog', { name: 'Choose a problem statement' });
    expect(within(sheet).getAllByRole('option')).toHaveLength(4);
    expect(within(sheet).getByText('4 statements')).toBeTruthy();
  });

  it('picks a statement, closes the sheet and shows its description under the field', () => {
    const { onChange, onSheetOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    fireEvent.click(screen.getByRole('option', { name: /PS-02/ }));
    expect(onChange).toHaveBeenCalledWith('2');
    expect(onSheetOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the chosen statement in the field with its description collapsed until asked for', () => {
    setup({ value: '2' });
    expect(screen.getByRole('button', { name: /Problem statement: PS-02 Statement number 2/ })).toBeTruthy();
    const more = screen.getByRole('button', { name: 'Read the full description' });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('cannot choose a full statement', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    const full = screen.getByRole('option', { name: /PS-03/ }) as HTMLButtonElement;
    expect(full.disabled).toBe(true);
    fireEvent.click(full);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('narrows the list with search and domain chips, says how many match and can clear them', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'number 4' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('1 of 4 statements')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^IoT/ }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('PS-02'), expect.stringContaining('PS-04')]);
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'zzz' } });
    expect(screen.getByText('No statement matches your search.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('moves through the statements with the arrow keys and skips full ones', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    const search = screen.getByLabelText('Search problem statements');
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('PS-01');
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('PS-04');
    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
    expect(document.activeElement?.textContent).toContain('PS-01');
  });

  it('Escape closes only the sheet and tells the dialog behind it', () => {
    const { onSheetOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    fireEvent.keyDown(screen.getByRole('option', { name: /PS-01/ }), { key: 'Escape' });
    document.removeEventListener('keydown', outer);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSheetOpenChange).toHaveBeenLastCalledWith(false);
    expect(outer).not.toHaveBeenCalled();
  });

  it('ties the error to the field', () => {
    setup({ error: 'Pick a problem statement.' });
    const field = screen.getByRole('button', { name: /Problem statement/ });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(field.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Pick a problem statement.');
  });

  it('has no axe violations closed or open', async () => {
    setup({ value: '1' });
    const rules = { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } };
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: /Problem statement/ }));
    expect((await axe.run(document.body, rules)).violations).toEqual([]);
  });
});

describe('ProblemPicker on a large screen', () => {
  beforeEach(() => mockWide(true));

  it('lists the statements inline beside an empty details panel, with no sheet', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Problem statement:/ })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByText('Select a statement to read its full description.')).toBeTruthy();
  });

  it('shows the full description of the chosen statement and lets the user pick another', () => {
    const { onChange, rerender } = setup({ value: '1' });
    expect(screen.getByRole('heading', { level: 4 }).textContent).toContain('Statement number 1');
    expect(screen.getByText('Details of 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: /PS-02/ }));
    expect(onChange).toHaveBeenCalledWith('2');
    rerender(<ProblemPicker entries={entries} value="4" onChange={onChange} />);
    expect(screen.getByText('No further description was given.')).toBeTruthy();
  });

  it('marks the chosen row selected and shows the error under the list', () => {
    setup({ value: '2', error: 'Pick a problem statement.' });
    expect(screen.getByRole('option', { name: /PS-02/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Pick a problem statement.')).toBeTruthy();
  });
});

describe('ProblemPicker with few or no domains', () => {
  it('hides the domain chips when there is only one domain', () => {
    mockWide(true);
    setup({ entries: [entry(1), entry(3)] });
    expect(screen.queryByRole('group', { name: 'Filter by domain' })).toBeNull();
  });

  it('handles an empty list', () => {
    mockWide(true);
    setup({ entries: [] });
    expect(screen.getByText('No statement matches your search.')).toBeTruthy();
  });
});
