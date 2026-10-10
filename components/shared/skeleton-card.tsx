import { cn } from "@/lib/cn";

/** Skeleton kartu listing — dipakai saat feed sedang memuat. */
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
