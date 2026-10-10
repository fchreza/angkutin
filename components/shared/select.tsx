"use client";

import { cn } from "@/lib/cn";
import { IconChevronDown } from "./icons";

/**
 * Dropdown (select) dengan tampilan seragam.
 *
 * KENAPA KOMPONEN INI ADA:
 * Sebelumnya sebagian dropdown memakai panah bawaan browser (`appearance: auto`)
 * dengan padding kanan hanya 12px. Panah bawaan itu digambar browser tepat di
 * tepi elemen, jadi terlihat menabrak border dan tampilannya jadul — berbeda
 * sendiri dibanding dropdown wilayah yang sudah memakai panah sendiri.
 *
 * Solusinya satu tempat saja:
 *  - `appearance-none` membuang panah bawaan
 *  - padding kanan 36px menyediakan ruang untuk panah sendiri
 *  - panah sendiri 15px, berjarak 12px dari tepi → tidak menabrak border
 *
 * Tetap memakai elemen <select> asli, bukan dropdown buatan sendiri:
 *  - keyboard dan pembaca layar sudah didukung bawaan
 *  - di ponsel membuka pemilih asli sistem (lebih enak dipakai daripada list custom)
 *  - tidak ada JavaScript, tidak ada dependensi baru
 */
export function Select({
  nilai,
  onUbah,
  opsi,
  placeholder,
  salah = false,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  /** Opsi dropdown. `value` kosong = placeholder (tidak bisa dipilih). */
  opsi: { value: string; label: string }[];
  /** Teks saat belum ada yang dipilih. Ditampilkan sebagai opsi teratas. */
  placeholder?: string;
  /** true = border merah (validasi gagal). */
  salah?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        value={nilai}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={salah || undefined}
        onChange={(e) => onUbah(e.target.value)}
        className={cn(
          "h-11 w-full appearance-none rounded-md border bg-surface",
          // pr-9 (36px) = ruang untuk panah 15px + jarak 12px + sisa 9px.
          // Tanpa ini panah akan menempel di border.
          "pl-3 pr-9 text-[14px] text-ink",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          salah
            ? "border-danger focus:border-danger"
            : "border-line hover:border-ink-secondary/40 focus:border-primary",
          disabled && "cursor-not-allowed border-line bg-appbg text-ink-secondary",
        )}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {opsi.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <IconChevronDown
        size={15}
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2",
          disabled ? "text-ink-secondary/50" : "text-ink-secondary",
        )}
      />
    </div>
  );
}
