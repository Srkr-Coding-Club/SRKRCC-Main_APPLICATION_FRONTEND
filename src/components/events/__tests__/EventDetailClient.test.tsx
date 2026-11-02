import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/hooks/useScrollEntrance', () => ({ useScrollEntrance: vi.fn() }));
vi.mock('@/components/events/QuickRegisterButton', () => ({ default: ({ label }: { label: string }) => <button type="button">{label}</button> }));
vi.mock('@/components/EventCard', () => ({ default: ({ event }: any) => <article data-testid="more-card">{event.title}</article> }));
vi.mock('@/components/ui/MarkdownRenderer', () => ({ MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="about">{content}</div> }));
const download = vi.fn();
vi.mock('@/lib/calendar', () => ({ downloadEventCalendar: (...a: unknown[]) => download(...a) }));

import { EventDetailClient } from '../EventDetailClient';

const event = (over: Record<string, unknown> = {}) => ({
  id: 1, title: 'Web Workshop', slug: 'web-workshop', description: 'Learn **Next.js** by building.', category: 'Workshop', venue: 'Seminar Hall',
  capacity: 100, registration_count: 40, status: 'LIVE', start_time: '2026-11-10T06:00:00Z', end_time: '2026-11-10T08:30:00Z',
  poster_image: null, is_quick_registration: false, form_slug: 'web-workshop-reg', registration_opens_at: null, registration_closes_at: null, ...over,
}) as any;

beforeEach(() => { download.mockReset(); });
afterEach(cleanup);

describe('EventDetailClient', () => {
  it('shows the title as the page heading with its category, status and the facts', () => {
    render(<EventDetailClient event={event()} more={[]} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Web Workshop' })).toBeTruthy();
    expect(screen.getByText('Registration open')).toBeTruthy();
    expect(screen.getByText('Nov 10, 2026')).toBeTruthy();
    expect(screen.getByText('11:30 AM - 2:00 PM')).toBeTruthy();
    expect(screen.getByText('Seminar Hall')).toBeTruthy();
    expect(screen.getByText('100 seats in total')).toBeTruthy();
    expect(screen.getByRole('link', { name: /All events/ }).getAttribute('href')).toBe('/events');
  });

  it('renders the description as the About section, or says details are coming', () => {
    render(<EventDetailClient event={event()} more={[]} />);
    expect(screen.getByRole('heading', { name: 'About this event' })).toBeTruthy();
    expect(screen.getByTestId('about').textContent).toBe('Learn **Next.js** by building.');
    cleanup();
    render(<EventDetailClient event={event({ description: '  ' })} more={[]} />);
    expect(screen.getByText('Details for this event will be posted soon.')).toBeTruthy();
  });

  it('shows the seats left with a bar, and "filling fast" near the end', () => {
    render(<EventDetailClient event={event()} more={[]} />);
    expect(screen.getByRole('progressbar', { name: 'Seats taken' }).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.queryByText('Filling fast')).toBeNull();
    cleanup();
    render(<EventDetailClient event={event({ registration_count: 92 })} more={[]} />);
    expect(screen.getByText('Filling fast')).toBeTruthy();
  });

  it('registers with the form, or says why registration is not possible', () => {
    render(<EventDetailClient event={event()} more={[]} />);
    expect(screen.getByRole('link', { name: /Register now/ }).getAttribute('href')).toBe('/forms/web-workshop-reg');
    cleanup();
    render(<EventDetailClient event={event({ registration_count: 100 })} more={[]} />);
    expect(screen.queryByRole('link', { name: /Register now/ })).toBeNull();
    expect(screen.getAllByText('Event full').length).toBeGreaterThan(0);
  });

  it('adds the event to a calendar, but only when it has a date and is not closed', () => {
    render(<EventDetailClient event={event()} more={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to calendar/ }));
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ slug: 'web-workshop' }));
    cleanup();
    render(<EventDetailClient event={event({ start_time: null, end_time: null })} more={[]} />);
    expect(screen.queryByRole('button', { name: /Add to calendar/ })).toBeNull();
    expect(screen.getAllByText('To be announced').length).toBeGreaterThan(0);
    cleanup();
    render(<EventDetailClient event={event({ status: 'CLOSED' })} more={[]} />);
    expect(screen.queryByRole('button', { name: /Add to calendar/ })).toBeNull();
  });

  it('copies the page link when Share is pressed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<EventDetailClient event={event()} more={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Share/ }));
    expect(await screen.findByRole('button', { name: /Link copied/ })).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it('suggests other events under the page, and nothing when there are none', () => {
    const { rerender } = render(<EventDetailClient event={event()} more={[]} />);
    expect(screen.queryByRole('heading', { name: 'More events' })).toBeNull();
    rerender(<EventDetailClient event={event()} more={[event({ id: 2, title: 'Next Talk' }), event({ id: 3, title: 'Hack Night' })]} />);
    expect(screen.getByRole('heading', { name: 'More events' })).toBeTruthy();
    expect(screen.getAllByTestId('more-card').map((card) => card.textContent)).toEqual(['Next Talk', 'Hack Night']);
  });

  it('says an event that is over has ended, with nothing to register for or add to a calendar', () => {
    render(<EventDetailClient event={event({ start_time: '2020-01-01T06:00:00Z', end_time: '2020-01-01T08:00:00Z' })} more={[]} />);
    expect(screen.getAllByText('Event ended').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Register now/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add to calendar/ })).toBeNull();
  });
});

