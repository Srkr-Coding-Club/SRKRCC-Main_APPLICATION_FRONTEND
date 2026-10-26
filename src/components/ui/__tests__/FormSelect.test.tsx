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
