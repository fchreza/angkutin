"use client";

import { useRef } from "react";
import { IconSun, IconMoon, IconMonitor } from "@/components/shared/icons";
import { useTema, type Tema } from "@/components/shared/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema — pill tiga posisi dengan indikator geser.
 *
 * DIADAPTASI DARI kas-monitoring (src/components/ThemeToggle.tsx), yang pada
 * gilirannya mengadaptasi morph ikon dari Amicro btn-12 (MIT). Yang diambil:
 * indikator yang meluncur dengan overshoot pegas dan ikon yang "meletup"
 * saat berpindah — bukan sekadar berganti warna.
 *
 * PERBEDAAN PENTING DARI SUMBERNYA:
 * kas-monitoring memakai sakelar DUA arah (terang <-> gelap). Angkutin punya
 * TIGA pilihan dan "ikut sistem" itu fitur, bukan hiasan — perangkat yang
 * sudah otomatis gelap di malam hari tidak perlu diapa-apakan. Menghapusnya
 * demi meniru sakelar dua arah berarti kehilangan fitur, jadi ketiganya
 * ditampilkan sekaligus sebagai pill. Efek sampingnya menguntungkan: tidak
 * ada panel dropdown yang menggantung, dan berpindah tema jadi satu klik.
 *
 * NOL DEPENDENSI BARU.
 * Sumbernya memakai motion/react (framer-motion). Animasinya di sini ditulis
 * sebagai CSS transition + keyframes, jadi tidak ada paket baru dan tidak ada
 * JS animasi yang berjalan terus-menerus. Overshoot pegas datang dari
 * cubic-bezier(0.34, 1.56, 0.64, 1).
 *
 * ANIMASI DIULANG DENGAN KUNCI, BUKAN EFEK.
 * Ikon yang baru aktif diberi `key` yang ikut berubah bersama tema, sehingga
 * React memasangnya ulang dan animasi "meletup" benar-benar berjalan setiap
 * kali berpindah — bukan hanya pada pemasangan pertama.
 */

const PILIHAN: { nilai: Tema; label: string; Ikon: typeof IconSun }[] = [
  { nilai: "terang", label: "Terang", Ikon: IconSun },
  { nilai: "gelap", label: "Gelap", Ikon: IconMoon },
  { nilai: "sistem", label: "Ikut sistem", Ikon: IconMonitor },
];

/** Geser indikator ke posisi pilihan ke-n dari 3. */
const geserKe = (n: number) => ({ transform: `translateX(${n * 100}%)` });

export function TombolTema({ kelas }: { kelas?: string }) {
  const { tema, setTema } = useTema();
  const wadah = useRef<HTMLDivElement>(null);

  const indeks = PILIHAN.findIndex((p) => p.nilai === tema);

  /**
   * Panah kiri/kanan memindah pilihan, seperti radiogroup pada umumnya.
   * Tanpa ini, pengguna keyboard harus menekan Tab tiga kali untuk melewati
   * tombol — dan tidak ada cara mengetahuinya selain mencoba.
   */
  function tombolPapanKetik(e: React.KeyboardEvent, i: number) {
    let tujuan = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") tujuan = (i + 1) % PILIHAN.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") tujuan = (i - 1 + PILIHAN.length) % PILIHAN.length;
    else if (e.key === "Home") tujuan = 0;
    else if (e.key === "End") tujuan = PILIHAN.length - 1;
    if (tujuan === -1) return;

    e.preventDefault();
    setTema(PILIHAN[tujuan].nilai);
    // Pindahkan fokus supaya pilihan aktif benar-benar terlihat.
    const tombol = wadah.current?.querySelectorAll<HTMLButtonElement>("[role=radio]");
    tombol?.[tujuan]?.focus();
  }

  return (
    <div
      ref={wadah}
      role="radiogroup"
      aria-label="Pilih tema tampilan"
      className={cn(
        "relative inline-flex items-center rounded-full border border-line p-[3px]",
        "bg-[#C9C8C1] dark:border-line dark:bg-appbg",
        kelas,
      )}
    >
      {/*
       * Indikator geser. Diletakkan di belakang ikon (z-0) dan hanya bergerak
       * dengan `transform`, jadi tidak pernah memicu perhitungan ulang tata
       * letak — sama seperti alasan tombol carousel dulu memakai properti
       * `scale` alih-alih `transform: scale()`.
       *
       * KENAPA TRACK DAN INDIKATORNYA BERBEDA PER MODE:
       * Metaforanya harus satu — indikator adalah tombol yang TERANGKAT, jadi
       * di kedua mode ia harus LEBIH TERANG dari track-nya.
       *
       *   terang: track #C9C8C1, indikator `surface` #FFFFFF  -> 1,68:1
       *   gelap : track `appbg` #181817, indikator #5A5A56     -> 2,57:1
       *
       * Riwayat angkanya, supaya tidak mundur lagi:
       *   1,07:1  putih di atas appbg (#F7F7F6) — nyaris tak terlihat
       *   1,53:1  putih di atas line (#D2D1CB)
       *   1,76:1  line di atas appbg pada mode gelap
       * Nilai 2,5:1 dipilih sebagai ambang karena selisih kecerahan saja
       * sulit dipersepsikan di bawah itu; tepi `line-kuat` (2,01:1 / 1,96:1
       * terhadap track) menjadi penanda kedua yang tidak bergantung pada
       * perbedaan kecerahan.
       *
       * CATATAN: nilai hex di sini SENGAJA eksplisit, bukan token, karena
       * palet yang ada tidak punya langkah di antara `line` dan `line-kuat`.
       * Kalau nanti palet ditambah, ganti keduanya menjadi token.
       */}
      <span
        aria-hidden
        style={{ width: "calc((100% - 6px) / 3)", ...geserKe(indeks) }}
        className={cn(
          "pointer-events-none absolute bottom-[3px] left-[3px] top-[3px] z-0 rounded-full",
          "border border-line-kuat bg-surface dark:bg-[#5A5A56]",
          "transition-transform duration-[340ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        )}
      />

      {PILIHAN.map((p, i) => {
        const aktif = tema === p.nilai;
        return (
          <button
            key={p.nilai}
            type="button"
            role="radio"
            aria-checked={aktif}
            // Hanya pilihan aktif yang masuk urutan Tab; sisanya dijangkau
            // dengan panah. Ini pola radiogroup yang benar.
            tabIndex={aktif ? 0 : -1}
            onClick={() => setTema(p.nilai)}
            onKeyDown={(e) => tombolPapanKetik(e, i)}
            title={p.label}
            aria-label={p.label}
            className={cn(
              "relative z-10 flex h-9 w-9 items-center justify-center rounded-full",
              "transition-colors duration-200",
              aktif ? "text-ink" : "text-ink-mono hover:text-ink-secondary",
            )}
          >
            {/*
             * Kunci ikut berubah saat pilihan jadi aktif -> React memasang
             * ulang -> animasi meletup berjalan lagi. Tanpa kunci ini,
             * animasi hanya terjadi sekali seumur komponen.
             */}
            <span
              key={`${p.nilai}-${aktif}`}
              className={cn("flex items-center justify-center", aktif && "animate-ikon-masuk")}
            >
              <p.Ikon size={15} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
