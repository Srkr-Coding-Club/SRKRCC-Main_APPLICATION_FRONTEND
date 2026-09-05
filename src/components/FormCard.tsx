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
   * ENTRY ANIMATION
   * index gives the one-by-one stagger effect.
   * Tag slides in from the right, title slides in from the left,
   * the panel pops up off the poster.
   */
  useLayoutEffect(() => {
    if (!cardRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: index * 0.1 });

      tl.fromTo(
        cardRef.current,
        { x: 90, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
      );

      tl.fromTo(
        tagRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
        "-=0.35",
      );

      tl.fromTo(
        titleRef.current,
        { x: -24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
        "-=0.4",
      );

      tl.fromTo(
        footerRef.current,
        { y: 24, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" },
        "-=0.3",
      );
    }, cardRef);

    return () => ctx.revert();
  }, [index]);

  /*
   * Uses form image when available.
   * Falls back to your uploaded document icon image.
   */
  const backgroundImage = normalizeImageUrl(form.image_url) || "/Form.svg";

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
    <div ref={cardRef} className="h-full w-full pt-2 pb-6">
      <div className="form-card group relative overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#14141c]">
        {/* ========================================= */}
        {/* POSTER — glassmorphic gradient background */}
        {/* ========================================= */}

        <div className="relative h-48 w-full overflow-hidden rounded-t-xl">
          {/* base gradient, theme colors, replaces flat photo bg */}
          <div
            className={[
              'absolute inset-0',
              'bg-gradient-to-br from-[#FFC27A] via-[#FFA14A] to-[#F07A25]',
              'dark:from-[#241B2A] dark:via-[#3A202A] dark:to-[#4A2220]',
            ].join(' ')}
          />

          {/* radial orb, top */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255, 122, 0, 0.48) 0%, rgba(255, 153, 61, 0.29) 45%, transparent 75%)',
            }}
          />

          {/* radial glow, left */}
          <div
            className="pointer-events-none absolute inset-0 dark:opacity-90"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 0% 55%, rgba(255, 102, 0, 0.34) 0%, rgba(139, 46, 59, 0.17) 50%, transparent 80%)',
            }}
          />

          {/* diagonal sheen */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />

          {/* glass tag badge, top-left */}
          <div
            ref={tagRef}
            className="absolute left-2.5 top-2.5 rounded-full border border-[#FF7A00]/30 bg-white/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#B24A0B] backdrop-blur-md shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-[#FFC08A]"
          >
            {form.category || "Registration"}
          </div>

          {/* tilted accent image, bottom-right corner, enlarged (SE → NW tilt) */}
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rotate-[-28deg] overflow-hidden rounded-2xl border border-white/40 bg-white/10 shadow-xl backdrop-blur-md dark:border-white/15">
            <img
              src={backgroundImage}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          </div>

          {/* hover overlay with primary action */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Link
              href={`/forms/${form.slug}`}
              className="flex items-center gap-1 rounded-full bg-[#FF7A00] px-4 py-2 font-medium text-white transition-all hover:bg-[#E06B00]"
            >
              <ArrowRight className="h-4 w-4" />
              {isUpcoming ? "View Schedule" : "Fill Form"}
            </Link>
          </div>

          {/* title sits directly on the poster background */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent px-3 pb-3 pt-10">
            <div
              ref={titleRef}
              className="w-full"
            >
              <h3 className="line-clamp-2 text-md font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]">
                {form.title}
              </h3>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* BOTTOM CONTENT — unchanged */}
        {/* ========================================= */}

        <div
          ref={footerRef}
          className="relative overflow-hidden border-t border-white/70 bg-white/45 p-4 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.06]"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#FF7A00]/15 blur-3xl dark:bg-[#FF7A00]/10" />

          <div className="relative">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A00]">
              {isUpcoming ? "Upcoming" : "Open Now"}
            </span>

            <p className="mt-1.5 line-clamp-2 border-l-2 border-[#FF7A00]/25 pl-2.5 text-[13px] leading-relaxed text-slate-500 dark:border-[#FF7A00]/25 dark:text-slate-400">
              {form.description}
            </p>

            <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />

            <div className="grid gap-1.5">
              <div className="flex items-center gap-2.5 rounded-lg bg-[#FF7A00]/[0.06] px-2.5 py-1.5 dark:bg-[#FF7A00]/[0.09]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 dark:bg-[#FF7A00]/20">
                  <Calendar className="h-4 w-4 text-[#FF7A00]" />
                </span>
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  {formattedOpen || formattedClose
                    ? `${formattedOpen ? `Opens ${formattedOpen}` : "Open now"}${formattedClose ? ` · Closes ${formattedClose}` : ""}`
                    : footerLabel}
                </span>
              </div>

              {(formattedOpenTime || formattedCloseTime) && (
                <div className="flex items-center gap-2.5 rounded-lg bg-[#FF7A00]/[0.06] px-2.5 py-1.5 dark:bg-[#FF7A00]/[0.09]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 dark:bg-[#FF7A00]/20">
                    <Clock className="h-4 w-4 text-[#FF7A00]" />
                  </span>
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                    {formattedOpenTime || "Now"}
                    {formattedCloseTime ? ` - ${formattedCloseTime}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-card {
          transition:
            transform 0.4s ease,
            box-shadow 0.3s ease;
        }
        .form-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(255, 122, 0, 0.3);
        }
      `}</style>
    </div>
  );
}