"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { IconAlert } from "@/components/shared/icons";

/**
 * Batas galat untuk seluruh halaman.
 *
 * KENAPA INI ADA:
 * Tanpa `error.tsx`, satu galat runtime di komponen mana pun membuat Next
 * menampilkan layar kosong putih tanpa penjelasan dan tanpa jalan kembali.
 * Pengguna tidak tahu apakah situsnya rusak, koneksinya putus, atau tautannya
 * salah, dan satu-satunya yang bisa dia lakukan adalah menutup tab.
 *
 * Yang ditampilkan di sini: penjelasan singkat dalam Bahasa Indonesia, tombol
 * coba lagi yang benar-benar memanggil ulang render, dan jalan kembali ke
 * katalog. Tidak ada detail teknis yang bocor ke pengguna.
 *
 * `digest` ditampilkan sebagai kode pendek. KENAPA: kalau penjual melaporkan
 * masalah, kode itu memungkinkan galat yang sama ditemukan di log server.
 * Tanpa kode, laporan "situsnya error" tidak bisa ditelusuri sama sekali.
 * Nilainya hash internal Next, bukan pesan galat, jadi tidak membocorkan
 * apa pun tentang data atau kode.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Dikirim ke console supaya tetap terlihat saat pengembangan dan tertangkap
    // oleh alat pemantau apa pun yang dipasang di kemudian hari.
    console.error("[galat halaman]", error);
  }, [error]);

  return (
    <main className="shell flex min-h-[70vh] w-full flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <IconAlert size={26} />
      </span>

      <h1 className="mt-5 font-display text-judul-sedang font-bold text-ink">
        Ada yang tidak beres
      </h1>

      <p className="mt-2.5 max-w-[46ch] text-[15px] leading-relaxed text-ink-secondary">
        Halaman ini gagal dimuat. Coba muat ulang dulu. Kalau tetap gagal,
        kembali ke katalog dan buka lagi dari sana.
      </p>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={reset} ukuran="lg">
          Coba lagi
        </Button>
        <Link href="/">
          <Button varian="outline" ukuran="lg" penuh>
            Kembali ke katalog
          </Button>
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-[14px] text-ink-secondary">
          Kode kejadian: <span className="font-mono text-ink">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
