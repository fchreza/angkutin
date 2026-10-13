"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LABEL_KONDISI } from "@/lib/urgency";

const KONDISI = ["SEPERTI_BARU", "MINUS_PEMAKAIAN", "PERLU_SERVIS_RINGAN"] as const;

/**
 * Segmented control kondisi barang (FR-3).
 *
 * Peningkatan dari versi sebelumnya: indikator terpilih kini satu elemen yang
 * BERGESER, bukan warna tombol yang berubah-ubah. Hasilnya pilihan terlihat
 * sebagai satu kesatuan, dan gerakannya menjelaskan arah perubahan.
 * Teknik indikator geser ini dari COSS UI `segmented-control`.
 *
 * Tetap memakai role="radiogroup" + role="radio" supaya pembaca layar dan
 * navigasi panah keyboard berperilaku seperti pilihan tunggal.
 */
export function ConditionSegmented({
  nilai,
  onUbah,
  galat,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  galat?: string;
}) {
  const refWadah = useRef<HTMLDivElement>(null);
  const refTombol = useRef<(HTMLButtonElement | null)[]>([]);
  const [indikator, setIndikator] = useState({ kiri: 0, lebar: 0, siap: false });

  const indeksTerpilih = KONDISI.indexOf(nilai as (typeof KONDISI)[number]);

  // Ukur posisi tombol terpilih, lalu geser indikator ke sana.
  useLayoutEffect(() => {
    const ukur = () => {
      if (indeksTerpilih < 0) {
        setIndikator((s) => ({ ...s, siap: false }));
        return;
      }
      const el = refTombol.current[indeksTerpilih];
      const wadah = refWadah.current;
      if (!el || !wadah) return;
      setIndikator({
        kiri: el.offsetLeft - wadah.clientLeft,
        lebar: el.offsetWidth,
        siap: true,
      });
    };

    ukur();
    // Ukur ulang saat ukuran berubah (rotasi layar, sidebar desktop).
    const ro = new ResizeObserver(ukur);
    if (refWadah.current) ro.observe(refWadah.current);
    return () => ro.disconnect();
  }, [indeksTerpilih]);

  // Navigasi panah kiri/kanan — perilaku baku radiogroup.
  function onKeyDown(e: React.KeyboardEvent) {
    const i = indeksTerpilih < 0 ? 0 : indeksTerpilih;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onUbah(KONDISI[(i + 1) % KONDISI.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onUbah(KONDISI[(i - 1 + KONDISI.length) % KONDISI.length]);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-[14px] font-semibold text-ink">
        Kondisi barang <span className="text-danger">*</span>
      </label>

      <div
        ref={refWadah}
        role="radiogroup"
        aria-label="Kondisi barang"
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-3 gap-1 rounded-md border border-line bg-appbg p-1"
      >
        {/* Indikator geser.
            PENTING: yang dianimasikan adalah `transform: translateX`, BUKAN
            `left`. Mengubah `left` tidak bisa dianimasikan karena properti itu
            tidak ada di daftar transisi — hasilnya indikator melompat, bukan
            meluncur. translateX juga jalan di GPU. */}
        <span
          aria-hidden
          className={cn(
            "segmen-indikator pointer-events-none absolute bottom-1 top-1 left-0 rounded-sm bg-surface shadow-card",
            !indikator.siap && "opacity-0",
          )}
          style={{
            transform: `translateX(${indikator.kiri}px)`,
            width: indikator.lebar,
          }}
        />

        {KONDISI.map((k, i) => (
          <button
            key={k}
            ref={(el) => {
              refTombol.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={nilai === k}
            tabIndex={nilai === k || (indeksTerpilih < 0 && i === 0) ? 0 : -1}
            onClick={() => onUbah(k)}
            className={cn(
              "press relative z-10 rounded-sm px-2 py-2.5 text-[14px] font-medium leading-tight",
              nilai === k ? "text-primary-dark" : "text-ink-secondary hover:text-ink",
            )}
          >
            {LABEL_KONDISI[k]}
          </button>
        ))}
      </div>

      {galat && <p className="mt-1.5 text-[14px] text-danger">{galat}</p>}
    </div>
  );
}
