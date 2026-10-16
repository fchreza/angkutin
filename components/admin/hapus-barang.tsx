"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol "Hapus" untuk satu barang di panel admin.
 *
 * KENAPA KONFIRMASI DUA TAHAP: penghapusan permanen dan tidak bisa dibatalkan.
 * Klik pertama mengubah tombol menjadi mode konfirmasi ("Yakin hapus?"),
 * klik kedua mengeksekusi. Klik di luar atau tombol batal membatalkan.
 *
 * Setelah berhasil, halaman di-refresh dari server supaya barang yang
 * dihapus langsung hilang dari daftar.
 */
export function HapusBarang({
  listingId,
  judul,
}: {
  listingId: string;
  judul: string;
}) {
  const router = useRouter();
  const [tahap, setTahap] = useState<"awal" | "konfirmasi" | "menghapus">("awal");
  const [galat, setGalat] = useState(false);

  async function hapus() {
    setTahap("menghapus");
    setGalat(false);
    try {
      const r = await fetch("/api/v1/admin/listings/hapus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listingId }),
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
          Yakin hapus “{judul}”? Tidak bisa dibatalkan.
        </span>
        <button
          type="button"
          onClick={hapus}
          className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-red-700"
        >
          Ya, hapus
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
        disabled={tahap === "menghapus"}
        className="inline-flex h-9 items-center rounded-md border border-red-300 bg-surface px-3 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {tahap === "menghapus" ? "Menghapus…" : "Hapus"}
      </button>
      {galat && (
        <span className="text-[12px] text-ink-secondary">
          Gagal menghapus. Coba lagi.
        </span>
      )}
    </div>
  );
}
