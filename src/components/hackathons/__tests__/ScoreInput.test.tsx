import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScoreInput } from '../judging/ScoreInput';

afterEach(cleanup);

const criterion = (over: Record<string, unknown> = {}) => ({ id: 1, name: 'Idea', description: 'Is it new?', max_score: 10, weight: 3, ...over }) as any;

describe('ScoreInput', () => {
  it('labels the number box with the criterion and shows what to look for and the maximum', () => {
    render(<ScoreInput id="c1" criterion={criterion()} value="" onChange={() => {}} />);
    const box = screen.getByLabelText(/^Idea/) as HTMLInputElement;
    expect(box.max).toBe('10');
    expect(screen.getByText('Is it new?')).toBeTruthy();
    expect(screen.getByText('/ 10')).toBeTruthy();
    expect(screen.getByText('weight 3')).toBeTruthy();
  });

  it('offers one-tap scores from 0 to the maximum and sends the tapped one', () => {
    const onChange = vi.fn();
    render(<ScoreInput id="c1" criterion={criterion({ max_score: 5 })} value="" onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Quick pick for Idea' });
    expect(group.querySelectorAll('[role=radio]')).toHaveLength(6);
    fireEvent.click(screen.getByRole('radio', { name: '4 out of 5' }));
    expect(onChange).toHaveBeenCalledWith('4');
  });

  it('marks only the chosen score and none when the value is out of range', () => {
    const { rerender } = render(<ScoreInput id="c1" criterion={criterion({ max_score: 5 })} value="3" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: '3 out of 5' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '2 out of 5' }).getAttribute('aria-checked')).toBe('false');
    rerender(<ScoreInput id="c1" criterion={criterion({ max_score: 5 })} value="9" onChange={() => {}} />);
    expect(screen.queryAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(0);
  });

  it('skips the quick picks when the scale is long, leaving the number box', () => {
    render(<ScoreInput id="c1" criterion={criterion({ max_score: 100 })} value="" onChange={() => {}} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByLabelText(/^Idea/)).toBeTruthy();
  });

  it('passes typed text through unchanged', () => {
    const onChange = vi.fn();
    render(<ScoreInput id="c1" criterion={criterion()} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Idea/), { target: { value: '7.5' } });
    expect(onChange).toHaveBeenCalledWith('7.5');
  });
});
