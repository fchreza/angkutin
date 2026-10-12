import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { IconCheck } from "./icons";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: "primary" | "outline" | "danger" | "ghost" | "wa";
  ukuran?: "md" | "lg" | "sm";
  memuat?: boolean;
  penuh?: boolean;
  /** Setelah aksi berhasil: tombol berubah jadi centang sejenak. */
  sukses?: boolean;
};

/**
 * Tombol utama. Touch target minimal 44px (syarat aksesibilitas PRD).
 * Varian `wa` khusus CTA WhatsApp: emerald penuh + ikon WhatsApp.
 *
 * Tiga keadaan, tidak pernah tumpang tindih:
 *  - normal  : isi tombol
 *  - memuat  : spinner menggantikan isi, tombol dinonaktifkan otomatis
 *  - sukses  : centang hijau sejenak, memberi tahu aksi sudah berhasil
 *
 * Umpan balik tekan (`.press`) memakai transform, bukan perubahan warna saja —
 * di layar sentuh, perubahan warna saja sering tidak terasa.
 */
export function Button({
  children,
  className,
  varian = "primary",
  ukuran = "md",
  memuat = false,
  penuh = false,
  sukses = false,
  disabled,
  ...props
}: Props) {
  const gaya = {
    primary:
      "bg-primary text-primary-teks hover:bg-primary-dark active:bg-primary-dark shadow-fab",
    wa: "bg-primary text-primary-teks hover:bg-primary-dark active:bg-primary-dark shadow-fab",
    outline:
      "bg-surface text-ink border border-line hover:bg-appbg active:bg-appbg",
    danger:
      "bg-surface text-danger border border-danger/30 hover:bg-danger-soft active:bg-danger-soft",
    ghost: "bg-transparent text-ink-secondary hover:bg-appbg",
  }[varian];

  const tinggi = {
    sm: "h-9 px-3 text-[13px]",
    md: "h-11 px-4 text-[14px]",
    lg: "h-12 px-5 text-[15px]",
  }[ukuran];

  const terkunci = disabled || memuat || sukses;

  return (
    <button
      {...props}
      disabled={terkunci}
      aria-busy={memuat || undefined}
      className={cn(
        "press inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tinggi,
        gaya,
        sukses && "!bg-primary !text-primary-teks",
        penuh && "w-full",
        className,
      )}
    >
      {sukses ? (
        <>
          <IconCheck size={16} className="animate-pop" />
          {children}
        </>
      ) : memuat ? (
        <>
          <Spinner ukuran={14} />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
