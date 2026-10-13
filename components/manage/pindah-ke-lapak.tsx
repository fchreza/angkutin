"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { TombolSalin } from "@/components/shared/tombol-salin";
import { useToast } from "@/components/shared/toast";
import { IconAlert, IconCheck } from "@/components/shared/icons";
import { simpanLapakAktif } from "@/lib/lapak-aktif";

/**
 * Tombol pemindahan barang LAMA ke lapak baru.
 *
 * KENAPA INI ADA:
 * Barang yang dibuat sebelum fitur lapak tidak punya lapak, jadi hanya bisa
 * dikelola lewat tautan lamanya. Tanpa jalan pemindahan, penjual itu tidak
 * akan pernah bisa memakai dashboard lapak — dan tiap barang tetap butuh
 * tautan sendiri.
 *
 * KENAPA TOKEN BARANG YANG DIPAKAI, BUKAN ID SAJA:
 * Id barang ada di tautan publik. Kalau id saja cukup, siapa pun yang pernah
 * melihat iklannya bisa menarik barang itu ke lapaknya sendiri.
 *
 * Setelah berhasil, token lapak baru DISIMPAN sebagai lapak aktif di
 * perangkat ini — jadi barang berikutnya otomatis masuk ke lapak yang sama.
 * Tokennya juga ditampilkan di sini karena ini SATU-SATUNYA kesempatan
 * penjual melihatnya.
 */
export function PindahKeLapak({
  listingId,
  token,
}: {
  listingId: string;
  token: string;
}) {
  const { tampilkan } = useToast();
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<{ stallUrl: string; stallId: string } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function pindahkan() {
    setMemuat(true);
    setGalat(null);
    try {
      const r = await fetch("/api/v1/lapak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, listing_token: token }),
      });

      const j = (await r.json().catch(() => ({}))) as {
        stall_url?: string;
        stall_id?: string;
        stall_token?: string;
        error?: string;
      };

      if (!r.ok || !j.stall_url || !j.stall_id || !j.stall_token) {
        setGalat(j.error ?? "Gagal memindahkan barang. Coba lagi.");
        setMemuat(false);
        return;
      }

      // Simpan sebagai lapak aktif supaya barang berikutnya ikut ke sini.
      simpanLapakAktif({ stallId: j.stall_id, token: j.stall_token, nama: null });
      setHasil({ stallUrl: j.stall_url, stallId: j.stall_id });
      tampilkan("Barang dipindahkan ke lapak baru.");
    } catch {
      setGalat("Gagal menghubungi server. Periksa koneksi lalu coba lagi.");
    }
    setMemuat(false);
  }

  if (hasil) {
    return (
      <div className="rounded-md border border-primary/25 bg-primary-soft p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-teks">
            <IconCheck size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13.5px] font-bold text-primary-dark">
              Barang sudah punya lapak
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
              Sekarang kamu bisa mengelola semua barangmu dari satu tautan.
              Simpan tautan lapak ini — ini satu-satunya kali ia ditampilkan.
            </p>

            <div className="mt-2.5 flex gap-2">
              <input
                readOnly
                value={hasil.stallUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Tautan rahasia lapak"
                className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-[11.5px] text-ink-secondary focus:border-primary focus:outline-none"
              />
              <TombolSalin
                nilai={hasil.stallUrl}
                varian="primary"
                onTersalin={() => tampilkan("Tautan lapak disalin.")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-appbg text-ink-secondary">
          <IconAlert size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-bold text-ink">
            Barang ini belum punya lapak
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
            Buat lapak untuk menggabungkan barang ini dengan barang-barangmu
            yang lain, supaya semuanya bisa dikelola dari satu tautan. Tautan
            barang ini tetap berfungsi setelah dipindahkan.
          </p>

          <Button
            varian="outline"
            className="mt-2.5"
            memuat={memuat}
            onClick={() => void pindahkan()}
          >
            {memuat ? "Membuat lapak…" : "Buat Lapak untuk Barang Ini"}
          </Button>

          {galat && <p className="mt-2 text-[12px] text-danger">{galat}</p>}
        </div>
      </div>
    </div>
  );
}
