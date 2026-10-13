"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
} from "@/components/shared/icons";
import { keYMD, parseTanggalLokal, formatTanggalPendek } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Pemilih tanggal batas pengambilan.
 *
 * KENAPA TIDAK MEMAKAI <input type="date"> LAGI:
 * Tampilan kalender bawaan browser berbeda-beda di tiap perangkat, tidak bisa
 * mengikuti tema (di mode gelap tetap terang), dan tidak bisa menonjolkan
 * aturan penting seperti "maksimal 14 hari". Dengan komponen sendiri,
 * tampilannya konsisten dan batasnya terlihat langsung di kalender.
 *
 * ATURAN YANG DITEGAKKAN (dari lib/validators.ts — server memvalidasi ulang):
 *   - Tanggal sebelum hari ini: dinonaktifkan.
 *   - Lebih dari MAKS_HARI ke depan: dinonaktifkan.
 *   - Navigasi bulan dibatasi supaya tidak bisa menjelajah ke bulan kosong.
 *
 * NOL DEPENDENSI BARU: komponen referensi memakai lucide-react + clsx, tapi
 * proyek ini sudah punya cn() dan ikon sendiri, jadi tidak ada paket baru.
 *
 * TANGGAL DIPERLAKUKAN SEBAGAI TANGGAL KALENDER, BUKAN WAKTU.
 * Semua perbandingan memakai string "YYYY-MM-DD" dan tengah malam lokal,
 * supaya tidak ada pergeseran sehari karena zona waktu (lihat lib/format.ts).
 */

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Nama hari Indonesia, 3 huruf, dimulai dari Minggu agar cocok dengan getDay(). */
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

type Sel = number | null;

/** Susun sel satu bulan: null di awal sebagai pengisi kolom hari. */
function selBulan(tahun: number, bulan: number): Sel[] {
  const hariPertama = new Date(tahun, bulan, 1).getDay();
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();
  const sel: Sel[] = [];
  for (let i = 0; i < hariPertama; i++) sel.push(null);
  for (let d = 1; d <= jumlahHari; d++) sel.push(d);
  return sel;
}

export function KalenderTenggat({
  nilai,
  onUbah,
  hariIni,
  maksTenggat,
  adaGalat,
  maksHari,
}: {
  /** Tanggal terpilih, format "YYYY-MM-DD". */
  nilai: string;
  onUbah: (ymd: string) => void;
  /** "YYYY-MM-DD" batas bawah (hari ini menurut WIB). */
  hariIni: string;
  /** "YYYY-MM-DD" batas atas (hari ini + MAKS_HARI). */
  maksTenggat: string;
  adaGalat?: boolean;
  maksHari: number;
}) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  // Bulan yang sedang ditampilkan mengikuti tanggal terpilih.
  const terpilih = useMemo(() => parseTanggalLokal(nilai), [nilai]);
  const [lihat, setLihat] = useState({ tahun: terpilih.getFullYear(), bulan: terpilih.getMonth() });
  const [arah, setArah] = useState(0);

  // Saat tanggal berubah dari luar (mis. form direset), ikuti bulannya.
  useEffect(() => {
    setLihat({ tahun: terpilih.getFullYear(), bulan: terpilih.getMonth() });
  }, [terpilih]);

  // Tutup saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  const sel = useMemo(() => selBulan(lihat.tahun, lihat.bulan), [lihat]);

  /** Batas bulan yang boleh dijelajahi: bulan hari ini s/d bulan maksTenggat. */
  const bulanMin = useMemo(() => {
    const d = parseTanggalLokal(hariIni);
    return d.getFullYear() * 12 + d.getMonth();
  }, [hariIni]);
  const bulanMaks = useMemo(() => {
    const d = parseTanggalLokal(maksTenggat);
    return d.getFullYear() * 12 + d.getMonth();
  }, [maksTenggat]);

  const posisiBulan = lihat.tahun * 12 + lihat.bulan;
  const bisaMundur = posisiBulan > bulanMin;
  const bisaMaju = posisiBulan < bulanMaks;

  function geserBulan(delta: number) {
    if (delta < 0 && !bisaMundur) return;
    if (delta > 0 && !bisaMaju) return;
    setArah(delta);
    const d = new Date(lihat.tahun, lihat.bulan + delta, 1);
    setLihat({ tahun: d.getFullYear(), bulan: d.getMonth() });
  }

  /** Hari ini, dalam komponen tanggal lokal. */
  const sekarang = useMemo(() => parseTanggalLokal(hariIni), [hariIni]);

  function statusHari(hari: number) {
    const ymd = keYMD(new Date(lihat.tahun, lihat.bulan, hari));
    const sebelum = ymd < hariIni;
    const sesudah = ymd > maksTenggat;
    const dipilih = ymd === nilai;
    const iniHariIni =
      sekarang.getFullYear() === lihat.tahun &&
      sekarang.getMonth() === lihat.bulan &&
      sekarang.getDate() === hari;
    return { ymd, nonaktif: sebelum || sesudah, dipilih, iniHariIni };
  }

  return (
    <div ref={wadah} className="relative">
      {/* Tombol pemicu — bentuknya menyerupai input supaya konsisten. */}
      <button
        type="button"
        id="tenggat"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="dialog"
        aria-expanded={buka}
        className={cn(
          /*
           * 16px supaya sejajar dengan kolom isian lain: kontrol ini MENYERUPAI
           * input, jadi ukuran teksnya tidak boleh berbeda dari input yang
           * sesungguhnya, atau barisnya terlihat tidak sejajar.
           */
          "flex h-11 w-full items-center justify-between rounded-md border px-3 text-left text-[16px]",
          "transition-colors hover:border-line-kuat focus:outline-none",
          adaGalat ? "border-danger" : buka ? "border-primary" : "border-line",
        )}
      >
        <span className={cn(nilai ? "text-ink" : "text-ink-secondary")}>
          {nilai ? formatTanggalPendek(nilai) : "Pilih tanggal"}
        </span>
        <IconClock size={16} className="shrink-0 text-ink-secondary" />
      </button>

      {buka && (
        <div
          role="dialog"
          aria-label="Pilih batas pengambilan"
          className={cn(
            "animate-slide-down absolute left-0 top-full z-40 mt-2 w-full min-w-[288px] max-w-[340px]",
            "overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-modal",
          )}
        >
          {/* Kepala: navigasi bulan */}
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => geserBulan(-1)}
              disabled={!bisaMundur}
              aria-label="Bulan sebelumnya"
              className={cn(
                "press flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary",
                bisaMundur ? "hover:bg-appbg hover:text-ink" : "cursor-not-allowed opacity-30",
              )}
            >
              <IconChevronLeft size={16} />
            </button>

            <div className="text-[13.5px] font-semibold text-ink" aria-live="polite">
              {NAMA_BULAN[lihat.bulan]} {lihat.tahun}
            </div>

            <button
              type="button"
              onClick={() => geserBulan(1)}
              disabled={!bisaMaju}
              aria-label="Bulan berikutnya"
              className={cn(
                "press flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary",
                bisaMaju ? "hover:bg-appbg hover:text-ink" : "cursor-not-allowed opacity-30",
              )}
            >
              <IconChevronRight size={16} />
            </button>
          </div>

          {/* Nama hari */}
          <div className="grid grid-cols-7 gap-0.5">
            {HARI.map((h) => (
              <div
                key={h}
                className="py-1 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-mono"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Sel tanggal. Kunci memakai bulan+tahun+arah supaya animasi geser
              benar-benar dijalankan ulang setiap kali bulan berubah. */}
          <div
            key={`${lihat.tahun}-${lihat.bulan}-${arah}`}
            className={cn(
              "grid grid-cols-7 gap-0.5",
              arah !== 0 && (arah > 0 ? "animate-geser-kiri" : "animate-geser-kanan"),
            )}
          >
            {sel.map((hari, i) => {
              if (hari === null) return <div key={`k${i}`} />;
              const s = statusHari(hari);
              return (
                <button
                  key={hari}
                  type="button"
                  disabled={s.nonaktif}
                  aria-label={formatTanggalPendek(s.ymd)}
                  aria-current={s.dipilih ? "date" : undefined}
                  onClick={() => {
                    onUbah(s.ymd);
                    setBuka(false);
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors",
                    /*
                     * Tanggal nonaktif: memakai ink-mono TANPA opacity.
                     * Dengan opacity 30% rasio kontrasnya hanya 1,48:1 —
                     * praktis tidak terbaca. WCAG memang mengecualikan kontrol
                     * nonaktif, tapi pengguna tetap perlu MEMBACA tanggalnya
                     * untuk memahami kenapa tidak bisa dipilih. Tanpa opacity,
                     * ink-mono memberi 5,11:1 (terang) dan 4,65:1 (gelap),
                     * sekaligus tetap jauh lebih pudar daripada tanggal aktif
                     * (17,8:1 / 13,7:1) sehingga statusnya tetap jelas.
                     * Latar tipis ditambahkan supaya bedanya terlihat tanpa
                     * bergantung pada warna teks saja.
                     */
                    s.nonaktif &&
                      "cursor-not-allowed bg-appbg text-ink-mono line-through decoration-[0.5px]",
                    !s.nonaktif && !s.dipilih && "text-ink hover:bg-appbg",
                    // Hari ini: cincin tipis, bukan latar penuh — supaya tidak
                    // bersaing dengan tanggal yang sedang dipilih.
                    s.iniHariIni && !s.dipilih && "ring-1 ring-inset ring-line-kuat",
                    s.dipilih && "bg-primary font-semibold text-primary-teks",
                  )}
                >
                  {hari}
                </button>
              );
            })}
          </div>

          {/* Keterangan batas — supaya penjual tahu kenapa sebagian tanggal mati. */}
          <div className="mt-3 border-t border-line pt-3">
            <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
              Bisa dipilih: hari ini sampai{" "}
              <span className="font-medium text-ink">
                {formatTanggalPendek(maksTenggat)}
              </span>{" "}
              (maksimal {maksHari} hari).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
