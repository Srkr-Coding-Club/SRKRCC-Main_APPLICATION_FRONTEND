import React, { useRef, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TriggerConfig = Record<string, ((trigger: { isActive: boolean }) => void) | string | undefined>;

const gsapMock = vi.hoisted(() => {
  const state = { paused: true, progress: 0 };
  const timeline = {
    restart: vi.fn(),
    pause: vi.fn(),
    paused: () => state.paused,
    progress: () => state.progress,
  };
  return {
    state,
    timeline,
    revert: vi.fn(),
    timelineFactory: vi.fn(() => timeline),
    create: vi.fn(),
    refresh: vi.fn(),
  };
});

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    timeline: gsapMock.timelineFactory,
    context: (fn: () => void) => {
      fn();
      return { revert: gsapMock.revert };
    },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { create: gsapMock.create, refresh: gsapMock.refresh } }));

import { useScrollEntrance, useScrollEntranceWithin } from '../useScrollEntrance';

const build = vi.fn();
const triggerConfig = (call = 0) => gsapMock.create.mock.calls[call][0] as TriggerConfig;
const fire = (call: number, name: string, trigger = { isActive: false }) => (triggerConfig(call)[name] as (t: { isActive: boolean }) => void)(trigger);
const delayOf = (call: number) => (gsapMock.timelineFactory.mock.calls[call] as unknown as [{ delay: number }])[0].delay;

function Card({ index = 0, triggerClosest, replay }: { index?: number; triggerClosest?: string; replay?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollEntrance(ref, build, { index, delay: 0.3, triggerClosest, replay });
  return <div ref={ref} data-testid="card" />;
}

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  vi.clearAllMocks();
  gsapMock.state.paused = true;
  gsapMock.state.progress = 0;
  setReducedMotion(false);
});
afterEach(() => cleanup());

describe('useScrollEntrance', () => {
  it('hides the card up front and plays the timeline when it scrolls into view', () => {
    render(<Card />);
    expect(build).toHaveBeenCalledWith(gsapMock.timeline, expect.any(HTMLElement));
    expect(gsapMock.timelineFactory.mock.calls[0]).toEqual([expect.objectContaining({ paused: true })]);
    expect(triggerConfig()).toMatchObject({ start: 'top 88%', end: 'bottom top' });
    expect(gsapMock.timeline.restart).not.toHaveBeenCalled();
    fire(0, 'onEnter');
    expect(gsapMock.timeline.restart).toHaveBeenCalledWith(true);
  });

  it('plays again when scrolling back up into the card, and rewinds once it has left in either direction', () => {
    render(<Card />);
    fire(0, 'onLeave');
    expect(gsapMock.timeline.pause).toHaveBeenLastCalledWith(0);
    fire(0, 'onEnterBack');
    expect(gsapMock.timeline.restart).toHaveBeenCalledTimes(1);
    fire(0, 'onLeaveBack');
    expect(gsapMock.timeline.pause).toHaveBeenCalledTimes(2);
  });

  it('plays only the first time when replay is off', () => {
    render(<Card replay={false} />);
    expect(triggerConfig().onEnterBack).toBeUndefined();
    expect(triggerConfig().onLeave).toBeUndefined();
    expect(triggerConfig().onLeaveBack).toBeUndefined();
  });

  it('plays when a refresh finds the card already inside its range, but not while it is already playing', () => {
    render(<Card />);
    fire(0, 'onRefresh', { isActive: true });
    expect(gsapMock.timeline.restart).toHaveBeenCalledTimes(1);

    gsapMock.state.paused = false;
    fire(0, 'onRefresh', { isActive: true });
    expect(gsapMock.timeline.restart).toHaveBeenCalledTimes(1);
  });

  it('ignores a refresh while the card is outside its range', () => {
    render(<Card />);
    fire(0, 'onRefresh', { isActive: false });
    expect(gsapMock.timeline.restart).not.toHaveBeenCalled();
  });

  it('staggers by index, adds the extra delay, and stops staggering past the limit', () => {
    render(<Card index={2} />);
    expect(delayOf(0)).toBeCloseTo(0.48);
    cleanup();
    render(<Card index={40} />);
    expect(delayOf(1)).toBeCloseTo(0.75);
  });

  it('does nothing under prefers-reduced-motion, so the content stays visible', () => {
    setReducedMotion(true);
    render(<Card />);
    expect(build).not.toHaveBeenCalled();
    expect(gsapMock.create).not.toHaveBeenCalled();
  });

  it('watches a named ancestor when the card itself is moved by a parent', () => {
    const { getByTestId } = render(
      <div data-scope>
        <Card triggerClosest="[data-scope]" />
      </div>,
    );
    expect(triggerConfig()).toMatchObject({ trigger: getByTestId('card').closest('[data-scope]') });
  });

  it('reverts the animation when the card unmounts', () => {
    render(<Card />);
    cleanup();
    expect(gsapMock.revert).toHaveBeenCalledTimes(1);
  });
});

function Page({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState(false);
  useScrollEntranceWithin(ref, 'section.panel', build, { enabled });
  return (
    <div ref={ref}>
      <section className="panel" />
      <section className="panel" />
      <div className="panel" />
      {extra && <section className="panel" />}
      <button type="button" onClick={() => setExtra(true)}>
        load more
      </button>
    </div>
  );
}

describe('useScrollEntranceWithin', () => {
  it('sets up every matching element on first render, staggered in order', () => {
    render(<Page />);
    expect(gsapMock.create).toHaveBeenCalledTimes(2);
    expect(delayOf(0)).toBeCloseTo(0);
    expect(delayOf(1)).toBeCloseTo(0.09);
  });

  it('also picks up an element that renders later, without delay', async () => {
    const { getByText } = render(<Page />);
    await act(async () => {
      getByText('load more').click();
    });
    expect(gsapMock.create).toHaveBeenCalledTimes(3);
    expect(delayOf(2)).toBeCloseTo(0);
  });

  it('does nothing until enabled', () => {
    render(<Page enabled={false} />);
    expect(gsapMock.create).not.toHaveBeenCalled();
  });

  it('reverts every element when the page unmounts', () => {
    render(<Page />);
    cleanup();
    expect(gsapMock.revert).toHaveBeenCalledTimes(2);
  });
});
