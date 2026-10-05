'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import IntroHud from './IntroHud';
import { CHROME_MANAGED_ATTR, CINEMA_ATTR, markIntroSeen, shouldPlayIntro } from './introEligibility';
import { clamp } from './introMath';
import { LAUNCH, phaseIndexAt } from './timeline';
import { detectQuality } from './webgl/quality';
import type { IntroScene } from './webgl/createIntroScene';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const NAVBAR_HEIGHT_PX = 64;
const SCROLL_DISTANCE = '+=280%';
const DONE_PROGRESS = 0.999;
const LOADER_DELAY_MS = 300;
const LOADER_CELLS = 10;
const CUE_DELAY_S = 1.8;
const TILT_RANGE_DEG = 30;
const TILT_REST_BETA_DEG = 45;
const LAYOUT_SETTLE_MS = 150;

/* Device-tilt look-around only where it needs no permission prompt (iOS requires one). */
function canUseTilt() {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const needsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';
  return !needsPermission && window.matchMedia('(pointer: coarse)').matches;
}

/* Cinema mode hides the navbar and announcement banner (see globals.css). */
function setCinema(on: boolean) {
  document.documentElement.toggleAttribute(CINEMA_ATTR, on);
}

/* ------------------------------------------------------------------ */
/* A cinematic entry into the SRKR intelligence core, pinned over the */
/* hero. The WebGL world (./webgl) owns the camera and render loop;   */
/* this component owns scroll, the HUD, skipping and the handoff: as  */
/* the camera passes into the core, light fills the frame and the     */
/* page - emblem, headline, actions - emerges from it.                */
/*                                                                    */
/* The hero (`children`) is always in the DOM and painted underneath, */
/* so SEO and LCP are unaffected; see introEligibility for who skips. */
/* ------------------------------------------------------------------ */
export default function HeroIntro({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const skipIntroRef = useRef<() => void>(() => {});
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!shouldPlayIntro()) {
      setCinema(false);
      setEnabled(false);
      return;
    }
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const hud = root?.querySelector<HTMLElement>('[data-intro="hud"]');
    const loader = root?.querySelector<HTMLElement>('[data-intro="loader"]');
    const loaderBar = root?.querySelector<HTMLElement>('[data-intro="loader-bar"]');
    const loaderPercent = root?.querySelector<HTMLElement>('[data-intro="loader-percent"]');
    if (!root || !canvas || !hud || !loader || !loaderBar || !loaderPercent) return;

    const html = document.documentElement;
    html.setAttribute(CHROME_MANAGED_ATTR, '');
    setCinema(true);

    let scene: IntroScene | null = null;
    let running = false;
    let disposed = false;
    let target = 0;
    let cinema = true;
    let done = false;
    let phase = 0;

    const ctx = gsap.context(() => {
      /* The handoff, positioned in scroll progress (0-1) and played by the damped progress. */
      const handoff = gsap
        .timeline({ paused: true, defaults: { ease: 'none' } })
        .to('[data-intro="cue"]', { autoAlpha: 0, y: 8, duration: 0.04 }, 0.01)
        .to('[data-intro="hud"]', { autoAlpha: 0, duration: 0.03 }, 0.86)
        .fromTo(
          '[data-intro="wash"]',
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: LAUNCH.lightFull - LAUNCH.shellCrossing, ease: 'power1.in' },
          LAUNCH.shellCrossing,
        )
        .to('[data-intro="stage"], [data-intro="bleed"]', { autoAlpha: 0, duration: 0.012 }, LAUNCH.lightFull + 0.005)
        .fromTo('[data-intro="tagline"]', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, LAUNCH.taglineIn)
        .to('[data-intro="tagline"]', { autoAlpha: 0, y: -36, duration: 0.011, ease: 'power2.in' }, LAUNCH.taglineOut)
        .to('[data-intro="wash"]', { autoAlpha: 0, duration: 0.04, ease: 'power2.out' }, LAUNCH.pageEmerges)
        .fromTo(
          '[data-hero-emblem]',
          { '--intro-scale': 1.5, '--intro-filter': 'brightness(2.6) blur(10px)' },
          { '--intro-scale': 1, '--intro-filter': 'brightness(1) blur(0px)', duration: 0.045, ease: 'power2.out' },
          LAUNCH.pageEmerges - 0.005,
        )
        .fromTo(
          '[data-hero-title]',
          { '--intro-scale': 1.18, '--intro-filter': 'blur(12px)' },
          { '--intro-scale': 1, '--intro-filter': 'blur(0px)', duration: 0.035, ease: 'power3.out' },
          LAUNCH.pageEmerges + 0.005,
        )
        .fromTo(
          '[data-hero-reveal]',
          { '--intro-rise': '32px', '--intro-filter': 'opacity(0) blur(6px)' },
          { '--intro-rise': '0px', '--intro-filter': 'opacity(1) blur(0px)', duration: 0.02, stagger: 0.004, ease: 'power2.out' },
          LAUNCH.pageEmerges + 0.01,
        )
        .set('[data-hero-emblem], [data-hero-title], [data-hero-reveal]', { '--intro-filter': 'none' }, 1);

      const syncFrame = (progress: number) => {
        handoff.progress(progress);
        const nextPhase = phaseIndexAt(progress);
        if (nextPhase !== phase) {
          phase = nextPhase;
          hud.dataset.phase = String(phase);
        }
        const nextCinema = progress < LAUNCH.pageEmerges;
        if (nextCinema !== cinema) {
          cinema = nextCinema;
          setCinema(cinema);
        }
        const nextDone = progress >= DONE_PROGRESS;
        if (nextDone !== done) {
          done = nextDone;
          root.dataset.introDone = String(done);
          if (skipRef.current) skipRef.current.dataset.introDone = String(done);
          if (done) markIntroSeen();
        }
        if (done && running && target >= DONE_PROGRESS) {
          running = false;
          scene?.setActive(false);
        }
      };

      const wake = () => {
        if (scene && !running && target < DONE_PROGRESS) {
          running = true;
          scene.setActive(true);
        }
      };

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: `top ${NAVBAR_HEIGHT_PX}px`,
        end: SCROLL_DISTANCE,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          target = self.progress;
          scene?.setTargetProgress(target);
          wake();
        },
      });
      target = trigger.progress;

      skipIntroRef.current = () => {
        target = 1;
        window.scrollTo({ top: trigger.end, behavior: 'instant' });
        if (scene) scene.jumpTo(1);
        else syncFrame(1);
      };

      /* Loading: a quiet system readout, only if loading takes long enough to notice. */
      const loaderTimer = window.setTimeout(() => {
        if (!scene) gsap.to(loader, { autoAlpha: 1, duration: 0.4, overwrite: true });
      }, LOADER_DELAY_MS);
      const showLoadProgress = (fraction: number) => {
        const filled = Math.round(fraction * LOADER_CELLS);
        loaderBar.textContent = '█'.repeat(filled) + '░'.repeat(LOADER_CELLS - filled);
        loaderPercent.textContent = `${Math.round(fraction * 100)}%`;
      };

      const fallBackToPlainHero = () => {
        handoff.progress(1);
        trigger.kill();
        setCinema(false);
        setEnabled(false);
      };

      import('./webgl/createIntroScene')
        .then(({ createIntroScene }) =>
          createIntroScene(canvas, { quality: detectQuality(), onLoadProgress: showLoadProgress, onFrame: syncFrame }),
        )
        .then((created) => {
          if (disposed) {
            created.destroy();
            return;
          }
          scene = created;
          window.clearTimeout(loaderTimer);
          gsap.to(loader, { autoAlpha: 0, duration: 0.3, overwrite: true });
          gsap.fromTo('[data-intro="cue-text"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, delay: CUE_DELAY_S });
          if (target >= DONE_PROGRESS) scene.jumpTo(1);
          else scene.setTargetProgress(target);
          running = true;
          scene.setActive(true);
        })
        .catch(() => {
          if (!disposed) fallBackToPlainHero();
        });

      return () => window.clearTimeout(loaderTimer);
    }, root);

    /* Looking around: a small glance with the mouse, or by tilting a phone. */
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || done) return;
      scene?.setLook((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    const onTilt = (event: DeviceOrientationEvent) => {
      if (done || event.gamma === null || event.beta === null) return;
      scene?.setLook(clamp(event.gamma / TILT_RANGE_DEG, -1, 1), clamp((event.beta - TILT_REST_BETA_DEG) / TILT_RANGE_DEG, -1, 1));
    };
    const tilt = canUseTilt();
    window.addEventListener('pointermove', onPointerMove);
    if (tilt) window.addEventListener('deviceorientation', onTilt);

    // Keyboard users who tab into the hero, or press Escape, go straight to the page.
    const hero = root.querySelector<HTMLElement>('[data-intro="hero"]');
    const onHeroFocus = () => {
      if (!done) skipIntroRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !done) skipIntroRef.current();
    };
    hero?.addEventListener('focusin', onHeroFocus);
    document.addEventListener('keydown', onKeyDown);

    // Content above the hero (e.g. a dismissed announcement) shifts the pin start.
    let settleTimer = 0;
    const layoutObserver = new ResizeObserver(() => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => ScrollTrigger.refresh(), LAYOUT_SETTLE_MS);
    });
    layoutObserver.observe(document.body);

    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
      layoutObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      if (tilt) window.removeEventListener('deviceorientation', onTilt);
      hero?.removeEventListener('focusin', onHeroFocus);
      document.removeEventListener('keydown', onKeyDown);
      ctx.revert();
      scene?.destroy();
      skipIntroRef.current = () => {};
      setCinema(false);
      html.removeAttribute(CHROME_MANAGED_ATTR);
    };
  }, []);

  return (
    <>
      {/* Outside the pinned root: pinning transforms the root, which would trap a fixed child. */}
      {enabled && (
        <button
          ref={skipRef}
          type="button"
          onClick={() => skipIntroRef.current()}
          className="fixed bottom-5 right-5 z-30 flex min-h-[40px] items-center gap-2.5 rounded-full border border-white/10 bg-[#0D0E15]/70 px-4 text-[13px] text-[#A6B0C3] backdrop-blur-md transition-colors hover:border-[#FFA500]/40 hover:text-[#F5F5F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500] motion-reduce:hidden data-[intro-done=true]:invisible sm:bottom-8 sm:right-10"
        >
          Skip intro
          <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#64748B] [@media(hover:hover)]:inline">Esc</kbd>
        </button>
      )}

      <div
        ref={rootRef}
        className="group/intro relative"
        style={{ '--navbar-offset': `${NAVBAR_HEIGHT_PX}px` } as React.CSSProperties}
      >
        <div data-intro="hero" className="relative">
          {children}
        </div>

        {enabled && (
          <>
            {/* Dark bleed above the stage, so the hidden navbar and banner leave no gap. */}
            <div
              data-intro="bleed"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-full z-20 h-[100vh] bg-[#0D0E15] motion-reduce:hidden group-data-[intro-done=true]/intro:invisible"
            />

            {/* The stage runs up under the hidden navbar so the world fills the screen edge to edge. */}
            <div
              data-intro="stage"
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 top-[calc(var(--navbar-offset)*-1)] z-20 overflow-hidden bg-[#0D0E15] motion-reduce:hidden group-data-[intro-done=true]/intro:invisible"
            >
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

              <IntroHud />

              <div
                data-intro="loader"
                className="invisible absolute inset-x-0 bottom-14 flex items-center justify-center gap-3 font-mono text-[11px] text-[#64748B] opacity-0"
              >
                <span className="text-[#94A3B8]">Initializing experience</span>
                <span data-intro="loader-bar" className="tracking-[-0.05em] text-[#FFA500]/70">
                  ░░░░░░░░░░
                </span>
                <span data-intro="loader-percent" className="w-8 tabular-nums">
                  0%
                </span>
              </div>

              <div data-intro="cue" className="absolute inset-x-0 bottom-16 flex justify-center sm:bottom-12">
                <span data-intro="cue-text" className="flex flex-col items-center gap-3 text-[13px] text-[#94A3B8] opacity-0">
                  Scroll to enter
                  <span className="h-8 w-px origin-top bg-gradient-to-b from-[#FFA500]/70 to-transparent animate-[introCue_2.4s_ease-in-out_infinite]" />
                </span>
              </div>
            </div>

            {/* The handoff: light fills the frame as the camera enters the core, and the page emerges from it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 top-[calc(var(--navbar-offset)*-1)] z-30 motion-reduce:hidden group-data-[intro-done=true]/intro:invisible"
            >
              <div
                data-intro="wash"
                className="invisible absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,#FFF8F0_0%,#FFD39A_26%,#FF7A00_58%,#8B2E3B_100%)] opacity-0"
              />
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <p
                  data-intro="tagline"
                  className="invisible text-center font-display text-[clamp(2.6rem,7.6vw,6rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-[#2A0F0A] opacity-0 [font-stretch:112%]"
                >
                  Building coders.
                  <br />
                  Creating innovators.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
