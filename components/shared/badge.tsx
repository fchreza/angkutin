import { cn } from "@/lib/cn";

/**
 * Badge serbaguna. Varian sesuai design-tokens.json:
 * - gratis : hijau emerald (Rp 0 / hibah)
 * - harga  : teks tebal netral
 * - kondisi: abu lembut
 * - taken  : monokrom #4B5563 "SUDAH DIAMBIL"
 */
type Varian = "gratis" | "harga" | "kondisi" | "taken" | "wilayah" | "netral";

const gaya: Record<Varian, string> = {
  gratis: "bg-primary text-primary-teks font-bold",
  harga: "bg-surface text-ink font-bold border border-line",
  kondisi: "bg-appbg text-ink-secondary border border-line",
  taken: "bg-ink-mono text-surface font-semibold",
  wilayah: "bg-primary-soft text-primary-dark border border-primary-500/30",
  netral: "bg-appbg text-ink-secondary border border-line",
};

export function Badge({
  children,
  varian = "netral",
  className,
}: {
  children: React.ReactNode;
  varian?: Varian;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-[3px] text-[12px] leading-none",
        gaya[varian],
        className,
      )}
    >
      {children}
    </span>
  );
}
