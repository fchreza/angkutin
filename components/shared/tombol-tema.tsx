"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { IconSun, IconMoon, IconMonitor } from "@/components/shared/icons";
import { useTema, type Tema } from "@/components/shared/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema — tiga pilihan (terang / gelap / ikut sistem), dengan
 * transisi halaman Eclipse berbentuk reveal melingkar melalui View Transitions.
 * Ikon dan aksesibilitas tombol mengikuti referensi UIArc; transisi halaman
 * dibuat di aplikasi karena komponen referensi hanya menyediakan callback.
 */
const DURASI_KELUAR = 240;

const PILIHAN: { nilai: Tema; label: string; Ikon: typeof IconSun }[] = [
  { nilai: "terang", label: "Terang", Ikon: IconSun },
  { nilai: "gelap", label: "Gelap", Ikon: IconMoon },
  { nilai: "sistem", label: "Ikut sistem", Ikon: IconMonitor },
];

/**
 * Sudut tetap tiap ikon. Dipakai DUA arah: sebagai titik awal saat ikon masuk,
 * dan sebagai titik akhir saat ikon keluar. Itulah yang membuat kedua ikon
 * berputar searah dalam satu transisi.
 */
const SUDUT: Record<Tema, string> = {
  terang: "30deg", // matahari
  gelap: "-30deg", // bulan
  sistem: "0deg", // monitor — tidak berputar
};

/** Geser indikator ke posisi pilihan ke-n dari 3. */
const geserKe = (n: number) => ({ transform: `translateX(${n * 100}%)` });

/** Mode yang benar-benar tampil untuk sebuah pilihan (menyelesaikan "sistem"). */
function modeDari(t: Tema): "terang" | "gelap" {
  if (t !== "sistem") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "gelap" : "terang";
}

export function TombolTema({ kelas }: { kelas?: string }) {
  const { tema, aktif, setTema } = useTema();
  const wadah = useRef<HTMLDivElement>(null);
  const [menetap, setMenetap] = useState(false);
  /**
   * Keadaan animasi ikon: nomor generasi + ikon mana yang sedang keluar.
   *
   * Sumber pemicu adalah perubahan state tema, bukan klik. Dengan begitu ikon
   * lama dan baru mulai bergerak saat tema benar-benar diperbarui, dan
   * hidrasi tetap tidak memicu animasi sebelum halaman menetap.
   */
  const [animasi, setAnimasi] = useState<{ generasi: number; keluar: Tema | null }>({
    generasi: 0,
    keluar: null,
  });
  const timerKeluar = useRef<number | undefined>(undefined);
  /** Tema pada render sebelumnya, untuk tahu pilihan mana yang ditinggalkan. */
  const temaSebelumnya = useRef(tema);

  /** Menandai halaman sudah selesai hidrasi (dua frame setelah pasang). */
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

  // Bersihkan timer animasi ikon kalau komponen dilepas.
  useEffect(() => {
    return () => {
      window.clearTimeout(timerKeluar.current);
    };
  }, []);

  /**
   * Animasi ikon dipicu di sini — saat TEMA benar-benar berganti.
   *
   * Selama halaman belum menetap, perubahan tema hanya dicatat tanpa
   * dianimasikan. Itu yang mencegah halaman bermode gelap memutar ikonnya
   * sendiri saat dimuat (tema tersimpan baru terbaca setelah hidrasi).
   */
  useEffect(() => {
    if (!menetap) {
      temaSebelumnya.current = tema;
      return;
    }
    if (temaSebelumnya.current === tema) return;

    const lama = temaSebelumnya.current;
    temaSebelumnya.current = tema;

    // Hormati preferensi kurangi gerak.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setAnimasi((a) => ({ generasi: a.generasi + 1, keluar: lama }));
    window.clearTimeout(timerKeluar.current);
    timerKeluar.current = window.setTimeout(
      () => setAnimasi((a) => ({ ...a, keluar: null })),
      DURASI_KELUAR,
    );
  }, [tema, menetap]);

  const indeks = PILIHAN.findIndex((p) => p.nilai === tema);
  const gelapAktif = aktif === "gelap";

  const sapuGerhana = useCallback(
    (ke: Tema) => {
      const mulaiTransisi = (
        document as Document & {
          startViewTransition?: (callback: () => void) => { finished: Promise<void> };
        }
      ).startViewTransition;

      // Browser tanpa View Transitions tetap dapat berganti tema, tanpa efek
      // sapuan yang berbeda dari Eclipse.
      if (!mulaiTransisi) {
        setTema(ke);
        return;
      }

      const transisi = mulaiTransisi.call(document, () => {
        flushSync(() => setTema(ke));
      });
      void transisi.finished.catch(() => {
        /* Tema sudah diterapkan; pembatalan hanya menghentikan animasinya. */
      });
    },
    [setTema],
  );

  function ganti(t: Tema) {
    if (t === tema) return;

    // Animasi ikon TIDAK dipicu di sini — lihat efek di atas. Ia dipicu saat
    // `tema` benar-benar berganti, supaya ikon lama dan baru berputar
    // bersamaan alih-alih bergantian.

    const modeTujuan = modeDari(t);

    const kurangiGerak =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Tidak ada perubahan yang terlihat (mis. dari "gelap" ke "ikut sistem"
    // saat perangkat memang gelap) -> tidak perlu menyapu halaman.
    if (modeTujuan === aktif || kurangiGerak) {
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
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      tujuan = (i - 1 + PILIHAN.length) % PILIHAN.length;
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
      /* data-gelap di sini berarti MODE YANG SEDANG TAMPIL, bukan tombol
         "Gelap" sedang aktif. Dipakai CSS untuk menggeser ikon terpilih
         mengikuti arah sapuan eclipse — dan ikut benar saat "ikut sistem"
         kebetulan sedang gelap. */
      data-gelap={gelapAktif ? "true" : undefined}
      className={cn(
        "relative inline-flex items-center rounded-full border border-line p-[3px]",
        "bg-[#C9C8C1] dark:border-line dark:bg-appbg",
        menetap && "menetap",
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
        const sedangKeluar = animasi.keluar === p.nilai;

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
            className={cn(
              "relative z-10 flex h-9 w-9 items-center justify-center rounded-full",
              /*
               * AREA TEKAN DIPERLUAS tanpa mengubah tampilan.
               *
               * KENAPA bukan h-11 w-11 (44px) langsung: pil ini tingginya
               * 36px + padding 3px = 42px, dan navbar desktop hanya 56px.
               * Kalau tombolnya dinaikkan ke 44px, pilnya jadi 50px dan
               * navbar terasa penuh. Jadi ukuran visualnya tetap 36px,
               * sementara area yang bisa ditekan diperluas jadi 44px lewat
               * lapisan ::after yang meluber keluar.
               *
               * `::after` tetap bagian dari tombolnya, jadi klik dan sentuhan
               * di area meluber itu tetap dihitung sebagai menekan tombol ini.
               * Ini syarat WCAG 2.5.5 (sasaran sentuh 44px).
               */
              "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
              "transition-colors duration-200",
              aktifPilihan ? "text-ink" : "text-ink-mono hover:text-ink-secondary",
            )}
          >
            {/* Bungkus luar: hanya membawa pergeseran 2px arah sapuan. */}
            <span className="ikon-bungkus relative flex items-center justify-center">
              {sedangKeluar ? (
                /*
                 * Ikon yang KELUAR. Tetap berada di tombolnya yang lama, jadi
                 * ia berputar di tempatnya sendiri — bukan melompat ke posisi
                 * tombol baru.
                 */
                <span
                  key={`keluar-${p.nilai}-${animasi.generasi}`}
                  className="ikon-tema ikon-tema-keluar flex items-center justify-center"
                  style={{ "--ikon-sudut": SUDUT[p.nilai] } as React.CSSProperties}
                  aria-hidden
                >
                  <p.Ikon size={15} />
                </span>
              ) : (
                /*
                 * `key` berubah saat generasi naik -> React memasang ulang ikon
                 * -> animasi masuknya berjalan.
                 *
                 * Hanya pilihan AKTIF yang ikut memakai generasi. Kalau semua
                 * ikon memakainya, ketiganya dipasang ulang setiap kali pilihan
                 * berpindah — dua ikon yang tidak berubah ikut berkedip.
                 */
                <span
                  key={aktifPilihan ? `${p.nilai}-${animasi.generasi}` : p.nilai}
                  className={cn(
                    "ikon-tema flex items-center justify-center",
                    aktifPilihan && menetap && animasi.generasi > 0 && "ikon-tema-masuk",
                  )}
                  style={{ "--ikon-sudut": SUDUT[p.nilai] } as React.CSSProperties}
                >
                  <p.Ikon size={15} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
