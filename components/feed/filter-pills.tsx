"use client";

import { cn } from "@/lib/cn";

export type Kategori = { id: string; name: string; slug: string };

/** Navigasi kategori katalog yang dapat digulir mendatar, terutama di ponsel. */
export function FilterPills({
  kategori,
  aktif,
  onPilih,
}: {
  kategori: Kategori[];
  aktif: string;
  onPilih: (id: string) => void;
}) {
  const daftar = [{ id: "semua", name: "Semua", slug: "semua" }, ...kategori];

  return (
    <nav
      aria-label="Kategori barang"
      className="no-scrollbar -mx-4 flex overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0"
    >
      {daftar.map((k) => {
        const terpilih = aktif === k.id;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onPilih(k.id)}
            aria-pressed={terpilih}
            className={cn(
              "category-tab press shrink-0 px-3 text-[13px] font-semibold transition-colors",
              terpilih ? "text-ink" : "text-ink-secondary hover:text-ink",
            )}
          >
            {k.name}
          </button>
        );
      })}
    </nav>
  );
}
