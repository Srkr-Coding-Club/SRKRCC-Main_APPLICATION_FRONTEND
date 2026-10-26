import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));

import { ProblemStatementsExplorer } from '../ProblemStatementsExplorer';

const ps = (id: number, over: Record<string, unknown> = {}) =>
  ({
    id,
    code: `PS-00${id}`,
    title: `Problem ${id} title`,
    description: `**Bold** summary ${id}`,
    domain: 'EdTech',
    tags: [],
    max_teams: null,
    is_active: true,
    order: id,
    team_count: 0,
    slots_left: null,
    ...over,
  }) as any;

const problems = [
  ps(1, { domain: 'EdTech', tags: ['vision', 'audio', 'ml', 'extra'] }),
  ps(2, { domain: 'Civic', max_teams: 2, slots_left: 0 }),
  ps(3, { domain: 'Security', max_teams: 5, slots_left: 2 }),
  ps(4, { domain: 'Security' }),
];

const renderExplorer = (props: Record<string, unknown> = {}) =>
  render(
    <ProblemStatementsExplorer problems={problems} allowOpenInnovation hackathonSlug="demo" isRegistrationOpen domainOrder={['EdTech']} {...props} />,
  );

const cardTitles = () => screen.getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent);

beforeEach(() => {
  window.history.replaceState(null, '', '/hackathons/demo');
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
});
afterEach(() => cleanup());

describe('ProblemStatementsExplorer', () => {
  it('groups cards under track headings when there are enough tracks', () => {
    renderExplorer();
    expect(screen.getByRole('region', { name: 'EdTech problem statements' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Civic problem statements' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Security problem statements' })).toBeTruthy();
  });

  it('shows a plain summary, limited tags and clear slot status on the card', () => {
    renderExplorer();
    const cards = screen.getAllByRole('article');
    expect(cards[0].textContent).toContain('Bold summary 1');
    expect(cards[0].textContent).not.toContain('**');
    expect(cards[0].textContent).toContain('+1 more');
    expect(cards[0].textContent).toContain('Unlimited slots');
    expect(cards[1].textContent).toContain('Full');
  });

  it('offers Choose only on problems that still have room', () => {
    renderExplorer();
    const links = screen.getAllByRole('link', { name: /Choose Problem/ });
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe('/hackathons/demo/dashboard?ps=1');
  });

  it('narrows by search after a short debounce and announces the count', async () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'PS-003' } });
    await waitFor(() => expect(cardTitles()).toEqual(['Problem 3 title']));
    expect(screen.getByRole('status').textContent).toContain('Showing 1 of 4');
    expect(window.location.search).toContain('q=PS-003');
  });

  it('filters by track with the desktop pills and writes it to the URL', async () => {
    renderExplorer();
    const group = screen.getByRole('group', { name: 'Filter by track' });
    fireEvent.click(within(group).getByRole('button', { name: /Security/ }));
    expect(cardTitles()).toEqual(['Problem 3 title', 'Problem 4 title']);
    await waitFor(() => expect(window.location.search).toContain('track=Security'));
  });

  it('restores filters from the URL', async () => {
    window.history.replaceState(null, '', '/hackathons/demo?track=Civic');
    renderExplorer();
    await waitFor(() => expect(cardTitles()).toEqual(['Problem 2 title']));
  });

  it('applies the mobile filter sheet and shows removable chips', () => {
    renderExplorer();
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(sheet).getByLabelText(/Security/));
    fireEvent.click(within(sheet).getByRole('switch', { name: 'Open slots only' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Show 2 problems' }));

    expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    expect(cardTitles()).toEqual(['Problem 3 title', 'Problem 4 title']);
    expect(screen.getByRole('button', { name: /^Filters/ }).textContent).toContain('2');

    fireEvent.click(screen.getByRole('button', { name: 'Remove track filter Security' }));
    expect(cardTitles()).toHaveLength(3);
  });

  it('sorts by most slots left', () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Sort problem statements'), { target: { value: 'slots' } });
    expect(cardTitles()).toEqual(['Problem 1 title', 'Problem 4 title', 'Problem 3 title', 'Problem 2 title']);
  });

  it('opens the full details when the card is tapped and pins the select action', () => {
    renderExplorer();
    fireEvent.click(screen.getAllByRole('article')[2]);
    const dialog = screen.getByRole('dialog', { name: 'Problem 3 title' });
    expect(within(dialog).getByRole('link', { name: /Select this Statement/ }).getAttribute('href')).toBe('/hackathons/demo/dashboard?ps=3');
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not offer selection for a full problem', () => {
    renderExplorer();
    fireEvent.click(screen.getAllByRole('article')[1]);
    expect(screen.queryByRole('link', { name: /Select this Statement/ })).toBeNull();
  });

  it('shows the empty state and resets from it', async () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.getByText('No matching problem statements found.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));
    await waitFor(() => expect(cardTitles()).toHaveLength(4));
  });
});
