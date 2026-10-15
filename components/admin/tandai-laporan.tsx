"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol "Tandai ditinjau" untuk satu laporan di antrian admin.
 *
 * Setelah berhasil, halaman di-refresh dari server supaya laporan yang sudah
 * ditangani langsung hilang dari antrian tanpa perlu memuat ulang manual.
 */
export function TandaiLaporan({ laporanId }: { laporanId: string }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(false);

  async function tandai() {
    setMemuat(true);
    setGalat(false);
    try {
      const r = await fetch("/api/v1/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: laporanId }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setGalat(true);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={tandai}
        disabled={memuat}
        className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-50"
      >
        {memuat ? "Menyimpan…" : "Tandai ditinjau"}
      </button>
      {galat && (
        <span className="text-[12px] text-ink-secondary">
          Gagal menyimpan. Coba lagi.
        </span>
      )}
    </div>
  );
}
