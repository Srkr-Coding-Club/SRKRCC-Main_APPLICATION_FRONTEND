"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import PublicListingCard from "@/components/PublicListingCard";

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
  onDetailsClick?: () => void;
}

export default function EventCard({
  event,
  accent = "#FF7A00",
  index = 0,
  onDetailsClick,
}: EventCardProps) {
  const router = useRouter();
  const detailHref = `/events/${event.slug}`;

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

  return (
    <>
      <PublicListingCard
        accent={accent}
        index={index}
        entryAnimation="none"
        className="w-full"
        category={
          <>
            <Ticket className="h-3 w-3" />
            {event.category}
          </>
        }
        status={
          event.status === "CLOSED" ? (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Closed
            </span>
          ) : null
        }
        schedule={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
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
            {(registrationOpensLabel || registrationClosesLabel) && (
              <div className="flex items-center gap-1.5">
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
          </div>
        }
        title={
          <Link href={detailHref} className="hover:underline focus:outline-none focus-visible:underline">
            {event.title}
          </Link>
        }
        description={markdownToPreview(event.description)}
        details={
          <div className="grid gap-2.5 text-[13px]">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="truncate font-medium">{event.venue || "Venue to be announced"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0" style={{ color: accent }} />
              <span className="font-medium">{event.capacity} seats</span>
            </div>
          </div>
        }
        footer={
          <>
            {onDetailsClick ? (
              <button
                type="button"
                aria-label={`View details for ${event.title}`}
                onClick={onDetailsClick}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                Details
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link
                href={detailHref}
                aria-label={`View details for ${event.title}`}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                Details
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
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
          </>
        }
        onCardClick={() => router.push(detailHref)}
      />
    </>
  );
}
