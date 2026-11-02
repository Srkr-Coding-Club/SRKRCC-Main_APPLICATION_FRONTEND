import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from 'lucide-react';

vi.mock('@/lib/hooks/useScrollEntrance', () => ({ useScrollEntrance: vi.fn() }));

import PhasedListing from '../PhasedListing';
import ListingGrid from '../ListingGrid';

afterEach(cleanup);

const item = (id: number, name = `Item ${id}`) => ({ id, name });
const renderItem = (it: { id: number; name: string }, _index: number, layout: string) => <article data-layout={layout}>{it.name}</article>;

function listing(over: Partial<React.ComponentProps<typeof PhasedListing<{ id: number; name: string }>>> = {}) {
  return render(
    <PhasedListing
      icon={Calendar}
      noun="event"
      live={[]}
      upcoming={[]}
      past={[]}
      getKey={(it) => it.id}
      render={renderItem}
      upcomingDescription="Coming soon."
      empty={<p>Nothing ahead</p>}
      {...over}
    />,
  );
}

describe('ListingGrid', () => {
  const grid = (count: number) => render(<ListingGrid items={Array.from({ length: count }, (_, i) => item(i + 1))} getKey={(it) => it.id} render={renderItem} />);

  it('shows one item wide, so a lone card does not sit in a third of the row', () => {
    const { container } = grid(1);
    expect(container.querySelector('ul')?.getAttribute('data-layout')).toBe('wide');
    expect(screen.getByText('Item 1').getAttribute('data-layout')).toBe('wide');
    expect(container.querySelector('ul')?.className).toContain('max-w-5xl');
  });

  it('shares the middle of the row between two, and uses three columns from three up', () => {
    const two = grid(2).container.querySelector('ul')!;
    expect(two.className).toContain('sm:grid-cols-2');
    expect(two.className).not.toContain('lg:grid-cols-3');
    expect(two.className).toContain('max-w-4xl');
    cleanup();
    const four = grid(4).container.querySelector('ul')!;
    expect(four.className).toContain('lg:grid-cols-3');
    expect(screen.getAllByText(/Item/).every((card) => card.getAttribute('data-layout') === 'card')).toBe(true);
  });

  it('renders nothing for an empty list', () => {
    expect(grid(0).container.querySelector('ul')).toBeNull();
  });
});

describe('PhasedListing', () => {
  it('counts only what is ahead under Upcoming, and keeps past items out of it', () => {
    listing({ upcoming: [item(1), item(2)], past: [item(3, 'Old one')] });
    expect(screen.getByRole('heading', { name: 'Upcoming events (2)' })).toBeTruthy();
    expect(screen.queryByText('Old one')).toBeNull();                              // past is tucked away
  });

  it('shows what is on now in its own section above Upcoming', () => {
    listing({ live: [item(9, 'On now')], upcoming: [item(1)] });
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Happening now (1)', 'Upcoming events (1)']);
  });

  it('opens and closes the past items on request', () => {
    listing({ upcoming: [item(1)], past: [item(3, 'Old one')] });
    const toggle = screen.getByRole('button', { name: /Past events/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(document.getElementById('listing-past-list')!).getByText('Old one')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText('Old one')).toBeNull();
  });

  it('says there is nothing ahead when everything is over, and still offers the past ones', () => {
    listing({ past: [item(3, 'Old one')] });
    expect(screen.getByText('Nothing ahead')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /Upcoming/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Past events/ })).toBeTruthy();
  });

  it('shows no past section at all when nothing is over', () => {
    listing({ upcoming: [item(1)] });
    expect(screen.queryByRole('button', { name: /Past/ })).toBeNull();
    expect(screen.queryByText('Nothing ahead')).toBeNull();
  });

  it('shows a lone upcoming item wide', () => {
    listing({ upcoming: [item(1)] });
    expect(screen.getByText('Item 1').getAttribute('data-layout')).toBe('wide');
  });
});
