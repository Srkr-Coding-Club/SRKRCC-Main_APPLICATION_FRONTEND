import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AfterSubmitSettings, type AfterSubmitMeta } from '../AfterSubmitSettings';
import { SubmissionThanks } from '@/components/forms/SubmissionThanks';

afterEach(() => { cleanup(); vi.useRealTimers(); });

function Harness({ start = {}, onChange }: { start?: AfterSubmitMeta; onChange?: (m: AfterSubmitMeta) => void }) {
  const [meta, setMeta] = useState<AfterSubmitMeta>(start);
  return <AfterSubmitSettings formMeta={meta} setFormMeta={(m) => { setMeta(m); onChange?.(m); }} />;
}

describe('AfterSubmitSettings', () => {
  it('edits the message, the redirect and the delay', () => {
    const seen: AfterSubmitMeta[] = [];
    render(<Harness onChange={(m) => seen.push(m)} />);
    fireEvent.change(screen.getByLabelText(/Thank-you message/), { target: { value: 'See you!' } });
    fireEvent.change(screen.getByLabelText(/Then send them to/), { target: { value: '/events' } });
    fireEvent.change(screen.getByLabelText(/After \(seconds\)/), { target: { value: '12' } });
    expect(seen.at(-1)).toMatchObject({ confirmation_message: 'See you!', redirect_url: '/events', redirect_delay_seconds: 12 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the delay within range', () => {
    const seen: AfterSubmitMeta[] = [];
    render(<Harness onChange={(m) => seen.push(m)} />);
    fireEvent.change(screen.getByLabelText(/After \(seconds\)/), { target: { value: '500' } });
    expect(seen.at(-1)!.redirect_delay_seconds).toBe(30);
  });

  it('says why an unsafe redirect is not acceptable', () => {
    render(<Harness start={{ redirect_url: 'javascript:alert(1)' }} />);
    expect(screen.getByRole('alert').textContent).toMatch(/https:\/\//);
    expect(screen.getByLabelText(/Then send them to/).getAttribute('aria-invalid')).toBe('true');
  });

  it('switches the bot check on and explains what it needs', () => {
    const seen: AfterSubmitMeta[] = [];
    render(<Harness onChange={(m) => seen.push(m)} />);
    expect(screen.queryByText(/TURNSTILE_SECRET_KEY/)).toBeNull();
    fireEvent.click(screen.getByLabelText('Bot check (CAPTCHA)'));
    expect(seen.at(-1)!.captcha_enabled).toBe(true);
    expect(screen.getByText(/TURNSTILE_SECRET_KEY/)).toBeTruthy();
  });
});

describe('SubmissionThanks', () => {
  it('says the default thank-you when the form has no message', () => {
    render(<SubmissionThanks title="Hack Night" />);
    expect(screen.getByText('Submission Received!')).toBeTruthy();
    expect(screen.getByText(/Hack Night/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the form’s own message instead', () => {
    render(<SubmissionThanks title="Hack Night" message="  See you there, Dee!  " />);
    expect(screen.getByTestId('thank-you-message').textContent).toBe('See you there, Dee!');
  });

  it('counts down and then navigates', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<SubmissionThanks title="x" redirectUrl="/events" delaySeconds={2} navigate={navigate} />);
    expect(screen.getByRole('status').textContent).toMatch(/in 2 seconds/);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('status').textContent).toMatch(/in 1 second…/);
    expect(navigate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/events');
  });

  it('lets the person stay or go at once', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const { unmount } = render(<SubmissionThanks title="x" redirectUrl="https://example.org/next" delaySeconds={5} navigate={navigate} />);
    fireEvent.click(screen.getByText('Stay here'));
    act(() => { vi.advanceTimersByTime(10000); });
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    unmount();

    render(<SubmissionThanks title="x" redirectUrl="https://example.org/next" delaySeconds={5} navigate={navigate} />);
    fireEvent.click(screen.getByText('Go now'));
    expect(navigate).toHaveBeenCalledWith('https://example.org/next');
  });

  it('never navigates to an unsafe address even if one was stored', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    render(<SubmissionThanks title="x" redirectUrl="javascript:alert(1)" delaySeconds={0} navigate={navigate} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('can redirect at once when the delay is zero', () => {
    const navigate = vi.fn();
    render(<SubmissionThanks title="x" redirectUrl="/events" delaySeconds={0} navigate={navigate} />);
    expect(navigate).toHaveBeenCalledWith('/events');
  });
});
