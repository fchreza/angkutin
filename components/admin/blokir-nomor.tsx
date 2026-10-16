"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol "Blokir nomor" untuk satu barang di panel admin.
 *
 * KENAPA BLOKIR VIA LISTING ID: nomor WhatsApp asli tidak pernah dikirim ke
 * browser (hanya versi bertopeng yang tampil). Server yang mengambil nomor
 * penjual dari database lalu meng-hash-nya.
 *
 * Setelah diblokir, nomor itu tidak bisa memasang barang baru — tapi
 * barang-barangnya yang sudah tayang TIDAK otomatis terhapus. Admin
 * menghapusnya manual via tombol Hapus bila perlu.
 */
export function BlokirNomor({
  listingId,
  waTopeng,
}: {
  listingId: string;
  waTopeng: string;
}) {
  const router = useRouter();
  const [tahap, setTahap] = useState<"awal" | "konfirmasi" | "memblokir">("awal");
  const [galat, setGalat] = useState(false);

  async function blokir() {
    setTahap("memblokir");
    setGalat(false);
    try {
      const r = await fetch("/api/v1/admin/blokir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          alasan: "Diblokir dari panel admin",
        }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setGalat(true);
      setTahap("awal");
    }
  }

  if (tahap === "konfirmasi") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-ink">
          Blokir nomor {waTopeng}? Tidak bisa pasang barang baru.
        </span>
        <button
          type="button"
          onClick={blokir}
          className="inline-flex h-9 items-center rounded-md bg-amber-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Ya, blokir
        </button>
        <button
          type="button"
          onClick={() => setTahap("awal")}
          className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-ink"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setTahap("konfirmasi")}
        disabled={tahap === "memblokir"}
        className="inline-flex h-9 items-center rounded-md border border-amber-300 bg-surface px-3 text-[13px] font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
      >
        {tahap === "memblokir" ? "Memblokir…" : "Blokir nomor"}
      </button>
      {galat && (
        <span className="text-[12px] text-ink-secondary">
          Gagal memblokir. Coba lagi.
        </span>
      )}
    </div>
  );
}
