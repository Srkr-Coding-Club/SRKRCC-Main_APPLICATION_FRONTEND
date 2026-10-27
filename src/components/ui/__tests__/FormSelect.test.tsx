import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormSelect } from '../FormSelect';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true },
  { value: 'd', label: 'Delta' },
];

const renderSelect = (props: Record<string, unknown> = {}) => {
  const onChange = vi.fn();
  render(<FormSelect value="" options={options} placeholder="Pick one" onChange={onChange} aria-label="Letter" {...props} />);
  return { onChange, trigger: screen.getByRole('button', { name: /Letter/ }) };
};

afterEach(() => cleanup());

describe('FormSelect keyboard and naming', () => {
  it('names the control and keeps the chosen value in the name', () => {
    renderSelect({ value: 'b' });
    expect(screen.getByRole('button', { name: 'Letter: Beta' })).toBeTruthy();
  });

  it('opens with ArrowDown, lands on the selected option, and Escape closes it and returns focus', () => {
    const { trigger } = renderSelect({ value: 'b' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    return new Promise<void>((resolve) => requestAnimationFrame(() => {
      expect(screen.getByRole('listbox')).toBeTruthy();
      expect(document.activeElement?.textContent).toContain('Beta');
      fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      resolve();
    }));
  });

  it('moves between options with the arrow keys and skips disabled ones', () => {
    const { trigger } = renderSelect({ allowClear: false });
    fireEvent.click(trigger);
    const first = screen.getByRole('option', { name: 'Alpha' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('Beta');
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('Delta');
    fireEvent.keyDown(document.activeElement as Element, { key: 'Home' });
    expect(document.activeElement?.textContent).toContain('Alpha');
  });

  it('Escape does not reach a parent that listens for it (a dialog around the select stays open)', () => {
    const outer = vi.fn();
    const { trigger } = renderSelect();
    document.addEventListener('keydown', outer);
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Alpha' }), { key: 'Escape' });
    document.removeEventListener('keydown', outer);
    expect(outer).not.toHaveBeenCalled();
  });

  it('selecting an option calls onChange and returns focus to the trigger', () => {
    const { trigger, onChange } = renderSelect();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Delta' }));
    expect(onChange).toHaveBeenCalledWith('d');
    expect(document.activeElement).toBe(trigger);
  });

  it('has no axe violations open or closed', async () => {
    const { trigger } = renderSelect({ value: 'a' });
    expect((await axe.run(document.body, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } })).violations).toEqual([]);
    fireEvent.click(trigger);
    expect((await axe.run(document.body, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });
});

describe('FormSelect list placement and long lists', () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ value: String(i), label: 'Option number ' + i }));

  it('renders the list outside the component so a dialog or scroll area cannot clip it', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');
    expect(list.parentElement).toBe(document.body);
    expect(list.style.position).toBe('fixed');
  });

  it('has no search box for a short list and one for a long list, which filters and can be empty', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger);
    expect(screen.queryByLabelText('Search options')).toBeNull();
    cleanup();

    const { trigger: longTrigger } = renderSelect({ options: many });
    fireEvent.click(longTrigger);
    const search = screen.getByLabelText('Search options');
    fireEvent.change(search, { target: { value: 'number 1' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toContain('Option number 12');
    expect(screen.queryByRole('option', { name: 'Option number 2' })).toBeNull();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches.')).toBeTruthy();
  });

  it('can force the search box on or off', () => {
    const { trigger } = renderSelect({ searchable: true });
    fireEvent.click(trigger);
    expect(screen.getByLabelText('Search options')).toBeTruthy();
    cleanup();
    const { trigger: other } = renderSelect({ options: many, searchable: false });
    fireEvent.click(other);
    expect(screen.queryByLabelText('Search options')).toBeNull();
  });

  it('forgets the search when it closes and reopens', () => {
    const { trigger } = renderSelect({ options: many });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText('Search options'), { target: { value: 'number 3' } });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect((screen.getByLabelText('Search options') as HTMLInputElement).value).toBe('');
  });

  it('lets long labels wrap instead of cutting them off', () => {
    const label = 'A very long option label that used to be cut off with an ellipsis in the list';
    const { trigger } = renderSelect({ options: [{ value: 'x', label }] });
    fireEvent.click(trigger);
    const row = screen.getByRole('option', { name: label });
    expect(row.innerHTML).not.toContain('truncate');
    expect(row.querySelector('span')?.className).toContain('break-words');
  });

  it('closes when clicking outside but not when clicking inside the list', () => {
    const { trigger } = renderSelect({ options: many });
    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByLabelText('Search options'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Tab from inside the list hands focus back to the button and closes the list', () => {
    const { trigger } = renderSelect();
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Alpha' });
    option.focus();
    fireEvent.keyDown(option, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('ArrowDown from the search box enters the list', () => {
    const { trigger } = renderSelect({ options: many, allowClear: false });
    fireEvent.click(trigger);
    const search = screen.getByLabelText('Search options');
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('Option number 0');
  });
});
