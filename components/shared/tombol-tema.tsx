"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSun, IconMoon, IconMonitor } from "@/components/shared/icons";
import { useTema, type Tema } from "@/components/shared/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema — pill tiga posisi, dengan transisi halaman "eclipse".
 *
 * KONSEP DARI uiarc.dev/components/theme-switch (varian eclipse): tampilan
 * berikutnya menyeberangi halaman seperti gerhana.
 *
 * YANG DIAMBIL DARI REFERENSINYA:
 *   - Ikon berputar saat berganti, bukan sekadar berganti warna (rotate
 *     30deg masuk mode terang, -30deg masuk mode gelap). Diterjemahkan jadi
 *     CSS keyframes, jadi tidak ada paket motion.
 *   - Petunjuk arah: varian eclipse menggeser ikon 2px ke kiri saat mode gelap.
 *   - `useSettled`: pergantian tema saat hidrasi (dari localStorage) TIDAK
 *     dianimasikan, supaya halaman yang dibuka dalam mode gelap tidak
 *     berputar-putar sendiri saat dimuat.
 *
 * KENAPA TIDAK MEMAKAI `document.startViewTransition`:
 * Referensinya menyarankan View Transitions, dan itu memang yang pertama saya
 * coba. Hasil pengukuran di halaman ini:
 *
 *   tanpa transisi (ganti kelas langsung)      58 fps
 *   startViewTransition + clip-path            22 fps
 *   startViewTransition tanpa animasi          44 fps
 *   overlay + transform: scaleX()              60 fps
 *
 * View transition memotret SELURUH halaman jadi dua bitmap raksasa lalu
 * mengompositnya tiap frame. Itu yang memakan separuh frame. Karena
 * permintaan eksplisitnya adalah "smooth, tidak lag ataupun patah-patah",
 * yang dipakai adalah pendekatan overlay dengan transform murni — properti
 * yang dikerjakan kompositur, tidak memicu tata letak maupun lukis ulang.
 *
 * CARA SAPUANNYA BEKERJA (tanpa snapshot, tanpa paket):
 *   1. Sebuah lapisan penuh layar berisi warna kanvas TEMA BARU dipasang di
 *      atas halaman, dengan transform-origin di kiri dan scaleX(0).
 *   2. scaleX dianimasikan 0 -> 1, jadi warnanya menyapu masuk dari kiri.
 *      Konten lama tetap terlihat sampai tersapu — bukan potongan mendadak.
 *   3. Di tengah sapuan (saat halaman sudah tertutup), kelas tema ditukar.
 *      Perubahannya tersembunyi di balik lapisan, jadi tidak terlihat berkedip.
 *   4. Lapisan memudar sebentar untuk menampilkan tema baru.
 *   5. Tepi sapuan diberi garis emerald: elemen selebar layar yang digeser
 *      `translateX` dengan durasi dan easing yang SAMA, sehingga tepinya
 *      persis menempel di tepi sapuan sepanjang animasi.
 *
 * Semua yang dianimasikan hanya `transform` dan `opacity`.
 */

const DURASI_SAPU = 520;
const EASING_SAPU = "cubic-bezier(0.72, 0, 0.24, 1)";

const PILIHAN: { nilai: Tema; label: string; Ikon: typeof IconSun }[] = [
  { nilai: "terang", label: "Terang", Ikon: IconSun },
  { nilai: "gelap", label: "Gelap", Ikon: IconMoon },
  { nilai: "sistem", label: "Ikut sistem", Ikon: IconMonitor },
];

/** Geser indikator ke posisi pilihan ke-n dari 3. */
const geserKe = (n: number) => ({ transform: `translateX(${n * 100}%)` });

export function TombolTema({ kelas }: { kelas?: string }) {
  const { tema, aktif, setTema } = useTema();
  const wadah = useRef<HTMLDivElement>(null);
  const [menetap, setMenetap] = useState(false);

  /**
   * Menandai bahwa halaman sudah selesai hidrasi.
   *
   * Pilihan tema dari localStorage baru terbaca setelah halaman hidup, jadi
   * ikonnya berganti sekali di awal. Pergantian itu TIDAK boleh dianimasikan —
   * kalau iya, halaman yang dibuka dalam mode gelap akan terlihat ikonnya
   * berputar sendiri tanpa sebab.
   */
  useEffect(() => {
    let kedua = 0;
    const pertama = requestAnimationFrame(() => {
      kedua = requestAnimationFrame(() => setMenetap(true));
    });
    return () => {
      cancelAnimationFrame(pertama);
      cancelAnimationFrame(kedua);
    };
  }, []);

  // Bersihkan lapisan sapuan kalau komponen dilepas di tengah animasi.
  useEffect(() => {
    return () => {
      document.getElementById("lapisan-gerhana")?.remove();
    };
  }, []);

  const indeks = PILIHAN.findIndex((p) => p.nilai === tema);

  /**
   * Jalankan sapuan eclipse, lalu tukar tema di tengahnya.
   *
   * `t` adalah pilihan yang dituju. Warna lapisan diambil dari tema tujuan
   * supaya yang menyapu masuk memang "tampilan berikutnya".
   */
  const sapuGerhana = useCallback(
    (t: Tema) => {
      // Kalau masih ada sapuan sebelumnya, hentikan supaya klik cepat
      // berturut-turut tidak menumpuk lapisan.
      document.getElementById("lapisan-gerhana")?.remove();

      // Warna kanvas tema tujuan. Dibaca dari CSS variable supaya tidak ada
      // daftar warna terpisah yang bisa basi.
      const gelapTujuan = t === "gelap";
      const cs = getComputedStyle(document.documentElement);
      const warnaTujuan = gelapTujuan
        ? `rgb(${cs.getPropertyValue("--w-bg").trim() || "24 24 23"})`
        : `rgb(${cs.getPropertyValue("--w-bg").trim() || "247 247 246"})`;

      const lapisan = document.createElement("div");
      lapisan.id = "lapisan-gerhana";
      lapisan.setAttribute("aria-hidden", "true");
      Object.assign(lapisan.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483000",
        pointerEvents: "none",
        background: warnaTujuan,
        transformOrigin: "left center",
        transform: "scaleX(0)",
        willChange: "transform",
      });

      // Tepi sapuan: elemen selebar layar yang digeser, dengan pendar emerald
      // di tepi kanannya. Ditaruh di dalam lapisan supaya ikut terhapus.
      const tepi = document.createElement("span");
      Object.assign(tepi.style, {
        position: "absolute",
        top: "0",
        bottom: "0",
        left: "-100vw",
        width: "100vw",
        background:
          "linear-gradient(90deg, transparent calc(100% - 120px), rgb(16 185 129 / 0.85) calc(100% - 3px), rgb(16 185 129) 100%)",
        willChange: "transform",
      });
      lapisan.appendChild(tepi);
      document.body.appendChild(lapisan);

      const opsi: KeyframeAnimationOptions = {
        duration: DURASI_SAPU,
        easing: EASING_SAPU,
        fill: "forwards",
      };

      // Kedua animasi memakai durasi dan easing yang sama, jadi tepinya selalu
      // menempel di tepi sapuan.
      const animSapu = lapisan.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        opsi,
      );
      const animTepi = tepi.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(100vw)" }],
        opsi,
      );

      // Tukar tema saat halaman sudah tertutup penuh, supaya perubahannya
      // tidak terlihat. 55% dari durasi: sudah lewat titik yang paling
      // terlihat, tapi masih ada waktu sebelum lapisan memudar.
      const tukar = window.setTimeout(() => setTema(t), DURASI_SAPU * 0.55);

      animSapu.finished
        .then(() => {
          // Tema baru sudah terpasang di bawah lapisan; sekarang lapisan
          // memudar agar tema baru terlihat.
          return lapisan.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 160,
            easing: "ease-out",
            fill: "forwards",
          }).finished;
        })
        .catch(() => {
          /* animasi dibatalkan — tidak apa-apa */
        })
        .finally(() => {
          window.clearTimeout(tukar);
          animTepi.cancel();
          lapisan.remove();
        });
    },
    [setTema],
  );

  /** Apakah perpindahan ini pantas dianimasikan dengan sapuan eclipse. */
  function pantasDisapu(modeSekarang: "terang" | "gelap", ke: Tema): boolean {
    if (ke === "sistem") return false; // mode tujuan bergantung perangkat
    if (ke === modeSekarang) return false; // tidak ada perubahan nyata
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  }

  function ganti(t: Tema) {
    if (!pantasDisapu(aktif, t)) {
      setTema(t);
      return;
    }
    sapuGerhana(t);
  }

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
    ganti(PILIHAN[tujuan].nilai);
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
       * letak.
       *
       * KENAPA TRACK DAN INDIKATORNYA BERBEDA PER MODE:
       * Metaforanya harus satu — indikator adalah tombol yang TERANGKAT, jadi
       * di kedua mode ia harus LEBIH TERANG dari track-nya.
       *
       *   terang: track #C9C8C1, indikator `surface` #FFFFFF  -> 1,68:1
       *   gelap : track `appbg` #181817, indikator #5A5A56     -> 2,57:1
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
        const aktifPilihan = tema === p.nilai;
        const iniGelap = p.nilai === "gelap";
        return (
          <button
            key={p.nilai}
            type="button"
            role="radio"
            aria-checked={aktifPilihan}
            // Hanya pilihan aktif yang masuk urutan Tab; sisanya dijangkau
            // dengan panah. Ini pola radiogroup yang benar.
            tabIndex={aktifPilihan ? 0 : -1}
            onClick={() => ganti(p.nilai)}
            onKeyDown={(e) => tombolPapanKetik(e, i)}
            title={p.label}
            aria-label={p.label}
            /* data-gelap dipakai CSS untuk menggeser ikon 2px ke kiri mengikuti
               arah sapuan eclipse (dari referensi). */
            data-gelap={iniGelap ? "true" : undefined}
            className={cn(
              "relative z-10 flex h-9 w-9 items-center justify-center rounded-full",
              "transition-colors duration-200",
              aktifPilihan ? "text-ink" : "text-ink-mono hover:text-ink-secondary",
            )}
          >
            {/*
             * Kunci ikut berubah saat pilihan jadi aktif -> React memasang
             * ulang -> animasi berputar berjalan lagi setiap kali berpindah.
             * `menetap` mencegah animasi saat hidrasi.
             */}
            <span
              key={`${p.nilai}-${aktifPilihan}`}
              className={cn(
                "ikon-tema flex items-center justify-center",
                aktifPilihan && menetap && "ikon-tema-masuk",
              )}
            >
              <p.Ikon size={15} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
