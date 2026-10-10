"use client";

import { cn } from "@/lib/cn";
import { IconChevronDown, IconPin } from "@/components/shared/icons";

export type Kluster = { id: string; name: string; city: string };

/**
 * Pemilih kluster wilayah (FR-1).
 *
 * Wajib ada di header feed — bukan filter tersembunyi, karena membatasi
 * radius pencarian adalah inti produknya (PRD §5 prinsip 1).
 */
export function ClusterSelector({
  kluster,
  aktif,
  onPilih,
  className,
}: {
  kluster: Kluster[];
  aktif: string;
  onPilih: (id: string) => void;
  className?: string;
}) {
  const terpilih = kluster.find((k) => k.id === aktif) ?? kluster[0];

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor="pilih-kluster">
        Pilih kluster wilayah
      </label>
      <IconPin
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary"
      />
      <select
        id="pilih-kluster"
        value={aktif}
        onChange={(e) => onPilih(e.target.value)}
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-line bg-surface",
          "pl-9 pr-9 text-[14px] font-semibold text-ink",
          "focus:border-primary focus:outline-none",
        )}
      >
        {kluster.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name} — {k.city}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary"
      />
      {terpilih && (
        <span className="sr-only">Kluster aktif: {terpilih.name}</span>
      )}
    </div>
  );
}
