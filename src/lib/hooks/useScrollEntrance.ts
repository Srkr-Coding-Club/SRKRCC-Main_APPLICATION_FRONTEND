'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ENTRANCE_STAGGER_LIMIT, ENTRANCE_STAGGER_SECONDS, prefersReducedMotion } from '@/lib/entranceMotion';

gsap.registerPlugin(ScrollTrigger);

interface ScrollEntranceOptions {
  /** Position in a list; later cards start a little after earlier ones. */
  index?: number;
  /** Extra seconds before the timeline starts, e.g. to follow a parent's own entrance. */
  delay?: number;
  /** ScrollTrigger start, "<element edge> <viewport edge>". */
  start?: string;
  /** CSS selector of an ancestor to watch instead of the element, when the element itself is moved or scaled by a parent. */
  triggerClosest?: string;
  /** Play again each time the element comes back into view, scrolling up or down. False plays only the first time. */
  replay?: boolean;
}

const LAYOUT_REFRESH_DEBOUNCE_MS = 120;
let layoutWatchers = 0;
let layoutObserver: ResizeObserver | null = null;
let layoutRefreshTimer = 0;

/**
 * Scroll positions are measured once, so content that loads or appears later (data, images, a new panel) would leave every
 * trigger below it stale and an element in view could be taken for one already scrolled past. One shared observer re-measures
 * whenever the page height changes.
 */
function watchPageHeight(): () => void {
  if (typeof ResizeObserver === 'undefined') return () => undefined;
  if (layoutWatchers++ === 0) {
    let lastHeight = document.documentElement.scrollHeight;
    layoutObserver = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      if (height === lastHeight) return;
      lastHeight = height;
      window.clearTimeout(layoutRefreshTimer);
      layoutRefreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), LAYOUT_REFRESH_DEBOUNCE_MS);
    });
    layoutObserver.observe(document.body);
  }
  return () => {
    if (--layoutWatchers > 0) return;
    layoutObserver?.disconnect();
    layoutObserver = null;
    window.clearTimeout(layoutRefreshTimer);
  };
}

type BuildEntrance = (timeline: gsap.core.Timeline, element: HTMLElement) => void;

/**
 * Sets up one element's entrance and returns a function that undoes it.
 * Selectors passed to the timeline are scoped to the element. The element is hidden at once (before paint) and plays when it
 * enters the viewport; with `replay` it rewinds after leaving, so scrolling back up plays it again.
 * Under prefers-reduced-motion nothing is hidden or animated, so the content is simply there.
 */
export function createScrollEntrance(
  element: HTMLElement,
  build: BuildEntrance,
  { index = 0, delay = 0, start = 'top 88%', triggerClosest, replay = true }: ScrollEntranceOptions = {},
): () => void {
  if (prefersReducedMotion()) return () => undefined;

  const context = gsap.context(() => {
    const timeline = gsap.timeline({
      paused: true,
      delay: Math.min(index, ENTRANCE_STAGGER_LIMIT) * ENTRANCE_STAGGER_SECONDS + delay,
      defaults: { ease: 'power3.out' },
    });
    build(timeline, element);

    const play = () => timeline.restart(true);
    const rewind = () => timeline.pause(0);
    ScrollTrigger.create({
      trigger: (triggerClosest && element.closest<HTMLElement>(triggerClosest)) || element,
      start,
      end: 'bottom top',
      onEnter: play,
      onEnterBack: replay ? play : undefined,
      onLeave: replay ? rewind : undefined,
      onLeaveBack: replay ? rewind : undefined,
      // A page opened part-way down (or restored to a scroll position) is already inside the range without crossing its start.
      onRefresh: (trigger) => {
        if (trigger.isActive && timeline.paused() && timeline.progress() === 0) play();
      },
    });
  }, element);

  // Images and fonts shift the page after first paint, so measure the trigger positions again.
  const refresh = () => ScrollTrigger.refresh();
  const frame = window.requestAnimationFrame(refresh);
  const pendingLoad = document.readyState !== 'complete';
  if (pendingLoad) window.addEventListener('load', refresh, { once: true });
  const stopWatchingHeight = watchPageHeight();

  return () => {
    window.cancelAnimationFrame(frame);
    if (pendingLoad) window.removeEventListener('load', refresh);
    stopWatchingHeight();
    context.revert();
  };
}

/** One element's entrance, set up when it mounts. Later changes to `build`, `index` or `delay` do not replay it. */
export function useScrollEntrance<T extends HTMLElement>(
  ref: RefObject<T | null>,
  build: BuildEntrance,
  { index = 0, delay = 0, start = 'top 88%', triggerClosest, replay = true }: ScrollEntranceOptions = {},
) {
  const latest = useRef({ build, index, delay });
  latest.current = { build, index, delay };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    return createScrollEntrance(element, (timeline, target) => latest.current.build(timeline, target), {
      index: latest.current.index,
      delay: latest.current.delay,
      start,
      triggerClosest,
      replay,
    });
  }, [ref, start, triggerClosest, replay]);
}

/**
 * The same entrance for every element under `ref` that matches `selector`, including ones that appear later
 * (a panel that only renders once its data loads). The panels present on first render stagger; late ones start at once.
 * Set `enabled` to false until `ref` is attached.
 */
export function useScrollEntranceWithin<T extends HTMLElement>(
  ref: RefObject<T | null>,
  selector: string,
  build: BuildEntrance,
  { start = 'top 90%', replay = true, enabled = true }: Pick<ScrollEntranceOptions, 'start' | 'replay'> & { enabled?: boolean } = {},
) {
  const latestBuild = useRef(build);
  latestBuild.current = build;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;

    const attached = new Map<Element, () => void>();
    const attach = (element: Element, index: number) => {
      if (attached.has(element) || !(element instanceof HTMLElement)) return;
      attached.set(
        element,
        createScrollEntrance(element, (timeline, target) => latestBuild.current(timeline, target), { index, start, replay }),
      );
    };
    const detach = (element: Element) => {
      attached.get(element)?.();
      attached.delete(element);
    };

    root.querySelectorAll(selector).forEach((element, index) => attach(element, index));

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(selector)) attach(node, 0);
          node.querySelectorAll(selector).forEach((element) => attach(element, 0));
        });
        record.removedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          [node, ...Array.from(node.querySelectorAll(selector))].forEach((element) => {
            if (attached.has(element) && !root.contains(element)) detach(element);
          });
        });
      });
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      attached.forEach((cleanup) => cleanup());
      attached.clear();
    };
  }, [ref, selector, start, replay, enabled]);
}
