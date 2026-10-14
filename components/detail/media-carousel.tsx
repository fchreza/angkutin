"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "@/components/shared/icons";

/** Galeri foto produk: swipe, panah desktop, dan thumbnail yang bisa dipilih. */
export function MediaCarousel({
  foto,
  judul,
}: {
  foto: { image_url: string; display_order: number }[];
  judul: string;
}) {
  const [aktif, setAktif] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const ada = foto.length > 0;

  const sinkron = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    const aman = Math.max(0, Math.min(i, foto.length - 1));
    setAktif((sebelumnya) => (sebelumnya === aman ? sebelumnya : aman));
  }, [foto.length]);

  const geserKe = (indeks: number) => {
    const track = trackRef.current;
    const aman = Math.max(0, Math.min(indeks, foto.length - 1));
    setAktif(aman);
    track?.scrollTo({ left: aman * track.clientWidth, behavior: "smooth" });
  };

  if (!ada) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-line bg-surface2 text-[13px] text-ink-secondary">
        Tanpa foto
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface2 shadow-[0_1px_3px_rgb(var(--w-ink)/0.05)]">
        <div
          ref={trackRef}
          onScroll={sinkron}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-label={`Galeri foto ${judul}`}
        >
          {foto.map((f, i) => (
            <div key={f.image_url} className="w-full shrink-0 snap-center">
              <img
                src={f.image_url}
                alt={`${judul} — foto ${i + 1}`}
                className="aspect-[4/3] w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {foto.length > 1 && (
          <>
            <span className="absolute bottom-3 right-3 rounded-pill bg-scrim/75 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white">
              {aktif + 1} / {foto.length}
            </span>
            {aktif > 0 && (
              <button
                type="button"
                onClick={() => geserKe(aktif - 1)}
                aria-label="Foto sebelumnya"
                className="press absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 rotate-180 items-center justify-center rounded-full border border-line bg-surface/95 text-ink shadow-card hover:bg-surface md:flex"
              >
                <IconChevronRight size={18} />
              </button>
            )}
            {aktif < foto.length - 1 && (
              <button
                type="button"
                onClick={() => geserKe(aktif + 1)}
                aria-label="Foto berikutnya"
                className="press absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-ink shadow-card hover:bg-surface md:flex"
              >
                <IconChevronRight size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {foto.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Pilih foto produk">
          {foto.map((f, i) => (
            <button
              key={f.image_url}
              type="button"
              onClick={() => geserKe(i)}
              aria-label={`Tampilkan foto ${i + 1}`}
              aria-pressed={aktif === i}
              className={cn(
                "shrink-0 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                aktif === i ? "border-primary" : "border-transparent hover:border-line-kuat",
              )}
            >
              <img
                src={f.image_url}
                alt=""
                aria-hidden="true"
                className="h-14 w-14 object-cover sm:h-16 sm:w-16"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
