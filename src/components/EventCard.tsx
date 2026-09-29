"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";

import { Event } from "@/lib/types";
import SpotlightCard from "@/components/ui/SpotlightCard";

/** Flattens the Markdown "about" text into a one-paragraph snippet for the card preview. */
function markdownToPreview(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/gm, " ") // table separator rows (| --- | --- |)
    .replace(/^\s*\|(.+)\|\s*$/gm, (_m, row) => row.split("|").join(" ")) // table rows -> plain space-separated text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images -> just their alt text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*(#{1,6}|>|[-*]|\d+\.)\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface EventCardProps {
  event: Event;
  accent?: string;
  index?: number;
}

export default function EventCard({
  event,
  accent = "#FF7A00",
  index = 0,
}: EventCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const detailHref = `/events/${event.slug}`;

  const categoryRef = useRef<HTMLDivElement>(null);
  const dateTimeRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);
  const seatsRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const formattedDate = event.start_time
    ? new Date(event.start_time).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const formattedTime = event.start_time
    ? new Date(event.start_time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  // Distinct from the event's own date above: this is when the linked form
  // stops accepting submissions, which is frequently an earlier deadline.
  const registrationClosesLabel = event.registration_closes_at
    ? new Date(event.registration_closes_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) +
      " · " +
      new Date(event.registration_closes_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const registrationOpensLabel = event.registration_opens_at
    ? new Date(event.registration_opens_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) +
      " · " +
      new Date(event.registration_opens_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const registrationNotYetOpen =
    !!event.registration_opens_at && new Date(event.registration_opens_at).getTime() > Date.now();

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wrapperRef.current,
        {
          x: 90,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          delay: index * 0.12,
          ease: "power3.out",
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, [index]);

  const handleHoverEnter = () => {
    const leftElements = [
      categoryRef.current,
      dateTimeRef.current,
      venueRef.current,
      seatsRef.current,
    ].filter(Boolean);

    const rightElements = [titleRef.current, descriptionRef.current].filter(
      Boolean,
    );

    // LEFT → RIGHT
    gsap.fromTo(
      leftElements,
      {
        x: -70,
        opacity: 0.35,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0,
        overwrite: "auto",
      },
    );

    // RIGHT → LEFT
    gsap.fromTo(
      rightElements,
      {
        x: 70,
        opacity: 0.35,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0,
        overwrite: "auto",
      },
    );
  };

  return (
    <div ref={wrapperRef} className="h-full w-[300px] shrink-0">
      {" "}
      <SpotlightCard
        spotlightColor={accent}
        onEnter={handleHoverEnter}
        className="glass-panel flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10"
      >
        {" "}
        <div
          className="flex flex-1 cursor-pointer flex-col overflow-hidden p-6"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) return;
            router.push(detailHref);
          }}
        >
          {/* Category */}{" "}
          <div ref={categoryRef} className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: accent }}
            >
              {" "}
              <Ticket className="h-3 w-3" />
              {event.category}{" "}
            </span>{" "}
            {event.status === "CLOSED" && (
              <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Closed
              </span>
            )}
          </div>
          {/* Event Date */}
          <div
            ref={dateTimeRef}
            className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Event Date:</span>
            {formattedDate ? (
              <>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" style={{ color: accent }} />
                  {formattedDate}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
                  {formattedTime}
                </span>
              </>
            ) : (
              <span className="italic">To be announced</span>
            )}
          </div>

          {/* Registration window — distinct from the event's own date above:
              when the linked form is actually open for submissions. */}
          {(registrationOpensLabel || registrationClosesLabel) && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              {registrationNotYetOpen ? (
                <span>
                  <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Registration Opens:</span>{" "}
                  {registrationOpensLabel}
                </span>
              ) : registrationClosesLabel ? (
                <span>
                  <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Registration Closes:</span>{" "}
                  {registrationClosesLabel}
                </span>
              ) : null}
            </div>
          )}
          {/* RIGHT → LEFT */}
          <div className="overflow-hidden">
            <h3
              ref={titleRef}
              className="mt-4 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white"
            >
              <Link href={detailHref} className="hover:underline focus:outline-none focus-visible:underline">
                {event.title}
              </Link>
            </h3>

            <p
              ref={descriptionRef}
              className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {markdownToPreview(event.description)}
            </p>
          </div>
          <div className="my-4 h-px w-full bg-slate-100 dark:bg-white/10" />
          {/* LEFT → RIGHT */}
          <div className="grid gap-2.5 text-[13px] text-slate-600 dark:text-slate-300">
            {/* Venue */}
            <div ref={venueRef}>
              <div className="flex items-center gap-2.5">
                <MapPin
                  className="h-4 w-4 shrink-0"
                  style={{ color: accent }}
                />
                <span className="truncate font-medium">{event.venue || "Venue to be announced"}</span>
              </div>
            </div>

            {/* Seats */}
            <div ref={seatsRef}>
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <span className="font-medium">{event.capacity} seats</span>
              </div>
            </div>
          </div>
          {/* Buttons */}
          <div className="mt-auto flex items-center gap-2 pt-6">
            <Link
              href={detailHref}
              aria-label={`View details for ${event.title}`}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            >
              Details
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            {event.status === "CLOSED" ? (
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2.5 text-[13px] font-semibold text-slate-400 dark:bg-white/5 dark:text-slate-500">
                Registration Closed
              </span>
            ) : (
              <Link
                href={event.form_slug ? `/forms/${event.form_slug}` : "/forms"}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
                style={{ backgroundColor: accent }}
              >
                <Ticket className="h-4 w-4" />
                Register Now
              </Link>
            )}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
