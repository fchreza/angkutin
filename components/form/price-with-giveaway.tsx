"use client";

import { cn } from "@/lib/cn";

/** Format angka jadi "150000" -> "150.000" saat mengetik. */
const ribuan = (v: string) => {
  const d = v.replace(/[^0-9]/g, "");
  if (!d) return "";
  return Number(d).toLocaleString("id-ID");
};

/**
 * Input harga + toggle "Berikan Gratis (Hibah)" (FR-3).
 * Saat toggle aktif: harga otomatis Rp 0 dan input dinonaktifkan —
 * perilaku ini disyaratkan PRD, bukan pilihan desain.
 */
export function PriceWithGiveaway({
  gratis,
  harga,
  onGratis,
  onHarga,
  galat,
}: {
  gratis: boolean;
  harga: string;
  onGratis: (v: boolean) => void;
  onHarga: (v: string) => void;
  galat?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="harga"
          className="mb-2 block text-[13px] font-semibold text-ink"
        >
          Harga <span className="text-danger">*</span>
        </label>

        <div className="relative">
          <span
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold",
              gratis ? "text-ink-secondary/50" : "text-ink-secondary",
            )}
          >
            Rp
          </span>
          <input
            id="harga"
            inputMode="numeric"
            disabled={gratis}
            value={gratis ? "0" : harga}
            onChange={(e) => onHarga(ribuan(e.target.value))}
            placeholder="150.000"
            className={cn(
              "h-11 w-full rounded-md border border-line pl-10 pr-3 text-[14px]",
              "focus:border-primary focus:outline-none",
              gratis && "cursor-not-allowed bg-appbg text-ink-secondary",
            )}
          />
        </div>

        {galat && !gratis && (
          <p className="mt-1.5 text-[12px] text-danger">{galat}</p>
        )}
      </div>

      {/* Toggle Hibah */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors",
          gratis
            ? "border-primary bg-primary-soft"
            : "border-line bg-surface hover:border-primary/40",
        )}
      >
        <input
          type="checkbox"
          checked={gratis}
          onChange={(e) => onGratis(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors",
            gratis ? "border-primary bg-primary" : "border-line bg-surface",
          )}
        >
          {gratis && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
        <span>
          <span className="block text-[13.5px] font-semibold text-ink">
            Berikan Gratis (Hibah)
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-secondary">
            Harga jadi Rp 0. Bagus untuk barang yang ingin cepat diambil.
          </span>
        </span>
      </label>
    </div>
  );
}
