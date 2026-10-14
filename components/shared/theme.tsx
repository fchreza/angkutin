"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Pengelola mode terang/gelap.
 *
 * TIGA PILIHAN, bukan dua: terang, gelap, dan "ikut sistem". Pengguna yang
 * perangkatnya otomatis gelap di malam hari tidak perlu mengubah apa pun.
 *
 * KENAPA PAKAI `data-theme` DI <html>, BUKAN STATE REACT:
 * Warnanya adalah CSS variable yang nilainya ditentukan oleh kelas `.dark`
 * pada <html>. React hanya perlu menambah/melepas kelas itu — seluruh
 * halaman langsung berubah tanpa render ulang satu pun komponen. Kalau
 * memakai state React, setiap komponen harus tahu mode aktif.
 *
 * ANTI-KEDIP (FOUC): kelas `.dark` dipasang oleh skrip kecil di <head>
 * SEBELUM halaman digambar (lihat ThemeScript di layout.tsx). Tanpa itu,
 * pengguna mode gelap melihat kilatan putih ~200ms setiap kali memuat
 * halaman. Karena itu provider ini TIDAK memasang kelas saat render pertama
 * — ia hanya menyinkronkan setelah halaman hidup.
 */
export type Tema = "terang" | "gelap" | "sistem";

const KUNCI_SIMPAN = "angkutin-tema";

type KonteksTema = {
  /** Pilihan pengguna: terang / gelap / sistem. */
  tema: Tema;
  /** Mode yang benar-benar aktif setelah "sistem" diselesaikan. */
  aktif: "terang" | "gelap";
  setTema: (t: Tema) => void;
};

const Konteks = createContext<KonteksTema | null>(null);

function sistemGelap(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Terapkan ke <html> + beri tahu browser supaya kontrol bawaan ikut gelap.
 *
 * KENAPA TRANSIKSI DIMATIKAN SEKEJAP DI SINI:
 * Banyak komponen punya `transition-colors` (untuk efek hover), dan `.press`
 * mentransisikan background/border/color/box-shadow. Saat kelas tema ditukar,
 * transisi itu IKUT BERJALAN — jadi setiap elemen beranimasi dari warna tema
 * lama ke warna tema baru selama ~150ms.
 *
 * Terukur pada satu elemen <select>: putih -> 248 -> 216 -> 153 -> 68 -> 39
 * -> 34 -> 32. Delapan nilai warna perantara. Itulah "kedip-kedip" yang
 * terlihat: saat pindah ke gelap, komponen sempat memutih; saat pindah ke
 * terang, komponen sempat menggelap.
 *
 * Transisi itu ada untuk HOVER, bukan untuk pergantian tema — jadi solusinya
 * bukan menghapusnya, melainkan mematikannya selama pergantian tema saja.
 *
 * CARA KERJANYA:
 *   1. Pasang `.tema-beralih` di <html> — aturan CSS-nya mematikan semua
 *      transisi di seluruh pohon.
 *   2. Tukar kelas tema. Karena transisi mati, warna baru langsung terpasang.
 *   3. Baca `offsetHeight` untuk MEMAKSA browser menghitung ulang gaya
 *      sekarang juga. Tanpa langkah ini, browser bisa menunda perhitungannya
 *      sampai kelasnya sudah dilepas lagi, dan transisinya tetap berjalan.
 *   4. Lepas kelasnya. Transisi hover kembali seperti semula.
 *
 * Semuanya sinkron dalam satu tugas, jadi tidak ada frame yang sempat
 * menampilkan keadaan setengah jalan.
 */
function terapkan(mode: "terang" | "gelap") {
  const el = document.documentElement;

  el.classList.add("tema-beralih");
  el.classList.toggle("dark", mode === "gelap");
  // color-scheme membuat date picker, scrollbar, dan autofill ikut gelap.
  // WAJIB nilai CSS baku ("light"/"dark"), bukan kata Indonesia — nilai yang
  // tidak dikenal diabaikan browser, sehingga kontrol bawaan tetap terang.
  el.style.colorScheme = mode === "gelap" ? "dark" : "light";

  // Paksa perhitungan ulang gaya SELAGI transisi masih mati.
  void el.offsetHeight;

  el.classList.remove("tema-beralih");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Tema>("sistem");
  const [aktif, setAktif] = useState<"terang" | "gelap">("terang");

  // Baca pilihan tersimpan SETELAH halaman hidup. Nilai awal sengaja "sistem"
  // supaya render server dan render klien pertama sama (mencegah peringatan
  // ketidakcocokan hidrasi React).
  useEffect(() => {
    let tersimpan: Tema = "sistem";
    try {
      const v = localStorage.getItem(KUNCI_SIMPAN);
      if (v === "terang" || v === "gelap" || v === "sistem") tersimpan = v;
    } catch {
      // localStorage bisa dilarang (mode privat) — pakai "sistem".
    }
    setTemaState(tersimpan);
  }, []);

  // Terapkan setiap kali pilihan berubah, dan ikuti perubahan tema sistem
  // saat pilihannya "sistem".
  useEffect(() => {
    const mode = tema === "sistem" ? (sistemGelap() ? "gelap" : "terang") : tema;
    setAktif(mode);
    terapkan(mode);

    if (tema !== "sistem") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const saatBerubah = () => {
      const m = mq.matches ? "gelap" : "terang";
      setAktif(m);
      terapkan(m);
    };
    mq.addEventListener("change", saatBerubah);
    return () => mq.removeEventListener("change", saatBerubah);
  }, [tema]);

  const setTema = useCallback((t: Tema) => {
    // Terapkan DOM secara sinkron agar View Transition mengambil snapshot
    // tema tujuan; efek di atas tetap menjaga hidrasi dan perubahan sistem.
    const mode = t === "sistem" ? (sistemGelap() ? "gelap" : "terang") : t;
    terapkan(mode);
    setAktif(mode);
    setTemaState(t);
    try {
      localStorage.setItem(KUNCI_SIMPAN, t);
    } catch {
      // Tidak bisa menyimpan bukan alasan untuk gagal berganti tema.
    }
  }, []);

  return (
    <Konteks.Provider value={{ tema, aktif, setTema }}>
      {children}
    </Konteks.Provider>
  );
}

export function useTema(): KonteksTema {
  const k = useContext(Konteks);
  if (!k) throw new Error("useTema harus dipakai di dalam ThemeProvider");
  return k;
}

/**
 * Skrip anti-kedip. Dijalankan SEBELUM halaman digambar.
 *
 * Sengaja ditulis sebagai string (bukan komponen) supaya bisa disisipkan ke
 * <head> lewat dangerouslySetInnerHTML dan berjalan sinkron saat HTML
 * di-parse — bukan setelah React hidup.
 */
export const SKRIP_TEMA = `
(function(){
  try {
    var t = localStorage.getItem('${KUNCI_SIMPAN}');
    var gelap = t === 'gelap' ||
      ((t === 'sistem' || !t) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (gelap) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;
