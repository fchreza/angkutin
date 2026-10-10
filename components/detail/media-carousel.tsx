"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "@/components/shared/icons";

/**
 * Carousel foto (Layar 2).
 *
 * Scroll-snap horizontal: bekerja dengan swipe di mobile DAN panah di
 * desktop, tanpa library tambahan (menjaga bundel tetap kecil).
 */
export function MediaCarousel({
  foto,
  judul,
}: {
  foto: { image_url: string; display_order: number }[];
  judul: string;
}) {
  const [aktif, setAktif] = useState(0);
  const ada = foto.length > 0;

  const geser = (arah: 1 | -1) => {
    const next = Math.min(Math.max(aktif + arah, 0), foto.length - 1);
    setAktif(next);
    document
      .getElementById(`foto-${next}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  if (!ada) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-line bg-appbg text-[13px] text-ink-secondary">
        Tanpa foto
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md border border-line bg-appbg">
        {foto.map((f, i) => (
          <div
            key={f.image_url}
            id={`foto-${i}`}
            className="w-full shrink-0 snap-center"
            onFocus={() => setAktif(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.image_url}
              alt={`${judul} — foto ${i + 1}`}
              className="aspect-square w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* Indikator titik */}
      {foto.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {foto.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-pill transition-all",
                  i === aktif ? "w-5 bg-white" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>

          {/* Panah untuk desktop */}
          {aktif > 0 && (
            <button
              type="button"
              onClick={() => geser(-1)}
              aria-label="Foto sebelumnya"
              className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 rotate-180 items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white md:flex"
            >
              <IconChevronRight size={18} />
            </button>
          )}
          {aktif < foto.length - 1 && (
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label="Foto berikutnya"
              className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card hover:bg-white md:flex"
            >
              <IconChevronRight size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
