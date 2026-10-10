"use client";

import { cn } from "@/lib/cn";
import { LABEL_KONDISI } from "@/lib/urgency";

const KONDISI = ["SEPERTI_BARU", "MINUS_PEMAKAIAN", "PERLU_SERVIS_RINGAN"] as const;

/** Segmented control kondisi barang (FR-3). */
export function ConditionSegmented({
  nilai,
  onUbah,
  galat,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  galat?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold text-ink">
        Kondisi barang <span className="text-danger">*</span>
      </label>
      <div
        role="radiogroup"
        aria-label="Kondisi barang"
        className="grid grid-cols-3 gap-1.5 rounded-md border border-line bg-appbg p-1"
      >
        {KONDISI.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={nilai === k}
            onClick={() => onUbah(k)}
            className={cn(
              "rounded-sm px-2 py-2.5 text-[12px] font-medium leading-tight transition-colors",
              nilai === k
                ? "bg-surface text-primary-dark shadow-card"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {LABEL_KONDISI[k]}
          </button>
        ))}
      </div>
      {galat && <p className="mt-1.5 text-[12px] text-danger">{galat}</p>}
    </div>
  );
}
