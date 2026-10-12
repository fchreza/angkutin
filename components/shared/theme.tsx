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

/** Terapkan ke <html> + beri tahu browser supaya kontrol bawaan ikut gelap. */
function terapkan(mode: "terang" | "gelap") {
  const el = document.documentElement;
  el.classList.toggle("dark", mode === "gelap");
  // color-scheme membuat date picker, scrollbar, dan autofill ikut gelap.
  // WAJIB nilai CSS baku ("light"/"dark"), bukan kata Indonesia — nilai yang
  // tidak dikenal diabaikan browser, sehingga kontrol bawaan tetap terang.
  el.style.colorScheme = mode === "gelap" ? "dark" : "light";
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
