"use client";

import Link from "next/link";
import { IconChevronRight } from "@/components/shared/icons";
import { cn } from "@/lib/cn";

/**
 * Remah navigasi (breadcrumb) — menunjukkan posisi halaman dalam hierarki.
 *
 * Referensi: uiarc.dev/components/breadcrumb.
 *
 * KENAPA TIDAK MEMAKAI PAKETNYA:
 * Komponen referensi memerlukan `motion` (framer-motion) dan `lucide-react`,
 * plus dua berkas pendukung (arc-provider, motion-tokens) dan satu CSS module.
 * Animasi di sini ditulis sebagai CSS keyframes, dan ikonnya sudah ada di
 * proyek ini — jadi tidak ada paket baru sama sekali.
 *
 * TEKNIK YANG DIAMBIL: setiap remah MEMESAN LEBAR label tebalnya lewat
 * pseudo-elemen `::after` yang disembunyikan (lihat .remah-teks di
 * globals.css). Tanpa itu, saat sebuah remah berubah menjadi "halaman aktif"
 * dan berat hurufnya naik, lebar teksnya bertambah dan seluruh baris bergeser
 * — persis pada saat pengguna sedang memperhatikan.
 *
 * ANIMASI: remah yang baru muncul meluncur masuk dari kiri. Kuncinya memakai
 * `label-indeks`, sehingga React memasang ulang elemen itu setiap kali label
 * berubah dan animasinya benar-benar berjalan. Remah yang labelnya tetap
 * (misalnya "Katalog") tidak ikut beranimasi — sesuai perilaku referensi.
 *
 * Aksesibilitas:
 *   - <nav> dengan aria-label sebagai landmark.
 *   - <ol> karena ini urutan; pemisah chevron aria-hidden.
 *   - Remah terakhir SELALU <span aria-current="page">, tidak pernah tautan.
 */

export type RemahItem = {
  label: string;
  /** Tanpa href, remah dirender sebagai teks biasa (bukan tautan mati). */
  href?: string;
};

export function Breadcrumb({
  items,
  ariaLabel = "Remah navigasi",
  className,
}: {
  items: RemahItem[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("w-full", className)}>
      <ol className="remah-daftar">
        {items.map((item, i) => {
          const terakhir = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="remah-item">
              {i > 0 && (
                <IconChevronRight
                  size={13}
                  className="remah-pemisah"
                  aria-hidden
                />
              )}

              {!terakhir && item.href ? (
                <Link href={item.href} className="remah-tautan">
                  <span className="remah-teks" data-label={item.label}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span
                  className="remah-kini"
                  aria-current={terakhir ? "page" : undefined}
                >
                  <span className="remah-teks" data-label={item.label}>
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
