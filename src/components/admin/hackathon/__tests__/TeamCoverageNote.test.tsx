import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeamCoverageNote } from '../TeamCoverageNote';

afterEach(() => cleanup());

const teams = { competing: 66, forming: 3, waitlisted: 0, awaiting_payment: 2, removed: 2, total: 73 };

describe('TeamCoverageNote', () => {
  it('says which teams are expected to hand something in and names the rest', () => {
    render(<TeamCoverageNote teams={teams} noun="ideas" showRemoved={false} onToggleRemoved={vi.fn()} />);
    expect(screen.getByText('Of 73 teams, 66 are registered and expected to hand in ideas. Not counted: 3 forming · 2 awaiting payment · 2 withdrawn or disqualified.')).toBeTruthy();
  });

  it('offers to show the withdrawn or disqualified teams\' rows', () => {
    const toggle = vi.fn();
    render(<TeamCoverageNote teams={teams} noun="ideas" removedRows={2} showRemoved={false} onToggleRemoved={toggle} />);
    fireEvent.click(screen.getByLabelText('Show 2 from withdrawn or disqualified teams'));
    expect(toggle).toHaveBeenCalledWith(true);
  });

  it('shows nothing when every team is registered', () => {
    const { container } = render(<TeamCoverageNote teams={{ ...teams, forming: 0, awaiting_payment: 0, removed: 0, total: 66 }} noun="ideas" showRemoved={false} onToggleRemoved={vi.fn()} />);
    expect(container.textContent).toBe('');
  });
});
