"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSun, IconMoon, IconMonitor } from "@/components/shared/icons";
import { useTema, type Tema } from "@/components/shared/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema — tiga posisi (Terang / Gelap / Ikut sistem), dengan
 * transisi halaman "eclipse".
 *
 * KONSEP DARI uiarc.dev/components/theme-switch, varian `eclipse`.
 *
 * CATATAN PENTING SOAL REFERENSI ITU:
 * Komponen rujukannya HANYA tombolnya. Dokumentasinya menyebut jelas: "The
 * page transition itself is yours to run" — sapuan halamannya bukan bagian
 * dari paket, harus ditulis sendiri. Jadi bagian tombol mengikuti referensi,
 * dan sapuannya ditulis di sini.
 *
 * APA YANG DIAMBIL DARI REFERENSI (varian eclipse):
 *
 *   - KEDUA IKON BERPUTAR SEARAH DALAM SATU TRANSISI. Ini inti efeknya, dan
 *     mudah terlewat. Tiap ikon punya sudut tetap: matahari +30 derajat,
 *     bulan -30 derajat. Saat ikon MASUK ia mulai dari sudut itu lalu berputar
 *     ke nol; saat ikon KELUAR ia berputar dari nol ke sudut itu.
 *
 *     Menuju gelap  : bulan masuk dari -30 (searah jarum jam), matahari
 *                     keluar menuju +30 (searah jarum jam juga).
 *     Menuju terang : keduanya berlawanan jarum jam.
 *
 *     Karena arahnya sama, mata membacanya sebagai SATU putaran. Kalau ikon
 *     yang keluar dibiarkan menghilang begitu saja (tanpa dianimasikan),
 *     yang terlihat adalah dua benda berbeda yang muncul bergantian.
 *
 *   - Sudut masuk 30 derajat, skala 0,7 -> 1, blur 2px -> 0.
 *   - Putaran dan skala memakai easing yang MELEWATI nilai akhir (overshoot)
 *     supaya terasa hidup; opacity dan blur TIDAK — kalau ikut melewati,
 *     `blur()` bisa jadi negatif, dan itu bukan nilai yang sah. Karena itu
 *     ada dua animasi terpisah, bukan satu.
 *   - Petunjuk arah: varian eclipse menggeser ikon terpilih 2px ke kiri,
 *     searah dengan sapuan halaman yang bergerak horizontal.
 *   - `useSettled`: pergantian tema saat hidrasi (dari localStorage) TIDAK
 *     dianimasikan. Tanpa ini, halaman yang dibuka dalam mode gelap akan
 *     terlihat ikonnya berputar sendiri tanpa ada yang menekan apa pun.
 *
 * DUA BUG YANG DIPERBAIKI DI VERSI INI:
 *
 *   1. SAPUAN MEMAKAI WARNA TEMA YANG DITINGGALKAN, BUKAN YANG DITUJU.
 *      Versi lama membaca `--w-bg` lewat getComputedStyle SEBELUM kelas tema
 *      ditukar. Karena `--w-bg` berbeda per mode (247 247 246 di terang,
 *      24 24 23 di gelap), yang terbaca selalu warna halaman LAMA. Jadi saat
 *      pindah ke gelap, lapisan yang menyapu justru putih — bukan hitam.
 *      Sekarang warna diambil dari `--kanvas-terang` / `--kanvas-gelap`, dua
 *      variabel yang sengaja TIDAK ditimpa di `.dark`, jadi nilainya benar
 *      dibaca kapan saja.
 *
 *   2. IKON BULAN SELALU TERGESER 2px.
 *      Aturan lama `[role="radio"][data-gelap="true"] .ikon-tema` cocok setiap
 *      saat — bukan hanya saat pilihan gelap sedang AKTIF. Jadi ikon bulan
 *      tampak tidak sejajar dengan dua ikon lainnya, permanen. Sekarang
 *      pergeseran hanya berlaku pada tombol yang sedang terpilih, dan
 *      mengikuti MODE YANG SEDANG TAMPIL (jadi "ikut sistem" yang kebetulan
 *      gelap juga benar arahnya).
 *
 * KENAPA TIDAK MEMAKAI `document.startViewTransition`:
 * Itu yang pertama dicoba, dan hasil pengukurannya:
 *
 *   tanpa transisi (ganti kelas langsung)      58 fps
 *   startViewTransition + clip-path            22 fps
 *   startViewTransition tanpa animasi          44 fps
 *   overlay + transform: translateX()          60 fps
 *
 * View transition memotret SELURUH halaman jadi dua bitmap raksasa lalu
 * mengompositnya tiap frame — biaya itu melekat, bukan soal penyetelan.
 * Karena permintaannya "smooth, tidak lag ataupun patah-patah", yang dipakai
 * adalah lapisan dengan transform murni.
 *
 * CARA SAPUANNYA BEKERJA:
 *   Satu lapisan selebar layar berisi warna kanvas TEMA TUJUAN bergerak
 *   menyeberangi halaman dari kiri ke kanan:
 *
 *     translateX(-120vw) -> translateX(0) -> translateX(120vw)
 *
 *   Saat berada di titik tengah, lapisan menutup penuh. Di detik itulah kelas
 *   tema ditukar, jadi perubahannya tersembunyi di balik lapisan. Setelah
 *   lewat, tepi belakangnya membuka dan memperlihatkan tema baru.
 *
 *   Karena easing-nya simetris, 50% waktu = 50% jarak = tepat saat menutup.
 *   Tidak perlu menghitung ulang timing kalau durasinya diubah.
 *
 *   Tepi depan dan tepi belakang diberi bulu (gradien) supaya tidak ada garis
 *   keras yang menusuk layar. Hanya `transform` yang dianimasikan.
 */

/** Durasi satu lintasan penuh (menyeberang dari luar kiri ke luar kanan). */
const DURASI_SAPU = 700;
/**
 * Easing simetris. Sifat simetris inilah yang membuat "50% waktu = 50% jarak",
 * sehingga penukaran tema bisa dijadwalkan tepat di DURASI_SAPU / 2 tanpa
 * menghitung ulang kurvanya.
 */
const EASING_SAPU = "cubic-bezier(0.65, 0, 0.35, 1)";
/**
 * Lebar bulu di tepi sapuan.
 *
 * Diukur: lapisan SOLID tanpa bulu = 60 fps, dengan bulu 220px = 44 fps.
 * Jadi bulunya yang mahal — biayanya sebanding LUAS gradien yang harus
 * dilukis ulang tiap frame, bukan jumlah elemennya. 64px masih cukup untuk
 * menghilangkan garis keras di tepi, dengan biaya jauh lebih kecil.
 */
const LEBAR_BULU = 64;
/** Lama ikon lama ditahan agar bisa dianimasikan keluar. */
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

/**
 * Warna kanvas untuk satu mode.
 *
 * Dibaca dari `--kanvas-terang` / `--kanvas-gelap` — dua variabel yang
 * didaftarkan di `:root` dan SENGAJA tidak ditimpa di `.dark`. Kalau memakai
 * `--w-bg` (yang memang berbeda per mode), nilainya bergantung pada tema yang
 * sedang terpasang — dan saat lapisan sapuan disiapkan, tema lama masih
 * terpasang.
 */
function warnaKanvas(gelap: boolean): string {
  const cs = getComputedStyle(document.documentElement);
  const v = cs.getPropertyValue(gelap ? "--kanvas-gelap" : "--kanvas-terang").trim();
  // Cadangan kalau variabelnya belum ada, supaya sapuan tidak pernah menjadi
  // lapisan transparan yang tak terlihat.
  return `rgb(${v || (gelap ? "24 24 23" : "247 247 246")})`;
}

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
   * KENAPA DIPICU OLEH PERUBAHAN TEMA, BUKAN OLEH KLIK:
   * Ini kesalahan halus yang sempat terjadi. Tema baru tidak langsung
   * terpasang saat tombol ditekan — ia berganti 350ms kemudian, saat lapisan
   * sapuan sudah menutup penuh. Kalau animasi ikon dipicu saat KLIK, ikon
   * baru berputar masuk lebih dulu, lalu 350ms kemudian dipasang ulang lagi
   * saat temanya benar-benar berganti — dan ikon lama sempat muncul kembali
   * di antaranya. Hasilnya tiga gerakan berturut-turut, bukan satu.
   *
   * Dengan memicunya dari perubahan `tema`, ikon lama dan ikon baru berputar
   * BERSAMAAN, tepat saat tema berganti — satu gerakan, sesuai referensi.
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

  // Bersihkan lapisan sapuan dan timer kalau komponen dilepas.
  useEffect(() => {
    return () => {
      document.getElementById("lapisan-gerhana")?.remove();
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
    (ke: Tema, modeTujuan: "terang" | "gelap") => {
      // Klik cepat berturut-turut tidak boleh menumpuk lapisan.
      document.getElementById("lapisan-gerhana")?.remove();

      const warna = warnaKanvas(modeTujuan === "gelap");

      const lapisan = document.createElement("div");
      lapisan.id = "lapisan-gerhana";
      lapisan.setAttribute("aria-hidden", "true");
      Object.assign(lapisan.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "2147483000",
        pointerEvents: "none",
        background: warna,
        willChange: "transform",
      });

      // Bulu di kedua tepi. Tanpa ini, tepi sapuan adalah garis lurus keras
      // yang terlihat seperti potongan gambar, bukan seperti bayangan lewat.
      for (const sisi of ["kanan", "kiri"] as const) {
        const s = document.createElement("span");
        Object.assign(s.style, {
          position: "absolute",
          top: "0",
          bottom: "0",
          width: `${LEBAR_BULU}px`,
          ...(sisi === "kanan" ? { left: "100%" } : { right: "100%" }),
          // `transparent` di CSS sama dengan rgba(0,0,0,0) — hitam transparan.
          // Saat diinterpolasi menuju warna kanvas yang terang, mesin render
          // bisa melewati hitam dan meninggalkan noda gelap di tepi. Menulis
          // alpha 0 dari WARNA YANG SAMA membuat interpolasinya bersih.
          background:
            sisi === "kanan"
              ? `linear-gradient(90deg, ${warna}, ${warna.replace("rgb(", "rgba(").replace(")", ", 0)")})`
              : `linear-gradient(90deg, ${warna.replace("rgb(", "rgba(").replace(")", ", 0)")}, ${warna})`,
        });
        lapisan.appendChild(s);
      }

      document.body.appendChild(lapisan);

      const anim = lapisan.animate(
        [{ transform: "translateX(-120vw)" }, { transform: "translateX(120vw)" }],
        { duration: DURASI_SAPU, easing: EASING_SAPU, fill: "forwards" },
      );

      // Tukar tepat saat lapisan menutup penuh. Karena easing-nya simetris,
      // titik itu ada di separuh waktu.
      const tukar = window.setTimeout(() => setTema(ke), DURASI_SAPU / 2);

      anim.finished
        .catch(() => {
          /* animasi dibatalkan — tidak apa-apa */
        })
        .finally(() => {
          window.clearTimeout(tukar);
          lapisan.remove();
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

    sapuGerhana(t, modeTujuan);
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
