"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  ArrowRight,
} from "lucide-react";

import { Event } from "@/lib/types";
import SpotlightCard from "@/components/ui/SpotlightCard";

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

  const categoryRef = useRef<HTMLDivElement>(null);
  const dateTimeRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);
  const seatsRef = useRef<HTMLDivElement>(null);
  const speakerRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const formattedDate = new Date(event.start_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formattedTime = new Date(event.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

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
      speakerRef.current,
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
    <div ref={wrapperRef} className="h-full w-[300px] shrink-0 sm:w-[340px]">
      {" "}
      <SpotlightCard
        spotlightColor={accent}
        onEnter={handleHoverEnter}
        className="flex h-full w-full flex-col border-slate-200/70 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-white/10 dark:bg-[#14141c]"
      >
        {" "}
        <div className="flex flex-1 flex-col overflow-hidden p-6">
          {/* Category */}{" "}
          <div ref={categoryRef}>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: accent }}
            >
              {" "}
              <Ticket className="h-3 w-3" />
              {event.category}{" "}
            </span>{" "}
          </div>
          {/* Date + Time */}
          <div
            ref={dateTimeRef}
            className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" style={{ color: accent }} />
              {formattedDate}
            </span>

            <span className="text-slate-300 dark:text-slate-600">•</span>

            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
              {formattedTime}
            </span>
          </div>
          {/* RIGHT → LEFT */}
          <div className="overflow-hidden">
            <h3
              ref={titleRef}
              className="mt-4 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white"
            >
              {event.title}
            </h3>

            <p
              ref={descriptionRef}
              className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
            >
              {event.description}
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
                <span className="truncate font-medium">{event.venue}</span>
              </div>
            </div>

            {/* Seats */}
            <div ref={seatsRef}>
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
                <span className="font-medium">{event.capacity} seats</span>
              </div>
            </div>

            {/* Speaker */}
            {event.speaker && (
              <div ref={speakerRef}>
                <div className="flex items-center gap-2.5">
                  <UserCheck
                    className="h-4 w-4 shrink-0"
                    style={{ color: accent }}
                  />
                  <span className="truncate font-medium">{event.speaker}</span>
                </div>
              </div>
            )}
          </div>
          {/* Buttons */}
          <div className="mt-auto flex items-center gap-3 pt-6">
            <Link
              href={`/events/${event.slug}/reserve`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: accent }}
            >
              <Ticket className="h-4 w-4" />
              Reserve Seat
            </Link>

            <Link
              href={`/events/${event.slug}/rsvp`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              RSVP
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
