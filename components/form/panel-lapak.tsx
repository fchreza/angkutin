"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { IconAlert, IconPlus } from "@/components/shared/icons";
import {
  bacaKonteksLapakSnapshot,
  langgananHash,
  urlPasangKeLapak,
} from "@/lib/konteks-lapak";

/**
 * Panel "barang ini akan masuk ke lapak mana".
 *
 * KENAPA PANEL INI ADA:
 * Sebelumnya penjual tidak diberi tahu lapak mana yang akan menerima barang
 * barunya. Kalau dia punya lebih dari satu lapak, barangnya bisa masuk ke
 * lapak yang salah tanpa sadar — dan baru ketahuan setelah membuka dashboard
 * dan barangnya tidak ada di sana.
 *
 * Panel ini menutup celah itu: sebelum menekan "Tayangkan", penjual melihat
 * lapak tujuannya dan bisa menggantinya di tempat.
 *
 * DUA KEADAAN:
 *   1. Ada konteks lapak (datang dari tombol "Tambah Barang" di dashboard)
 *      -> tampilkan nama lapaknya, dan tautan keluar dari konteks itu.
 *   2. Tidak ada konteks (datang dari navbar/katalog)
 *      -> beri tahu bahwa lapak BARU akan dibuat, supaya tidak mengagetkan.
 */
export function PanelLapak() {
  /**
   * Konteks dibaca dengan `useSyncExternalStore`, BUKAN `useEffect`.
   *
   * KENAPA INI DIPERBAIKI — ini bug yang sempat lolos:
   * Versi pertama membaca konteks di dalam `useEffect` yang hanya berjalan
   * SEKALI saat komponen dipasang. Itu tidak cukup, karena:
   *   - Pada render pertama, komponen bisa dipasang sebelum navigasi selesai,
   *     sehingga `window.location.hash` masih kosong. Konteks dianggap tidak
   *     ada, dan hasilnya di-cache sebagai "tidak ada" untuk selamanya.
   *   - Kalau hash berubah tanpa memuat ulang halaman (mis. dari tautan
   *     internal), efeknya tidak pernah jalan lagi.
   *
   * `useSyncExternalStore` menerima dua versi nilai: satu untuk server
   * (selalu null, karena hash tidak ada di server) dan satu untuk klien.
   * React akan memakai versi klien setelah hidrasi, dan MEMBANDINGKAN
   * hasilnya di setiap render — jadi begitu hash tersedia, panelnya langsung
   * benar tanpa bergantung pada efek yang hanya jalan sekali.
   *
   * `getSnapshot` wajib mengembalikan nilai yang stabil (referensi sama kalau
   * isinya sama), kalau tidak React akan berputar tanpa henti. Karena itu
   * hasilnya disimpan di variabel modul, bukan dibuat baru tiap panggilan.
   */
  const konteks = useSyncExternalStore(
    langgananHash,
    bacaKonteksLapakSnapshot,
    () => null,
  );
  const [nama, setNama] = useState<string | null>(null);

  // Ambil nama lapak supaya penjual yakin ini lapak yang benar. Kalau gagal
  // (mis. tautan sudah tidak sah), panelnya tetap tampil tanpa nama —
  // kegagalan di sini tidak boleh menghalangi pemasangan barang.
  useEffect(() => {
    if (!konteks) return;
    let batal = false;
    fetch(`/api/v1/lapak/${konteks.stallId}?token=${encodeURIComponent(konteks.token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!batal && j && j.jenis === "lapak") setNama(j.nama ?? null);
      })
      .catch(() => {
        /* biarkan tanpa nama */
      });
    return () => {
      batal = true;
    };
  }, [konteks]);

  if (!konteks) {
    return (
      <div className="mb-5 flex items-start gap-2.5 rounded-md border border-line bg-appbg px-4 py-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-ink-secondary">
          <IconPlus size={14} />
        </span>
        <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
          Barang ini akan membuat <strong className="text-ink">lapak baru</strong>.
          Kalau kamu mau menambahkannya ke lapak yang sudah ada, buka dulu
          tautan rahasia lapakmu, lalu tekan &ldquo;Tambah Barang&rdquo; dari sana.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-md border border-primary/25 bg-primary-soft px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-teks">
          <IconPlus size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
            Barang ini akan masuk ke lapak{" "}
            <strong className="text-primary-dark">
              {nama?.trim() || "yang kamu buka tadi"}
            </strong>
            .
          </p>
          <Link
            href="/pasang"
            className="mt-1 inline-block text-[13px] font-semibold text-primary-dark underline underline-offset-2 hover:no-underline"
          >
            Buat lapak baru saja
          </Link>
        </div>
      </div>
    </div>
  );
}
