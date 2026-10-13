"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconChevronRight } from "@/components/shared/icons";

/**
 * Carousel foto (Layar 2).
 *
 * Scroll-snap horizontal: bekerja dengan swipe di mobile DAN panah di
 * desktop, tanpa library tambahan (menjaga bundel tetap kecil).
 *
 * Sumber kebenaran foto aktif adalah POSISI GULIR, bukan state tombol.
 * Alasannya: penjual bisa berpindah foto dengan tiga cara — panah, swipe di
 * HP, atau trackpad. Kalau state hanya diperbarui oleh tombol, indikator
 * titik jadi salah begitu pengguna men swipe (foto sudah pindah, titiknya
 * masih menunjuk foto lama). Karena itu gulir selalu disinkronkan lewat
 * onScroll.
 */
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

  /**
   * Baca ulang posisi gulir dan samakan indikator dengannya.
   * Dipanggil saat gulir (swipe/trackpad) dan setelah perpindahan lewat panah.
   */
  const sinkron = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    const aman = Math.max(0, Math.min(i, foto.length - 1));
    setAktif((s) => (s === aman ? s : aman));
  }, [foto.length]);

  const geser = (arah: 1 | -1) => {
    const track = trackRef.current;
    const next = Math.min(Math.max(aktif + arah, 0), foto.length - 1);
    setAktif(next);
    // scrollTo pada wadahnya sendiri, BUKAN scrollIntoView.
    // scrollIntoView menggulir SEMUA induk, termasuk halaman secara vertikal,
    // sehingga layar ikut melompat saat panah ditekan.
    track?.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
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
      <div
        ref={trackRef}
        onScroll={sinkron}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md border border-line bg-appbg"
      >
        {foto.map((f, i) => (
          <div key={f.image_url} id={`foto-${i}`} className="w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/*
             * TIDAK memakai animate-reveal di sini.
             *
             * Animasi revealIn mulai dari opacity 0 + blur(4px) — dirancang
             * untuk peralihan skeleton ke konten. Kalau dipasang ke foto,
             * setiap perpindahan foto membuat foto memudar masuk dari
             * ketidakterlihatan, dan yang terlihat lebih dulu adalah latar
             * carousel yang nyaris putih (#F9FAFB). Itulah "kilatan putih"
             * saat foto digeser. Terukur: opacity foto baru 0,167 pada 80ms
             * pertama, dan kilatan berlangsung ~320ms.
             *
             * Pada carousel, geseran horizontal itu SENDIRI sudah menjadi
             * transisinya — foto tidak perlu memudar.
             */}
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
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {foto.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-pill transition-all",
                  i === aktif ? "w-5 bg-white" : "w-1.5 bg-scrim/60",
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
              className="press absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 rotate-180 items-center justify-center rounded-full bg-white/90 text-scrim shadow-card hover:bg-white md:flex"
            >
              <IconChevronRight size={18} />
            </button>
          )}
          {aktif < foto.length - 1 && (
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label="Foto berikutnya"
              className="press absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-scrim shadow-card hover:bg-white md:flex"
            >
              <IconChevronRight size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
