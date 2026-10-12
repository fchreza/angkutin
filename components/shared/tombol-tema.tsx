"use client";

import { useEffect, useRef, useState } from "react";
import { IconSun, IconMoon, IconMonitor } from "@/components/shared/icons";
import { useTema, type Tema } from "@/components/shared/theme";
import { cn } from "@/lib/cn";

/**
 * Tombol ganti tema.
 *
 * TIGA pilihan (terang / gelap / ikut sistem), bukan tombol sakelar dua arah.
 * Sakelar dua arah memaksa pengguna memilih; dengan "ikut sistem", perangkat
 * yang sudah otomatis gelap di malam hari tidak perlu diapa-apakan.
 *
 * Bentuknya ikon saja supaya tidak menambah kebisingan di header yang sudah
 * berisi navigasi. Pilihan aktif terlihat dari daftar yang terbuka.
 */
const PILIHAN: { nilai: Tema; label: string; ikon: React.ReactNode }[] = [
  { nilai: "terang", label: "Terang", ikon: <IconSun size={15} /> },
  { nilai: "gelap", label: "Gelap", ikon: <IconMoon size={15} /> },
  { nilai: "sistem", label: "Ikut sistem", ikon: <IconMonitor size={15} /> },
];

export function TombolTema({ kelas }: { kelas?: string }) {
  const { tema, aktif, setTema } = useTema();
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar atau tekan Escape — tanpa ini, panel menggantung
  // terbuka dan menutupi konten di layar kecil.
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

  const Ikon = aktif === "gelap" ? IconMoon : IconSun;

  return (
    <div ref={wadah} className={cn("relative", kelas)}>
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-label={`Ganti tema (sekarang: ${tema})`}
        aria-expanded={buka}
        aria-haspopup="true"
        className={cn(
          "press flex h-9 w-9 items-center justify-center rounded-md",
          "text-ink-secondary hover:bg-appbg hover:text-ink",
          buka && "bg-appbg text-ink",
        )}
      >
        <Ikon size={17} />
      </button>

      {buka && (
        <div
          role="menu"
          className={cn(
            "animate-slide-down absolute right-0 top-full z-50 mt-1.5 w-[152px]",
            "overflow-hidden rounded-md border border-line bg-surface py-1 shadow-modal",
          )}
        >
          {PILIHAN.map((p) => (
            <button
              key={p.nilai}
              type="button"
              role="menuitemradio"
              aria-checked={tema === p.nilai}
              onClick={() => {
                setTema(p.nilai);
                setBuka(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]",
                "hover:bg-appbg",
                tema === p.nilai ? "font-semibold text-primary" : "text-ink",
              )}
            >
              <span className={tema === p.nilai ? "text-primary" : "text-ink-secondary"}>
                {p.ikon}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
