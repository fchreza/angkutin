"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { TombolSalin } from "@/components/shared/tombol-salin";
import { useToast } from "@/components/shared/toast";
import { IconPlus, IconEye, IconChat, IconClock, IconAlert } from "@/components/shared/icons";
import { formatRupiah, formatTanggalID } from "@/lib/format";
import { LABEL_STATUS_PENJUAL, keteranganSisaWaktu } from "@/lib/urgency";
import { urlPasangKeLapak } from "@/lib/konteks-lapak";

export type BarisBarang = {
  id: string;
  title: string;
  price: string;
  isFree: boolean;
  status: string;
  deadline: string;
  wilayah: string;
  view: number;
  waClick: number;
  foto: string | null;
  /** Untuk dibagikan. Tidak memberi akses kelola apa pun. */
  publicUrl: string;
  /** Mengelola barang ini saja. */
  manageUrl: string;
};

/**
 * Dashboard LAPAK — daftar semua barang milik satu penjual.
 *
 * DUA TAUTAN YANG DIBEDAKAN DENGAN JELAS:
 *   1. Tautan RAHASIA lapak  -> mengelola semua barang (di panel atas)
 *   2. Tautan PUBLIK per barang -> untuk dibagikan (di tiap kartu)
 *
 * Pembedaan ini disengaja: sebelumnya penjual hanya punya satu tautan dan
 * tidak jelas mana yang boleh dibagikan. Sekarang keduanya diberi label
 * eksplisit, dan yang rahasia diberi peringatan.
 *
 * TOMBOL "TAMBAH BARANG" mengarah ke /pasang. Halaman itu membaca lapak aktif
 * dari perangkat ini, jadi barang baru otomatis masuk ke lapak ini — tanpa
 * perlu mengirim apa pun lewat URL.
 */
export function DaftarLapak({
  barang,
  namaLapak,
  stallUrl,
  token,
  stallId,
}: {
  barang: BarisBarang[];
  namaLapak: string | null;
  stallUrl: string;
  token: string;
  stallId: string;
}) {
  const { tampilkan } = useToast();
  const [salinTerbuka, setSalinTerbuka] = useState(false);

  /**
   * Tautan "Tambah Barang" membawa konteks lapak di FRAGMENT URL.
   *
   * KENAPA DI FRAGMENT, BUKAN DI localStorage:
   * Versi sebelumnya menyimpan "lapak aktif" di perangkat, dan itu membuat
   * penjual bisa memasang barang ke lapak yang salah tanpa sadar — halaman
   * Pasang tidak memberi tahu lapak mana yang akan dipakai. Dengan konteks di
   * tautan, apa yang kamu klik itulah lapak tujuannya, dan tidak ada state
   * tersembunyi.
   *
   * Bonus: tautan ini bisa dikirim ke perangkat lain dan tetap benar.
   */
  const pasangKeLapakIni = urlPasangKeLapak(stallId, token);

  const aktif = barang.filter((b) => b.status === "AVAILABLE");
  const totalDilihat = barang.reduce((a, b) => a + b.view, 0);
  const totalWA = barang.reduce((a, b) => a + b.waClick, 0);

  return (
    <div className="mx-auto max-w-[820px] space-y-4">
      {/* Kepala lapak */}
      <div className="animate-slide-up rounded-md border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[19px] font-bold text-ink">
              {namaLapak?.trim() || "Lapak kamu"}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-ink-secondary">
              {barang.length === 0
                ? "Belum ada barang."
                : `${barang.length} barang · ${aktif.length} tayang · ${totalDilihat} dilihat · ${totalWA} klik WA`}
            </p>
          </div>

          <Link href={pasangKeLapakIni} className="shrink-0">
            <Button>
              <IconPlus size={16} />
              Tambah Barang
            </Button>
          </Link>
        </div>
      </div>

      {/* Tautan rahasia lapak */}
      <div className="animate-slide-up rounded-md border border-primary/25 bg-primary-soft p-4" style={{ "--d": "60ms" } as React.CSSProperties}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-teks">
            <IconAlert size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13.5px] font-bold text-primary-dark">
              Tautan rahasia lapak
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
              Jangan dibagikan. Tautan ini bisa mengelola <strong>semua</strong>{" "}
              barang di lapak ini. Simpan di catatan, kalau hilang, barang-barang
              ini tidak bisa dikelola lagi.
            </p>

            {salinTerbuka ? (
              <div className="mt-2.5 flex gap-2">
                <input
                  readOnly
                  value={stallUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Tautan rahasia lapak"
                  className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-[11.5px] text-ink-secondary focus:border-primary focus:outline-none"
                />
                <TombolSalin
                  nilai={stallUrl}
                  varian="primary"
                  onTersalin={() => tampilkan("Tautan lapak disalin.")}
                />
              </div>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button varian="primary" onClick={() => setSalinTerbuka(true)}>
                  Tampilkan Tautan Lapak
                </Button>
                <Button
                  varian="outline"
                  onClick={() => {
                    const pesan =
                      `Tautan rahasia lapak Angkutin saya (JANGAN dibagikan):\n${stallUrl}\n\n` +
                      `Simpan pesan ini untuk mengelola semua barang saya.`;
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(pesan)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  Kirim ke WhatsApp Sendiri
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        Penjelasan konteks. Tidak ada lagi "lapak aktif" yang disimpan di
        perangkat — lapak tujuan ditentukan oleh TOMBOL yang diklik, jadi
        tidak ada state tersembunyi yang perlu dijelaskan atau dilepas.
      */}
      <div
        className="animate-slide-up rounded-md border border-line bg-surface px-4 py-3"
        style={{ "--d": "120ms" } as React.CSSProperties}
      >
        <p className="text-[12.5px] leading-relaxed text-ink-secondary">
          Tombol <strong className="text-ink">Tambah Barang</strong> di halaman
          ini memasukkan barang baru ke lapak ini. Kalau kamu memakai tombol{" "}
          <strong className="text-ink">Pasang Barang</strong> di menu atas atau
          di katalog, lapak <strong className="text-ink">baru</strong> yang
          akan dibuat.
        </p>
      </div>

      {/* Daftar barang */}
      {barang.length === 0 ? (
        <div className="rounded-md border border-line bg-surface p-8 text-center">
          <p className="text-[13.5px] font-semibold text-ink">Lapak ini masih kosong</p>
          <p className="mt-1 text-[12.5px] text-ink-secondary">
            Tambah barang pertamamu, barang itu otomatis masuk ke lapak ini.
          </p>
          <Link href={pasangKeLapakIni} className="mt-4 inline-block">
            <Button>
              <IconPlus size={16} />
              Tambah Barang
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {barang.map((b, i) => (
            <KartuBarang key={b.id} b={b} urut={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Satu baris barang di daftar lapak. */
function KartuBarang({ b, urut }: { b: BarisBarang; urut: number }) {
  const habis = b.status === "EXPIRED";
  const laku = b.status === "TAKEN";

  return (
    <div
      className="animate-slide-up flex gap-3 rounded-md border border-line bg-surface p-3"
      style={{ "--d": `${Math.min(urut * 40, 200)}ms` } as React.CSSProperties}
    >
      {/* Foto */}
      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-md border border-line bg-appbg">
        {b.foto ? (
          <img src={b.foto} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-ink-mono">
            tanpa foto
          </span>
        )}
      </div>

      {/* Isi */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            varian={habis || laku ? "netral" : "wilayah"}
          >
            {LABEL_STATUS_PENJUAL[b.status] ?? b.status}
          </Badge>
          {b.isFree ? (
            <span className="text-[13px] font-bold text-primary">GRATIS</span>
          ) : (
            <span className="font-display text-[13.5px] font-bold tabular-nums text-ink">
              {formatRupiah(b.price)}
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-[13.5px] font-semibold text-ink">{b.title}</p>
        <p className="truncate text-[11.5px] text-ink-secondary">
          {b.wilayah} · <IconClock size={11} className="inline" />{" "}
          {formatTanggalID(b.deadline)}
          {/* keteranganSisaWaktu menerima tanggal, bukan jumlah hari — ia
              menghitung sendiri. Sebelumnya nilai hari dimasukkan ke sini dan
              TypeScript menolaknya. */}
          {!habis && !laku && ` · ${keteranganSisaWaktu(b.deadline)}`}
        </p>

        <p className="mt-1 text-[11px] text-ink-mono">
          <IconEye size={11} className="inline" /> {b.view} ·{" "}
          <IconChat size={11} className="inline" /> {b.waClick} klik WA
        </p>

        {/* Dua aksi yang dibedakan jelas: kelola (rahasia) vs bagikan (publik) */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href={b.manageUrl}>
            <span className="press inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:bg-appbg">
              Kelola
            </span>
          </Link>
          <TombolSalin
            nilai={b.publicUrl}
            label="Salin tautan iklan"
            labelTersalin="Tersalin"
            varian="outline"
            className="!h-auto !py-1.5 !text-[12px]"
          />
        </div>
      </div>
    </div>
  );
}
