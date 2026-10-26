"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, Calendar, Clock } from "lucide-react";

import { Form } from "@/lib/types";
import { normalizeImageUrl } from "@/lib/utils";

interface FormCardProps {
  form: Form;
  isUpcoming: boolean;
  index: number;
}

export default function FormCard({
  form,
  isUpcoming,
  index,
}: FormCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  /*
   * ENTRY ANIMATION (all new)
   * 1. glass shell fades in
   * 2. the cover image is "unveiled" with a top-to-bottom clip wipe
   *    while the picture inside settles from a slight zoom
   * 3. chips pop in, title rises out of a mask
   * 4. the schedule timeline draws itself: line grows, dots pop, text follows
   * 5. footer button slides up last
   * Honors prefers-reduced-motion.
   */
  useLayoutEffect(() => {
    if (!cardRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        delay: index * 0.09,
        defaults: { ease: "power3.out" },
      });

      tl.fromTo(
        ".fc-shell",
        { opacity: 0 },
        { opacity: 1, duration: 0.45, clearProps: "opacity" },
      );

      tl.fromTo(
        ".fc-media",
        { clipPath: "inset(0% 0% 100% 0% round 18px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 18px)",
          duration: 0.9,
          ease: "power3.inOut",
          clearProps: "clipPath",
        },
        "-=0.25",
      );

      tl.fromTo(
        ".fc-img",
        { scale: 1.18 },
        { scale: 1, duration: 1.2, clearProps: "transform" },
        "<",
      );

      tl.fromTo(
        [tagRef.current, ".fc-status"],
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.45,
          stagger: 0.08,
          ease: "back.out(1.6)",
          clearProps: "transform",
        },
        "-=0.5",
      );

      tl.fromTo(
        titleRef.current,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.6, clearProps: "transform" },
        "-=0.25",
      );

      tl.fromTo(
        ".fc-desc",
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.35",
      );

      tl.fromTo(
        ".fc-line",
        { scaleY: 0 },
        { scaleY: 1, duration: 0.6, ease: "power2.inOut", clearProps: "transform" },
        "-=0.3",
      );

      tl.fromTo(
        ".fc-dot",
        { scale: 0 },
        {
          scale: 1,
          duration: 0.4,
          stagger: 0.25,
          ease: "back.out(2)",
          clearProps: "transform",
        },
        "<",
      );

      tl.fromTo(
        ".fc-step",
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, stagger: 0.2, clearProps: "transform" },
        "<0.05",
      );

      tl.fromTo(
        footerRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, clearProps: "transform" },
        "-=0.3",
      );
    }, cardRef);

    return () => ctx.revert();
  }, [index]);

  /*
   * Uses form image when available.
   * Falls back to your uploaded document icon image.
   */
  const backgroundImage = normalizeImageUrl(form.image_url) || "/Form.png";
  const hasImage = Boolean(normalizeImageUrl(form.image_url));

  const formattedOpen = form.open_at
    ? new Date(form.open_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  const formattedClose = form.close_at
    ? new Date(form.close_at).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  const formattedOpenTime = form.open_at
    ? new Date(form.open_at).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const formattedCloseTime = form.close_at
    ? new Date(form.close_at).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const footerLabel = isUpcoming
    ? formattedOpen
      ? `Opens ${formattedOpen}`
      : "Opening soon"
    : formattedClose
      ? `Closes ${formattedClose}`
      : "Open now";

  return (
    <div ref={cardRef} className="h-full w-full pb-4 pt-1 sm:pb-6 sm:pt-2">
      <article
        className={[
          "fc-shell group relative flex h-full flex-col overflow-hidden rounded-[28px] p-2",
          "border border-journey-text/10 bg-journey-surface/60 backdrop-blur-sm",
          "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)]",
          "transition-shadow duration-500 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_26px_55px_-26px_rgba(255,122,0,0.28)]",
          "dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)]",
          "dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_26px_55px_-26px_rgba(255,122,0,0.18)]",
        ].join(" ")}
      >
        {/* ambient theme glow behind everything */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#FF7A00]/10 blur-3xl dark:bg-[#FF7A00]/[0.07]" />

        {/* ========================================= */}
        {/* COVER - rounded image with overlays        */}
        {/* ========================================= */}

        <div className="fc-media relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[20px] bg-slate-200/60 dark:bg-slate-800/60">
          {/* The cover clips the image to its own rounded corners. */}
          <div className="absolute inset-0">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backgroundImage}
                alt={form.title}
                className="fc-img h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="fc-img h-full w-full bg-gradient-to-br from-[#FFF1E2] to-[#FFE0C2] dark:from-slate-800 dark:to-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backgroundImage}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
            )}
          </div>

          {/* soft top fade so the chips stay legible on any photo */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

          {/* plain bottom gradient (no blur) so the title stays readable */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

          {/* category chip, top-left: translucent orange */}
          <div
            ref={tagRef}
            className="absolute left-2 top-2 max-w-[55%] truncate rounded-full bg-journey-accent px-3 py-1 text-xs font-semibold text-journey-on-accent shadow-md"
          >
            {form.category || "Registration"}
          </div>

          {/* status chip, top-right: translucent green (open) / yellow (upcoming) */}
          <div
            className={[
              "fc-status absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-md",
              isUpcoming
                ? "bg-amber-400 text-slate-900"
                : "bg-emerald-600 text-white",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 shrink-0 rounded-full",
                isUpcoming ? "bg-slate-900" : "bg-white",
              ].join(" ")}
            />
            {isUpcoming ? "Upcoming" : "Open now"}
          </div>

          {/* title stays legible over the cover image */}
          <div className="absolute inset-x-4 bottom-3.5 z-10">
            <div className="overflow-hidden">
              <div ref={titleRef}>
                <h2 className="line-clamp-2 font-display text-lg font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.85)] sm:text-xl">
                  {form.title}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* BODY - description, timeline, button      */}
        {/* all share the same left and right edges   */}
        {/* ========================================= */}

        <div className="flex flex-1 flex-col px-5 pb-4 pt-4 sm:px-6">
          <p className="fc-desc line-clamp-3 font-display text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {form.description}
          </p>

          {/* schedule timeline: opens -> closes */}
          <ol className="relative mt-5 grid gap-4 pl-6">
            <li className="fc-step relative">
              {/* line runs from this dot down to the next one */}
              <span
                aria-hidden
                className="fc-line absolute -bottom-[26px] -left-[19px] top-[10px] w-px origin-top bg-gradient-to-b from-[#FF7A00] to-slate-300 dark:to-white/20"
              />
              <span
                aria-hidden
                className="fc-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-[#FF7A00] bg-white dark:bg-slate-900"
              />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isUpcoming ? "Opens" : "Opened"}
              </p>
              <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-journey-accent" />
                  {formattedOpen || "Open now"}
                </span>
                {formattedOpenTime ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm leading-none text-slate-600 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {formattedOpenTime}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            </li>

            <li className="fc-step relative">
              <span
                aria-hidden
                className="fc-dot absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-slate-300 bg-white dark:border-white/30 dark:bg-slate-900"
              />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Closes
              </p>
              <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-journey-accent" />
                  {formattedClose || "No deadline"}
                </span>
                {formattedCloseTime ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm leading-none text-slate-600 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {formattedCloseTime}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            </li>
          </ol>

          {/* footer action: full width, same edges as the text above */}
          <div ref={footerRef} className="mt-auto pt-6">
            <Link
              href={`/forms/${form.slug}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-journey-accent px-4 py-2.5 text-center text-sm font-semibold text-journey-on-accent shadow-[0_8px_18px_-8px_rgba(255,122,0,0.6)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.97]"
            >
              {isUpcoming ? "View Schedule" : "Fill Form"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}