import { cn } from "@/lib/cn";

/**
 * Skeleton kartu listing — dipakai saat feed sedang memuat.
 *
 * Bentuknya sengaja MENIRU kartu asli (rasio gambar 1:1, dua baris judul,
 * satu baris harga) supaya tidak ada lompatan tata letak saat data masuk.
 * Skeleton yang bentuknya beda dari kontennya justru membuat halaman terasa
 * berkedip — lebih buruk daripada tidak ada skeleton.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-line bg-surface",
        className,
      )}
    >
      <div className="skeleton aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
    </div>
  );
}

/** Grid skeleton sesuai jumlah kolom responsif. */
export function SkeletonGrid({ jumlah = 8 }: { jumlah?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: jumlah }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Isi yang muncul setelah selesai memuat: cross-fade + un-blur.
 *
 * KENAPA: mengganti skeleton dengan konten secara mendadak membuat mata
 * "kehilangan" posisi. Transisi halus membuat perpindahannya terbaca.
 * Teknik dari Spectrum UI `skeleton-reveal` (transitions.dev).
 *
 * `kunci` dipakai supaya animasi diputar ulang setiap kali data berganti —
 * tanpa itu, React memakai ulang elemen lama dan animasinya tidak jalan.
 */
export function Reveal({
  children,
  kunci,
  className,
}: {
  children: React.ReactNode;
  /** Nilai yang berubah saat data baru masuk (mis. jumlah item + filter). */
  kunci?: string | number;
  className?: string;
}) {
  return (
    <div key={kunci} className={cn("animate-reveal", className)}>
      {children}
    </div>
  );
}
