"use client";

import { cn } from "@/lib/cn";

export type Kategori = { id: string; name: string; slug: string };

/**
 * Filter pills horizontal (Layar 1).
 * Di mobile bisa di-scroll ke samping tanpa scrollbar terlihat.
 * "Semua" ditambahkan di depan karena tidak ada di seed database.
 */
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
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {daftar.map((k) => {
        const terpilih = aktif === k.id;
        return (
          <button
            key={k.id}
            type="button"
            onClick={() => onPilih(k.id)}
            aria-pressed={terpilih}
            className={cn(
              "shrink-0 rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors",
              terpilih
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink-secondary hover:border-primary/40 hover:text-ink",
            )}
          >
            {k.name}
          </button>
        );
      })}
    </div>
  );
}
