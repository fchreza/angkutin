"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Daftar nomor yang diblokir + tombol buka blokir.
 *
 * Yang ditampilkan hanya 8 karakter pertama dari hash — nomor aslinya
 * tidak disimpan di mana pun, jadi tidak ada yang bisa ditampilkan.
 * Alasan dan tanggal blokir ditampilkan untuk audit.
 */
export function DaftarBlokir({
  awal,
}: {
  awal: { id: string; hashPendek: string; alasan: string | null; createdAt: string }[];
}) {
  const router = useRouter();
  const [membuka, setMembuka] = useState<string | null>(null);

  async function bukaBlokir(id: string) {
    setMembuka(id);
    try {
      const r = await fetch("/api/v1/admin/blokir", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } finally {
      setMembuka(null);
    }
  }

  if (awal.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-line bg-surface px-5 py-6 text-[14px] text-ink-secondary">
        Belum ada nomor yang diblokir.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {awal.map((b) => (
        <li
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-5 py-4"
        >
          <div className="min-w-0">
            <p className="font-mono text-[14px] font-semibold text-ink">
              #{b.hashPendek}…
            </p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {b.alasan ?? "Tanpa alasan"} ·{" "}
              {new Date(b.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => bukaBlokir(b.id)}
            disabled={membuka === b.id}
            className="inline-flex h-9 shrink-0 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-50"
          >
            {membuka === b.id ? "Membuka…" : "Buka blokir"}
          </button>
        </li>
      ))}
    </ul>
  );
}
