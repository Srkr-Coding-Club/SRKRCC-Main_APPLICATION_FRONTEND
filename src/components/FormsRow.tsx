"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FormCard from "@/components/FormCard";
import { Form } from "@/lib/types";

interface FormsRowProps {
  forms: Form[];
  now: number;
}

const CARD_WIDTH = 340;
const CARD_GAP = 20;

export default function FormsRow({ forms, now }: FormsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardsPerPage, setCardsPerPage] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;

    const fit = Math.max(
      1,
      Math.floor((element.clientWidth + CARD_GAP) / (CARD_WIDTH + CARD_GAP)),
    );
    setCardsPerPage(fit);
  }, []);

  useEffect(() => {
    measure();
    const resizeObserver = new ResizeObserver(measure);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [measure]);

  useEffect(() => {
    setPage(0);
  }, [forms]);

  const totalPages = Math.max(1, Math.ceil(forms.length / cardsPerPage));
  const canGoLeft = page > 0;
  const canGoRight = page < totalPages - 1;
  const visibleForms = forms.slice(
    page * cardsPerPage,
    page * cardsPerPage + cardsPerPage,
  );

  const goLeft = () => canGoLeft && setPage((currentPage) => currentPage - 1);
  const goRight = () => canGoRight && setPage((currentPage) => currentPage + 1);

  return (
    <div className="relative">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous"
          onClick={goLeft}
          disabled={!canGoLeft}
          className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
            canGoLeft
              ? "text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white"
              : "cursor-not-allowed text-slate-300 dark:text-slate-600"
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
          <div className="flex justify-center gap-5">
            {visibleForms.map((form, index) => {
              const openTime = form.open_at
                ? new Date(form.open_at).getTime()
                : null;
              const isUpcoming =
                form.status === "SCHEDULED" &&
                openTime !== null &&
                now < openTime;

              return (
                <div
                  key={`${page}-${form.slug || form.id}`}
                  className="h-full w-[300px] shrink-0 sm:w-[340px]"
                >
                  <FormCard
                    form={form}
                    isUpcoming={isUpcoming}
                    index={index}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Next"
          onClick={goRight}
          disabled={!canGoRight}
          className={`shrink-0 rounded-full bg-white p-2.5 shadow-lg transition-all duration-200 dark:bg-white/10 active:scale-95 ${
            canGoRight
              ? "text-slate-700 hover:scale-110 hover:shadow-xl dark:text-white"
              : "cursor-not-allowed text-slate-300 dark:text-slate-600"
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
