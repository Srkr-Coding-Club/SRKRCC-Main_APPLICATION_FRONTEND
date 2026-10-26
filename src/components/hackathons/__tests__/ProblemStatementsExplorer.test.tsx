import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/hooks/useScrollEntrance', () => ({ useScrollEntrance: vi.fn() }));

import { ProblemStatementsExplorer } from '../ProblemStatementsExplorer';

const ps = (id: number, over: Record<string, unknown> = {}) =>
  ({
    id,
    code: `PS-${String(id).padStart(3, '0')}`,
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

const renderExplorer = (list = problems, props: Record<string, unknown> = {}) =>
  render(
    <ProblemStatementsExplorer problems={list} allowOpenInnovation hackathonSlug="demo" isRegistrationOpen domainOrder={['EdTech']} {...props} />,
  );

const cards = () => screen.getAllByRole('article');
const cardTitles = () => cards().map((card) => within(card).getByRole('heading', { level: 3 }).textContent);
const openSelect = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const choose = (select: RegExp, option: RegExp) => {
  openSelect(select);
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }));
};

beforeEach(() => {
  window.history.replaceState(null, '', '/hackathons/demo');
});
afterEach(() => cleanup());

describe('ProblemStatementsExplorer', () => {
  it('groups the cards under a heading for each track, in the admin order, when there are enough tracks', () => {
    renderExplorer();
    const headings = screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
    expect(headings).toEqual(['EdTech problem statements', 'Civic problem statements', 'Security problem statements']);
    expect(cardTitles()).toEqual(['Problem 1 title', 'Problem 2 title', 'Problem 3 title', 'Problem 4 title']);
  });

  it('shows a plain summary, limited tags, the code and the track on each card, and nothing about slots', () => {
    renderExplorer();
    const [first] = cards();
    expect(first.textContent).toContain('PS-001');
    expect(first.textContent).toContain('Bold summary 1');
    expect(first.textContent).not.toContain('**');
    expect(first.textContent).toContain('+1 more');
    expect(first.textContent).toContain('EdTech');
    expect(screen.queryByText(/slots/i)).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('gives each track its own stripe colour, and keeps it while filtering', () => {
    renderExplorer();
    const stripe = (card: HTMLElement) => card.querySelector('span[aria-hidden="true"].absolute')?.className ?? '';
    const [edtech, civic, security] = cards();
    expect(new Set([stripe(edtech), stripe(civic), stripe(security)]).size).toBe(3);
    const securityStripe = stripe(security);
    choose(/Filter by track/, /Security/);
    expect(stripe(cards()[0])).toBe(securityStripe);
  });

  it('offers Choose Problem only on cards that still have room', () => {
    renderExplorer();
    const links = screen.getAllByRole('link', { name: /Choose Problem/ });
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe('/hackathons/demo/dashboard?ps=1');
  });

  it('hides Choose Problem when registration is closed', () => {
    renderExplorer(problems, { isRegistrationOpen: false });
    expect(screen.queryByRole('link', { name: /Choose Problem/ })).toBeNull();
  });

  it('narrows by search after a short debounce, drops the headings, announces the count and writes the URL', async () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'PS-003' } });
    await waitFor(() => expect(cardTitles()).toEqual(['Problem 3 title']));
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    expect(screen.getByRole('status').textContent?.replace(/\s+/g, ' ')).toContain('Showing 1 of 1 problem statements (4 in total)');
    expect(window.location.search).toContain('q=PS-003');
  });

  it('filters by track from the list, which shows a count for each track', async () => {
    renderExplorer();
    openSelect(/Filter by track/);
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['All tracks (4)', 'EdTech1', 'Civic1', 'Security2']);
    fireEvent.click(options[3]);
    expect(cardTitles()).toEqual(['Problem 3 title', 'Problem 4 title']);
    expect(screen.getByRole('button', { name: /Filter by track: Security/ })).toBeTruthy();
    await waitFor(() => expect(window.location.search).toContain('track=Security'));
  });

  it('offers Clear filters only while something is filtered, and clears everything', async () => {
    renderExplorer();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    choose(/Filter by track/, /Security/);
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(cardTitles()).toHaveLength(4));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('filters by track with the coloured chips, which show a count, and toggles back with a second click', () => {
    renderExplorer();
    const chips = within(screen.getByRole('group', { name: 'Tracks' }));
    expect(chips.getAllByRole('button').map((chip) => chip.textContent)).toEqual(['All tracks 4', 'EdTech1', 'Civic1', 'Security2']);
    fireEvent.click(chips.getByRole('button', { name: /Security/ }));
    expect(cardTitles()).toEqual(['Problem 3 title', 'Problem 4 title']);
    expect(chips.getByRole('button', { name: /Security/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chips.getByRole('button', { name: /Security/ }));
    expect(cardTitles()).toHaveLength(4);
  });

  it('restores filters and sort from the URL', async () => {
    window.history.replaceState(null, '', '/hackathons/demo?track=Security&sort=code&dir=desc');
    renderExplorer();
    await waitFor(() => expect(cardTitles()).toEqual(['Problem 4 title', 'Problem 3 title']));
    expect(screen.getByRole('button', { name: /Sorted descending/ })).toBeTruthy();
  });

  it('sorts from the Sort list and reverses with the direction button', () => {
    renderExplorer();
    choose(/Sort problem statements/, /Title/);
    expect(cardTitles()).toEqual(['Problem 1 title', 'Problem 2 title', 'Problem 3 title', 'Problem 4 title']);
    expect(screen.queryAllByRole('region')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Sorted ascending/ }));
    expect(cardTitles()).toEqual(['Problem 4 title', 'Problem 3 title', 'Problem 2 title', 'Problem 1 title']);
    expect(screen.getByRole('button', { name: /Sorted descending/ })).toBeTruthy();
  });

  it('shows the first 25 cards and adds more on request, starting over when the filter changes', () => {
    const many = Array.from({ length: 60 }, (_, i) => ps(i + 1, { domain: i % 2 ? 'Civic' : 'EdTech' }));
    renderExplorer(many);
    expect(cards()).toHaveLength(25);
    expect(screen.getByRole('status').textContent).toContain('Showing 25 of 60');

    fireEvent.click(screen.getByRole('button', { name: 'Show 25 more (35 left)' }));
    expect(cards()).toHaveLength(50);
    fireEvent.click(screen.getByRole('button', { name: 'Show 10 more (10 left)' }));
    expect(cards()).toHaveLength(60);
    expect(screen.queryByRole('button', { name: /Show .* more/ })).toBeNull();

    choose(/Filter by track/, /Civic/);
    expect(cards()).toHaveLength(25);
    expect(screen.getByRole('button', { name: 'Show 5 more (5 left)' })).toBeTruthy();
  });

  it('opens the full details when a card is clicked and pins the select action', () => {
    renderExplorer();
    fireEvent.click(cards()[2]);
    const dialog = screen.getByRole('dialog', { name: 'Problem 3 title' });
    expect(within(dialog).getByRole('link', { name: /Select this Statement/ }).getAttribute('href')).toBe('/hackathons/demo/dashboard?ps=3');
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the details from View Full Details without also treating it as a card click', () => {
    renderExplorer();
    fireEvent.click(within(cards()[2]).getByRole('button', { name: /View full details/ }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('does not offer selection for a full problem', () => {
    renderExplorer();
    fireEvent.click(cards()[1]);
    expect(screen.queryByRole('link', { name: /Select this Statement/ })).toBeNull();
  });

  it('moves between problems inside the dialog, in the order of the list, with a position count', () => {
    renderExplorer();
    fireEvent.click(cards()[1]);
    const dialog = () => screen.getByRole('dialog');
    expect(within(dialog()).getByText('2 of 4')).toBeTruthy();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Next problem' }));
    expect(screen.getByRole('dialog', { name: 'Problem 3 title' })).toBeTruthy();
    expect(within(dialog()).getByText('3 of 4')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByRole('dialog', { name: 'Problem 4 title' })).toBeTruthy();
    expect((within(dialog()).getByRole('button', { name: 'Next problem' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Previous problem' }));
    expect(screen.getByRole('dialog', { name: 'Problem 2 title' })).toBeTruthy();
  });

  it('keeps the dialog navigation within the current filter', () => {
    renderExplorer();
    choose(/Filter by track/, /Security/);
    fireEvent.click(cards()[0]);
    expect(within(screen.getByRole('dialog')).getByText('1 of 2')).toBeTruthy();
    expect((within(screen.getByRole('dialog')).getByRole('button', { name: 'Previous problem' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('writes the open problem to the address and opens it again from a shared link', async () => {
    const { unmount } = renderExplorer();
    fireEvent.click(cards()[2]);
    await waitFor(() => expect(window.location.search).toContain('problem=PS-003'));
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(window.location.search).not.toContain('problem='));
    unmount();

    window.history.replaceState(null, '', '/hackathons/demo?problem=ps-004');
    renderExplorer();
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Problem 4 title' })).toBeTruthy());
  });

  it('copies a link to the problem from the card and from the dialog', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderExplorer();
    fireEvent.click(within(cards()[2]).getByRole('button', { name: /Copy link: PS-003/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toMatch(/\?problem=PS-003#problems$/);
    await waitFor(() => expect(within(cards()[2]).getByRole('button', { name: /Link copied: PS-003/ })).toBeTruthy());

    fireEvent.click(cards()[3]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Copy link/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).toMatch(/problem=PS-004/);
  });

  it('says so when the link cannot be copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    renderExplorer();
    fireEvent.click(within(cards()[0]).getByRole('button', { name: /Copy link: PS-001/ }));
    await waitFor(() => expect(within(cards()[0]).getByRole('button', { name: /Copy failed: PS-001/ })).toBeTruthy());
  });

  it('suggests tracks from the empty state', async () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.getByText(/Nothing matches "zzz"/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Civic' }));
    await waitFor(() => expect(cardTitles()).toEqual(['Problem 2 title']));
    expect((screen.getByLabelText('Search problem statements') as HTMLInputElement).value).toBe('');
  });

  it('shows the empty state and resets from it', async () => {
    renderExplorer();
    fireEvent.change(screen.getByLabelText('Search problem statements'), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.getByText('No matching problem statements found.')).toBeTruthy());
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));
    await waitFor(() => expect(cardTitles()).toHaveLength(4));
  });
});
