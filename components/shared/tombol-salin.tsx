"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconCheck, IconAlert, IconCopy } from "./icons";

/**
 * Tombol salin dengan konfirmasi yang tenang.
 *
 * KONSEP DARI uiarc.dev/components/copy-button.
 *
 * APA YANG DIAMBIL DARI REFERENSI:
 *
 *   - LEBAR TOMBOL TIDAK PERNAH BERUBAH. Ini yang paling penting dan paling
 *     mudah terlewat. Sel labelnya menyimpan ruang untuk tulisan TERPANJANG
 *     ("Tersalin"), lalu tulisan yang terlihat ditumpuk di atasnya. Jadi
 *     tombol tidak melebar atau menyempit saat tulisannya berganti — kalau
 *     tidak begitu, tombol di sebelahnya ikut bergeser dan tata letaknya
 *     terasa bergetar.
 *
 *   - HANYA HURUF YANG BERUBAH YANG DIANIMASIKAN. "Salin" -> "Tersalin":
 *     huruf S, a, l, i, n sudah sama di depan, jadi kelimanya TETAP dan hanya
 *     "Tersalin" yang naik masuk. Yang berganti bukan seluruh kata, hanya
 *     bagian yang memang baru. Efeknya terbaca sebagai kata yang berubah
 *     bentuk, bukan dua kata yang saling menggantikan.
 *
 *   - HURUF NAIK DARI BLUR HALUS, bukan muncul begitu saja. Yang keluar naik
 *     sedikit lebih cepat daripada yang masuk, jadi tidak ada yang terasa
 *     "menunggu".
 *
 *   - IKON BERGANTI dengan mengecil ke dalam blur sambil ikon baru tumbuh
 *     dari blur itu. Ikon centangnya DIGAMBAR seperti ditulis tangan:
 *     `pathLength` dianimasikan dari 0 ke 1, jadi garisnya tumbuh dari awal
 *     goresan, bukan muncul utuh.
 *
 *   - TIGA KEADAAN: idle, tersalin, gagal. Kalau clipboard ditolak browser,
 *     tombolnya berkata "Gagal" dengan ikon peringatan — bukan diam-diam
 *     tidak melakukan apa-apa.
 *
 *   - Pengumuman untuk pembaca layar lewat `role="status" aria-live="polite"`,
 *     terpisah dari teks yang terlihat. Teks yang terlihat diberi
 *     `aria-hidden` supaya tidak dibacakan dua kali.
 *
 * YANG SENGAJA TIDAK DIPAKAI:
 *   `motion` (framer-motion) dan `lucide-react` dari referensi. Referensinya
 *   memakainya untuk menganimasikan huruf dan menggambar centang. Keduanya
 *   bisa dikerjakan CSS: huruf lewat satu keyframes dengan delay per huruf,
 *   centang lewat animasi `stroke-dashoffset`. Menambah ~1,1 MB untuk itu
 *   tidak sepadan.
 *
 * YANG DIPERTAHANKAN DARI KODE LAMA:
 *   Fallback `document.execCommand("copy")` untuk browser tanpa Clipboard API
 *   (mis. halaman yang dibuka lewat HTTP non-secure). Tanpa itu, tombolnya
 *   gagal total di lingkungan seperti itu.
 */

type Keadaan = "idle" | "tersalin" | "gagal";

/** Lama konfirmasi bertahan sebelum kembali ke keadaan awal. */
const DURASI_FEEDBACK = 1900;

/** Salin ke clipboard, dengan fallback untuk konteks non-secure. */
async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    // jatuh ke cara lama di bawah
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = teks;
    // Harus ada di dokumen dan tidak boleh menggeser tampilan.
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const berhasil = document.execCommand("copy");
    ta.remove();
    return berhasil;
  } catch {
    return false;
  }
}

/**
 * Pecah teks jadi huruf-huruf dengan identitas yang stabil.
 *
 * Huruf yang SAMA di posisi yang sama mempertahankan id-nya, jadi React tidak
 * memasangnya ulang dan hanya huruf yang benar-benar baru yang dianimasikan.
 *
 * Perbandingannya dilakukan dari DUA ujung: awal yang sama dan akhir yang
 * sama. Itu yang membuat "Salin" -> "Tersalin" hanya menambah huruf, bukan
 * mengganti semuanya. Kalau huruf yang sama di ujungnya kurang dari 2, ujung
 * itu dianggap tidak sama — supaya satu huruf kebetulan yang sama tidak
 * membuat animasinya aneh.
 */
function pecahHuruf(
  lama: string,
  baru: string,
  idLama: string[],
): { char: string; id: string }[] {
  const a = [...lama];
  const b = [...baru];

  let depan = 0;
  while (depan < a.length && depan < b.length && a[depan] === b[depan]) depan++;

  let belakang = 0;
  while (
    belakang < a.length - depan &&
    belakang < b.length - depan &&
    a[a.length - 1 - belakang] === b[b.length - 1 - belakang]
  )
    belakang++;

  if (depan < 2) depan = 0;
  if (belakang < 2) belakang = 0;

  const nomor = (Number(idLama[idLama.length - 1]?.split(":")[0]) || 0) + 1;

  const awal = idLama.slice(0, depan).map((id, i) => ({ char: b[i], id }));
  const tengah = b.slice(depan, b.length - belakang).map((char, i) => ({
    char,
    id: `${nomor}:${i}`,
  }));
  const akhir = idLama
    .slice(idLama.length - belakang)
    .map((id, i) => ({ char: b[b.length - belakang + i], id }));

  return [...awal, ...tengah, ...akhir];
}

export function TombolSalin({
  nilai,
  label = "Salin",
  labelTersalin = "Tersalin",
  labelGagal = "Gagal",
  varian = "outline",
  className,
  onTersalin,
}: {
  /** Teks yang disalin. */
  nilai: string;
  label?: string;
  labelTersalin?: string;
  labelGagal?: string;
  varian?: "primary" | "outline" | "plain";
  className?: string;
  /** Dipanggil setelah berhasil disalin. */
  onTersalin?: () => void;
}) {
  const [keadaan, setKeadaan] = useState<Keadaan>("idle");
  const [huruf, setHuruf] = useState(() =>
    [...label].map((char, i) => ({ char, id: `0:${i}` })),
  );
  const waktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teks =
    keadaan === "tersalin"
      ? labelTersalin
      : keadaan === "gagal"
        ? labelGagal
        : label;

  /**
   * Hitung ulang huruf saat teksnya berganti.
   *
   * Dilakukan di dalam render (bukan di useEffect) supaya huruf yang baru
   * sudah benar pada frame yang sama — kalau di efek, akan ada satu frame
   * yang masih menampilkan susunan huruf lama.
   */
  const teksSebelumnya = useRef(teks);
  if (teksSebelumnya.current !== teks) {
    const lama = teksSebelumnya.current;
    teksSebelumnya.current = teks;
    setHuruf((h) => pecahHuruf(lama, teks, h.map((x) => x.id)));
  }

  // Bersihkan timer kalau komponen dilepas di tengah konfirmasi.
  useEffect(() => {
    return () => {
      if (waktu.current) clearTimeout(waktu.current);
    };
  }, []);

  const salin = useCallback(async () => {
    if (waktu.current) clearTimeout(waktu.current);
    const berhasil = await salinTeks(nilai);
    setKeadaan(berhasil ? "tersalin" : "gagal");
    if (berhasil) onTersalin?.();
    waktu.current = setTimeout(() => setKeadaan("idle"), DURASI_FEEDBACK);
  }, [nilai, onTersalin]);

  const gaya = {
    primary:
      "bg-primary text-primary-teks border-primary hover:bg-primary-dark active:bg-primary-dark",
    outline:
      "bg-surface text-ink border-line hover:bg-appbg active:bg-appbg",
    plain:
      "bg-transparent text-ink-secondary border-transparent hover:bg-appbg hover:text-ink",
  }[varian];

  return (
    <>
      <button
        type="button"
        onClick={() => void salin()}
        aria-label={label}
        data-keadaan={keadaan}
        /* Kelas `press` memberi umpan balik tekan (mengecil). Aman di sini —
           tidak seperti pemicu dropdown, tombol ini tidak diukur saat ditekan. */
        className={cn(
          "press inline-flex h-11 shrink-0 items-center justify-center gap-2",
          "rounded-md border px-3.5 text-[13.5px] font-semibold",
          "transition-colors duration-150",
          gaya,
          className,
        )}
      >
        {/* Ikon: berganti dengan mengecil ke dalam blur. */}
        <span
          className="relative grid h-4 w-4 shrink-0 place-items-center"
          aria-hidden
        >
          <span
            key={keadaan}
            data-keadaan={keadaan}
            className={cn(
              "ikon-salin absolute inset-0 grid place-items-center",
              /*
               * WARNA IKON MENGIKUTI WARNA TEKS TOMBOL, bukan warna aksen.
               *
               * Ini kesalahan yang terukur: versi pertama memakai `text-primary`
               * untuk centangnya. Pada tombol primary, latarnya JUGA primary
               * (#047857), jadi kontrasnya 1:1 — centangnya benar-benar tidak
               * terlihat. Ikon harus mewarisi warna teks tombol supaya selalu
               * kontras dengan latarnya, apa pun varian tombolnya.
               *
               * Ikon peringatan tetap memakai warna danger: itu sinyal, bukan
               * hiasan, dan tombol primary tidak pernah punya latar merah.
               */
              keadaan === "gagal" && "text-danger",
            )}
          >
            {keadaan === "tersalin" ? (
              <CentangDigambar />
            ) : keadaan === "gagal" ? (
              <IconAlert size={16} />
            ) : (
              <IconCopy size={16} />
            )}
          </span>
        </span>

        {/*
         * Sel label. Menyimpan ruang untuk tulisan TERPANJANG lewat teks
         * tak-terlihat, lalu tulisan yang terlihat ditumpuk di sel yang sama.
         * Itulah yang membuat lebar tombol tidak pernah berubah.
         *
         * `overflow-x: clip` memotong huruf yang sedang bergerak keluar dari
         * kotaknya, dan padding sebaris memberi ruang supaya huruf di tepi
         * tidak terpotong sebelum blur-nya selesai.
         */}
        <span
          className="relative grid min-w-0 overflow-x-clip px-1 [margin-inline:-4px]"
          aria-hidden
        >
          <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
            {label}
          </span>
          <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
            {labelTersalin}
          </span>
          <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
            {labelGagal}
          </span>

          {/*
           * Barisan huruf yang terlihat DIPOSISIKAN ABSOLUT, bukan ikut aliran.
           *
           * Ini penting dan sempat salah: kalau barisan ini ikut aliran, ia
           * TURUT menentukan lebar sel. Setiap huruf adalah kotak inline-block
           * tersendiri, dan pembulatan sub-pixel tiap kotak menumpuk — delapan
           * huruf "Tersalin" menghasilkan ~1px lebih lebar daripada teks
           * "Tersalin" utuh di span tersembunyi. Akibatnya tombol melebar 1px
           * saat berubah dari "Salin" ke "Tersalin".
           *
           * Dengan posisi absolut, ia tidak menyumbang lebar sama sekali; lebar
           * sel sepenuhnya ditentukan oleh tiga teks tersembunyi di atas —
           * yang terpanjang adalah "Tersalin". Karena itu lebar tombol benar-
           * benar tidak pernah berubah.
           *
           * `left-1` (4px) menyamai `px-1` pada sel, supaya hurufnya sejajar
           * dengan teks tersembunyi yang menentukan lebarnya.
           */}
          <span className="absolute inset-y-0 left-1 inline-flex items-center whitespace-pre">
            {huruf.map((h, i) => (
              <span
                key={h.id}
                className="glif-salin inline-block"
                /* Delay bertingkat: tiap huruf menyusul yang sebelumnya, tapi
                   dibatasi supaya kata panjang tidak terasa lambat. */
                style={{ "--d": `${Math.min(i * 20, 120)}ms` } as React.CSSProperties}
              >
                {h.char}
              </span>
            ))}
          </span>
        </span>
      </button>

      {/*
       * Pengumuman untuk pembaca layar, terpisah dari teks yang terlihat —
       * supaya pergantian huruf tidak dibacakan berkali-kali.
       *
       * CATATAN: centang saat "tersalin" mewarisi warna teks tombol. Di varian
       * primary itu berarti putih di atas latar emerald (kontras 5,5:1) —
       * bukan `text-primary`, yang akan sama persis dengan latarnya.
       */}
      <span className="sr-only" role="status" aria-live="polite">
        {keadaan === "idle"
          ? ""
          : keadaan === "gagal"
            ? `${label}: gagal menyalin`
            : `${label}: tersalin`}
      </span>
    </>
  );
}

/**
 * Centang yang menggambar dirinya sendiri.
 *
 * `pathLength={1}` menormalkan panjang garis jadi 1, jadi animasinya tidak
 * perlu tahu panjang sebenarnya. `stroke-dashoffset` bergerak dari 1 ke 0 dan
 * garisnya tumbuh dari titik awal — sama seperti tangan menulis centang.
 */
function CentangDigambar() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        pathLength={1}
        className="centang-salin"
      />
    </svg>
  );
}
