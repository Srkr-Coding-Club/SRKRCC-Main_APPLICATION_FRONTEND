import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const entrance = vi.hoisted(() => ({ useScrollEntrance: vi.fn() }));
vi.mock('@/lib/hooks/useScrollEntrance', () => entrance);

import CardGrid from '../CardGrid';

const cards = (count: number) => Array.from({ length: count }, (_, i) => <article key={`c${i}`}>Card {i}</article>);

beforeEach(() => entrance.useScrollEntrance.mockReset());
afterEach(() => cleanup());

describe('CardGrid', () => {
  it('lists every card in order as upright list items', () => {
    render(<CardGrid cards={cards(4)} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Card 0', 'Card 1', 'Card 2', 'Card 3']);
  });

  it('is one column on a phone and three on a desktop', () => {
    render(<CardGrid cards={cards(2)} />);
    const className = screen.getByRole('list').className;
    expect(className).toContain('grid-cols-1');
    expect(className).toContain('sm:grid-cols-2');
    expect(className).toContain('lg:grid-cols-3');
  });

  it('staggers cards within a row but not down the page', () => {
    render(<CardGrid cards={cards(5)} />);
    const indexes = entrance.useScrollEntrance.mock.calls.map((call) => (call[2] as { index: number }).index);
    expect(indexes).toEqual([0, 1, 2, 0, 1]);
  });
});
