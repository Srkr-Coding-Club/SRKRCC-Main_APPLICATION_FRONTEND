import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/hooks/useScrollEntrance', () => ({ useScrollEntrance: vi.fn() }));

import HackathonCard from '../HackathonCard';

const hackathon = (over: Record<string, unknown> = {}) =>
  ({
    id: 1,
    title: 'HackOverflow 2026',
    slug: 'hackoverflow-2026',
    theme: 'Build for Bharat',
    description: '**Build** a prototype in 36 hours.',
    prize_pool: '₹1,50,000',
    status: 'LIVE',
    start_date: '2026-11-10T09:00:00+05:30',
    end_date: '2026-11-12T18:00:00+05:30',
    banner_image: null,
    is_registration_open: true,
    registered_team_count: 3,
    ...over,
  }) as any;

beforeEach(() => push.mockReset());
afterEach(() => cleanup());

describe('HackathonCard', () => {
  it('shows the cover title, plain description, dates and the registration status', () => {
    render(<HackathonCard hackathon={hackathon()} />);
    expect(screen.getByRole('heading', { name: 'HackOverflow 2026' })).toBeTruthy();
    expect(screen.getByText('Build a prototype in 36 hours.')).toBeTruthy();
    expect(screen.getByText('Registration open')).toBeTruthy();
    expect(screen.getByText('Nov 10, 2026')).toBeTruthy();
    expect(screen.getByText('Nov 12, 2026')).toBeTruthy();
    expect(screen.getByText('3 teams registered')).toBeTruthy();
  });

  it('offers Register Team only while registration is open', () => {
    render(<HackathonCard hackathon={hackathon()} />);
    expect(screen.getByRole('link', { name: /Register Team/ }).getAttribute('href')).toBe('/hackathons/hackoverflow-2026');
    cleanup();
    render(<HackathonCard hackathon={hackathon({ status: 'CLOSED', is_registration_open: false })} />);
    expect(screen.queryByRole('link', { name: /Register Team/ })).toBeNull();
    expect(screen.getByText('Registration Closed')).toBeTruthy();
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
  });

  it('says when registration opens later', () => {
    const later = new Date(Date.now() + 86_400_000).toISOString();
    render(<HackathonCard hackathon={hackathon({ is_registration_open: false, registration_opens_at: later })} />);
    expect(screen.getByText('Opens soon')).toBeTruthy();
    expect(screen.getByText('Registration opens soon')).toBeTruthy();
  });

  it('uses a placeholder when there is no banner and the banner when there is', () => {
    const { container } = render(<HackathonCard hackathon={hackathon()} />);
    expect(container.querySelector('img')).toBeNull();
    cleanup();
    const withBanner = render(<HackathonCard hackathon={hackathon({ banner_image: 'https://example.org/b.png' })} />);
    expect(withBanner.container.querySelector('img')?.getAttribute('src')).toContain('example.org/b.png');
  });

  it('opens the hackathon when the card is clicked but not when a link inside is', () => {
    render(<HackathonCard hackathon={hackathon()} />);
    fireEvent.click(screen.getByRole('article'));
    expect(push).toHaveBeenCalledWith('/hackathons/hackoverflow-2026');
    push.mockReset();
    fireEvent.click(screen.getByRole('link', { name: /View details/ }));
    expect(push).not.toHaveBeenCalled();
  });
});
