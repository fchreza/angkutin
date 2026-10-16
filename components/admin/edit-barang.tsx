"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Tombol "Edit" + dialog form untuk satu barang di panel admin.
 *
 * KENAPA DIALOG, bukan halaman terpisah: edit admin adalah perbaikan ringan
 * sesekali (typo judul, harga salah ketik). Dialog menjaga konteks daftar —
 * admin tidak kehilangan posisi scroll setelah menyimpan.
 *
 * Field yang bisa diubah: judul, deskripsi, harga/gratis, patokan lokasi.
 * Field sensitif (nomor WA, token, status) tidak ada di sini.
 */
type BarangRingkas = {
  id: string;
  title: string;
  description: string;
  price: string;
  isFree: boolean;
  pickupLandmark: string;
};

export function EditBarang({ barang }: { barang: BarangRingkas }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const [title, setTitle] = useState(barang.title);
  const [description, setDescription] = useState(barang.description);
  const [price, setPrice] = useState(barang.price);
  const [isFree, setIsFree] = useState(barang.isFree);
  const [pickupLandmark, setPickupLandmark] = useState(barang.pickupLandmark);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setGalat(null);
    try {
      const r = await fetch("/api/v1/admin/listings/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: barang.id,
          title: title.trim(),
          description: description.trim(),
          price: isFree ? "0" : price,
          isFree,
          pickupLandmark: pickupLandmark.trim(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Gagal menyimpan.");
      setBuka(false);
      router.refresh();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-primary hover:text-primary-dark"
      >
        Edit
      </button>

      {buka && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 p-4 sm:items-center"
          onClick={() => setBuka(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${barang.title}`}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[18px] font-semibold text-ink">
              Edit barang
            </h3>
            <form onSubmit={simpan} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-ink">
                  Judul
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-ink">
                  Deskripsi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  required
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Gratis
                </label>
                {!isFree && (
                  <div className="flex-1">
                    <label className="mb-1 block text-[13px] font-medium text-ink">
                      Harga (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-ink">
                  Patokan lokasi
                </label>
                <input
                  type="text"
                  value={pickupLandmark}
                  onChange={(e) => setPickupLandmark(e.target.value)}
                  maxLength={150}
                  required
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] text-ink"
                />
              </div>
              {galat && (
                <p className="text-[13px] text-red-700">{galat}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBuka(false)}
                  className="inline-flex h-10 items-center rounded-md border border-line bg-surface px-4 text-[14px] font-medium text-ink"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menyimpan}
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-teks disabled:opacity-50"
                >
                  {menyimpan ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
