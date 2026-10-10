import { cn } from "@/lib/cn";

/**
 * Spinner terpusat.
 *
 * Sebelumnya cincin loader ditulis ulang manual di 4 berkas dengan ukuran dan
 * warna berbeda-beda. Sekarang satu komponen, supaya bentuk dan kecepatannya
 * konsisten di seluruh aplikasi.
 *
 * Kenapa CSS border, bukan ikon `Loader2` seperti Spectrum UI:
 * proyek ini sengaja tanpa lucide-react. Cincin CSS tidak butuh dependensi,
 * ukurannya tajam di semua DPI, dan ikut warna teks lewat `border-current`.
 */
export function Spinner({
  ukuran = 16,
  className,
  tebal = 2,
}: {
  /** Diameter dalam piksel. */
  ukuran?: number;
  className?: string;
  /** Ketebalan cincin dalam piksel. */
  tebal?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("spin inline-block shrink-0 rounded-full", className)}
      style={{
        width: ukuran,
        height: ukuran,
        borderWidth: tebal,
        borderStyle: "solid",
        borderColor: "currentColor",
        borderRightColor: "transparent",
      }}
    />
  );
}

/**
 * Blok loading penuh untuk area konten.
 * Dipakai saat satu bagian halaman sedang memuat datanya.
 */
export function LoadingBlock({
  teks = "Memuat…",
  className,
}: {
  teks?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <Spinner ukuran={22} className="text-primary" />
      <span className="text-[13px] text-ink-secondary">{teks}</span>
    </div>
  );
}

/**
 * Titik-titik mengetik. Dipakai untuk keadaan "sedang mengirim".
 * Teknik dari Spectrum UI `thinking-dots`.
 */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[5px] w-[5px] rounded-full bg-current"
          style={{
            animation: "pulseDot 1.1s ease-in-out infinite",
            animationDelay: `${i * 140}ms`,
          }}
        />
      ))}
    </span>
  );
}
