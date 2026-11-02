import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/hooks/useScrollEntrance', () => ({ useScrollEntrance: vi.fn() }));
vi.mock('@/components/events/QuickRegisterButton', () => ({ default: ({ label }: { label: string }) => <button type="button">{label}</button> }));

import EventCard from '../EventCard';
import { useScrollEntrance } from '@/lib/hooks/useScrollEntrance';

const event = (over: Record<string, unknown> = {}) => ({
  id: 1, title: 'Web Workshop', slug: 'web-workshop', description: '**Hands-on** Next.js.', category: 'Workshop', venue: 'Seminar Hall',
  capacity: 100, registration_count: 40, status: 'LIVE', start_time: '2026-11-10T06:00:00Z', end_time: '2026-11-10T08:30:00Z',
  poster_image: null, is_quick_registration: false, form_slug: 'web-workshop-reg', registration_opens_at: null, registration_closes_at: null, ...over,
}) as any;

beforeEach(() => { push.mockReset(); vi.mocked(useScrollEntrance).mockClear(); });
afterEach(cleanup);

describe('EventCard', () => {
  it('shows the cover title and category, the plain description, when and where, and the seats', () => {
    render(<EventCard event={event()} />);
    expect(screen.getByRole('heading', { name: 'Web Workshop' })).toBeTruthy();
    expect(screen.getByText('Workshop')).toBeTruthy();
    expect(screen.getByText('Hands-on Next.js.')).toBeTruthy();
    expect(screen.getByText('Tue, Nov 10')).toBeTruthy();
    expect(screen.getByText('11:30 AM - 2:00 PM')).toBeTruthy();
    expect(screen.getByText('Seminar Hall')).toBeTruthy();
    expect(screen.getByText('Registration open')).toBeTruthy();
    expect(screen.getByText('60 of 100 seats left')).toBeTruthy();
  });

  it('uses the same scroll entrance as the hackathon and form cards', () => {
    render(<EventCard event={event()} index={2} />);
    expect(useScrollEntrance).toHaveBeenCalledTimes(1);
    expect(vi.mocked(useScrollEntrance).mock.calls[0][2]).toMatchObject({ index: 2, delay: 0.15, start: 'top 85%' });
  });

  it('opens the event page from the card, the Details link and the title, never a pop-up', () => {
    render(<EventCard event={event()} />);
    expect(screen.getByRole('link', { name: 'View details for Web Workshop' }).getAttribute('href')).toBe('/events/web-workshop');
    fireEvent.click(screen.getByRole('heading', { name: 'Web Workshop' }));
    expect(push).toHaveBeenCalledWith('/events/web-workshop');
    push.mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'View details for Web Workshop' }));
    expect(push).not.toHaveBeenCalled();                                         // the link navigates by itself
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('registers with the form for a custom event and with one click for a one-click event', () => {
    render(<EventCard event={event()} />);
    expect(screen.getByRole('link', { name: /Register now/ }).getAttribute('href')).toBe('/forms/web-workshop-reg');
    cleanup();
    render(<EventCard event={event({ is_quick_registration: true })} />);
    expect(screen.getByRole('button', { name: 'Register now' })).toBeTruthy();
  });

  it('says why nobody can register when the event is closed, full or not open yet', () => {
    render(<EventCard event={event({ status: 'CLOSED' })} />);
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
    expect(screen.getByText('Registration closed')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Register now/ })).toBeNull();
    cleanup();
    render(<EventCard event={event({ registration_count: 100 })} />);
    expect(screen.getAllByText('Event full').length).toBe(2);
    cleanup();
    render(<EventCard event={event({ registration_opens_at: new Date(Date.now() + 86400_000).toISOString() })} />);
    expect(screen.getByText('Opens soon')).toBeTruthy();
    expect(screen.getByText('Registration opens soon')).toBeTruthy();
  });

  it('copes with an event that has no date, venue or poster yet', () => {
    render(<EventCard event={event({ start_time: null, end_time: null, venue: '' })} />);
    expect(screen.getByText('To be announced')).toBeTruthy();
    expect(screen.getByText('Venue to be announced')).toBeTruthy();
  });

  it('uses the poster when its address is safe, and drops an unsafe one', () => {
    const { container } = render(<EventCard event={event({ poster_image: 'https://cdn.example.org/p.png' })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.org/p.png');
    cleanup();
    const unsafe = render(<EventCard event={event({ poster_image: 'javascript:alert(1)' })} />);
    expect(unsafe.container.querySelector('img')).toBeNull();
  });

  it('lays a lone event out wide, poster beside the details', () => {
    const { container } = render(<EventCard event={event()} layout="wide" />);
    expect(container.querySelector('article')?.className).toContain('md:flex-row');
    expect(container.querySelector('.ec-media')?.className).toContain('md:w-[46%]');
    cleanup();
    const narrow = render(<EventCard event={event()} />);
    expect(narrow.container.querySelector('article')?.className).not.toContain('md:flex-row');
  });

  it('says an event that is over has ended and offers no registration', () => {
    render(<EventCard event={event({ start_time: '2020-01-01T06:00:00Z', end_time: '2020-01-01T08:00:00Z' })} />);
    expect(screen.getAllByText('Event ended').length).toBe(2);              // the chip and the register button's reason
    expect(screen.queryByRole('link', { name: /Register now/ })).toBeNull();
  });

  it('says "1 seat" for a one-seat event', () => {
    render(<EventCard event={event({ capacity: 1, registration_count: 1 })} />);
    expect(screen.getByText('1 seat')).toBeTruthy();
  });
});

