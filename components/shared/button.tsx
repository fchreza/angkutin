import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: "primary" | "outline" | "danger" | "ghost" | "wa";
  ukuran?: "md" | "lg" | "sm";
  memuat?: boolean;
  penuh?: boolean;
};

/**
 * Tombol utama. Touch target minimal 44px (syarat aksesibilitas PRD).
 * Varian `wa` khusus CTA WhatsApp: emerald penuh + ikon WhatsApp.
 */
export function Button({
  children,
  className,
  varian = "primary",
  ukuran = "md",
  memuat = false,
  penuh = false,
  disabled,
  ...props
}: Props) {
  const gaya = {
    primary:
      "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-fab",
    wa: "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-fab",
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

  return (
    <button
      {...props}
      disabled={disabled || memuat}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tinggi,
        gaya,
        penuh && "w-full",
        className,
      )}
    >
      {memuat && (
        <span
          aria-hidden
          className="spin inline-block h-[14px] w-[14px] rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
