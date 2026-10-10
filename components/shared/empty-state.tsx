import { IconInbox } from "./icons";

/**
 * Empty state dengan microcopy dari PRD §15.
 * Selalu sediakan aksi (tombol/link) — empty state tanpa jalan keluar
 * membuat pengguna buntu.
 */
export function EmptyState({
  judul,
  keterangan,
  aksi,
  ikon,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
  ikon?: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 text-ink-secondary/60">
        {ikon ?? <IconInbox size={44} />}
      </div>
      <h3 className="font-display text-[16px] font-bold text-ink">{judul}</h3>
      {keterangan && (
        <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-ink-secondary">
          {keterangan}
        </p>
      )}
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  );
}
