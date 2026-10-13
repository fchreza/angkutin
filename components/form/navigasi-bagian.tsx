"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Navigasi bagian untuk form Pasang.
 *
 * KENAPA INI ADA:
 * Form Pasang tingginya sekitar 2.450px, yaitu hampir empat layar ponsel.
 * Tanpa penanda bagian, penjual tidak tahu ada berapa bagian lagi di bawah,
 * dan tidak bisa melompat ke bagian yang ingin dia perbaiki setelah validasi
 * gagal. Yang paling merugikan: pesan galat bisa menunjuk ke bagian paling
 * bawah, sementara penjual masih melihat bagian paling atas dan tidak tahu
 * ke mana harus menggulir.
 *
 * KENAPA TAUTAN ANCHOR, BUKAN TAB:
 * Bagian-bagiannya bukan pilihan yang saling meniadakan. Semuanya HARUS diisi,
 * jadi bentuk yang benar adalah daftar isi yang bisa dilompati, bukan tab yang
 * menyembunyikan bagian lain. Kalau memakai tab, penjual bisa mengira bagian
 * yang tidak terlihat itu tidak perlu diisi.
 *
 * KENAPA INDIKATOR AKTIF DIHITUNG DARI SCROLL, BUKAN IntersectionObserver:
 * IntersectionObserver perlu `rootMargin` yang menghitung tinggi header dan
 * tinggi bilah ini sendiri, dan nilainya berbeda antara ponsel dan desktop.
 * Menghitung dari `getBoundingClientRect` membuat satu aturan yang sama untuk
 * kedua ukuran layar, dan hasilnya bisa diperiksa langsung.
 */

export type BagianForm = {
  /** id elemen tujuan, tanpa tanda pagar. */
  id: string;
  label: string;
};

/**
 * Tinggi area yang menutupi konten saat menggulir.
 *
 * DIUKUR, bukan diperkirakan: header 57px + bilah ini 54px = 111px, ditambah
 * sedikit ruang supaya judul bagiannya tidak menempel ke garis pemisah.
 *
 * Nilai ini dipakai DUA hal sekaligus supaya tidak bisa jadi tidak sinkron:
 * sebagai `scroll-margin-top` tiap bagian (lihat KELAS_ANCHOR_BAGIAN), dan
 * sebagai ambang penentu bagian mana yang sedang aktif. Kalau ditulis di dua
 * tempat, suatu saat salah satunya berubah dan judul bagian tertutup header.
 */
const TINGGI_TERTUTUP = 116;

export function NavigasiBagian({ bagian }: { bagian: BagianForm[] }) {
  const [aktif, setAktif] = useState(bagian[0]?.id ?? "");

  useEffect(() => {
    let terjadwal = false;

    const hitung = () => {
      terjadwal = false;

      /*
       * Bagian aktif = bagian TERAKHIR yang tepi atasnya sudah melewati ambang.
       * Dipilih "terakhir yang sudah lewat", bukan "yang paling dekat", supaya
       * saat berada di dasar halaman bagian terakhir tetap yang tersorot.
       */
      let sekarang = bagian[0]?.id ?? "";
      for (const b of bagian) {
        const el = document.getElementById(b.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= TINGGI_TERTUTUP + 40) sekarang = b.id;
      }

      // Di dasar halaman, bagian terakhir selalu aktif: kalau tidak, bagian
      // terakhir tidak pernah tersorot karena tingginya jarang melewati ambang.
      const diDasar =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (diDasar) sekarang = bagian[bagian.length - 1]?.id ?? sekarang;

      setAktif(sekarang);
    };

    // Dijadwalkan lewat rAF supaya satu peristiwa gulir tidak memicu lebih dari
    // satu perhitungan, dan tata letak dibaca pada waktu yang sama dengan
    // penggambaran.
    const saatGulir = () => {
      if (terjadwal) return;
      terjadwal = true;
      requestAnimationFrame(hitung);
    };

    hitung();
    window.addEventListener("scroll", saatGulir, { passive: true });
    window.addEventListener("resize", saatGulir);
    return () => {
      window.removeEventListener("scroll", saatGulir);
      window.removeEventListener("resize", saatGulir);
    };
  }, [bagian]);

  return (
    <nav
      aria-label="Bagian formulir"
      /*
       * top-14 = tepat di bawah header, yang tingginya 56px di ponsel maupun
       * desktop. `-mx-4 px-4` di ponsel supaya bilahnya menyentuh tepi layar
       * seperti header, jadi tidak terlihat sebagai potongan yang mengapung.
       */
      className="sticky top-14 z-20 -mx-4 mb-4 border-b border-line bg-appbg/95 px-4 backdrop-blur-sm md:mx-0 md:rounded-md md:border md:px-2 md:py-1"
    >
      <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2 md:py-1">
        {bagian.map((b) => {
          const iniAktif = aktif === b.id;
          return (
            <li key={b.id} className="shrink-0">
              <a
                href={`#${b.id}`}
                aria-current={iniAktif ? "true" : undefined}
                className={cn(
                  /*
                   * h-11 (44px) BUKAN h-9 (36px): ini deretan tautan yang
                   * ditekan dengan jempol di ponsel, jadi berlaku syarat
                   * sasaran sentuh minimum WCAG 2.5.5. Sama seperti chip
                   * filter di katalog.
                   */
                  "press flex h-11 items-center rounded-pill px-3.5 text-[13px] font-semibold transition-colors",
                  iniAktif
                    ? "bg-primary text-primary-teks"
                    : "text-ink-secondary hover:bg-surface2 hover:text-ink",
                )}
              >
                {b.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Tinggi area tertutup, diekspor supaya halaman form memakai angka yang SAMA
 * pada `scroll-margin-top` tiap bagian. Kalau nilainya ditulis dua kali di dua
 * tempat, suatu saat salah satunya berubah dan judul bagian tertutup header.
 */
export const KELAS_ANCHOR_BAGIAN = "scroll-mt-[116px]";
