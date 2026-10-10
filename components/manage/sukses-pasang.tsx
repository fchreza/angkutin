"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { IconCheck, IconAlert, IconEye, IconCopy } from "@/components/shared/icons";
import { formatRupiah, formatTanggalID } from "@/lib/format";
import { LABEL_KONDISI } from "@/lib/urgency";
import { cn } from "@/lib/cn";

export type RingkasanListing = {
  id: string;
  token: string;
  title: string;
  price: string;
  isFree: boolean;
  condition: string;
  clusterName: string;
  pickupLandmark: string;
  deadlineDate: string;
  jumlahFoto: number;
};

/**
 * Layar persetujuan setelah listing tersimpan.
 *
 * Kenapa layar ini ada, bukan langsung pindah ke dashboard:
 *   1. Penjual melihat dulu barangnya benar-benar tayang.
 *   2. Tautan rahasia ditampilkan SEKALI di tempat yang tenang, jadi tidak
 *      terlewat di tengah transisi halaman.
 *   3. Kalau unggah foto gagal, penjual bisa mencoba lagi dari sini —
 *      berkas fotonya masih ada di memori karena layar ini bagian dari alur
 *      form, bukan halaman terpisah.
 */
export function SuksesPasang({
  data,
  manageUrl,
  fotoGagal,
  pesanFoto,
  onCobaUlang,
  sedangUlang,
}: {
  data: RingkasanListing;
  manageUrl: string;
  fotoGagal: boolean;
  pesanFoto?: string;
  onCobaUlang: () => void;
  sedangUlang: boolean;
}) {
  const [tersalin, setTersalin] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
    } catch {
      // Fallback untuk browser tanpa Clipboard API (mis. HTTP non-secure)
      const ta = document.createElement("textarea");
      ta.value = manageUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 2200);
  };

  return (
    <div className="mx-auto max-w-[620px] space-y-4">
      {/* Kepala */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border p-4",
          fotoGagal
            ? "border-accent-bright bg-accent-soft"
            : "border-primary/25 bg-primary-soft",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
            fotoGagal ? "bg-accent" : "bg-primary",
          )}
        >
          {fotoGagal ? <IconAlert size={19} /> : <IconCheck size={19} />}
        </div>
        <div>
          <h1
            className={cn(
              "font-display text-[16px] font-bold",
              fotoGagal ? "text-accent-text" : "text-primary-dark",
            )}
          >
            {fotoGagal ? "Listing tayang, foto belum masuk" : "Barang kamu sudah tayang"}
          </h1>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
            {fotoGagal
              ? "Barangnya sudah bisa dilihat orang. Fotonya gagal terunggah — coba sekali lagi di bawah."
              : `Sudah bisa dilihat orang di kluster ${data.clusterName}.`}
          </p>
        </div>
      </div>

      {/* Peringatan foto gagal + coba ulang */}
      {fotoGagal && (
        <div className="rounded-md border border-line bg-surface p-4">
          <h2 className="text-[13px] font-bold text-ink">Foto gagal terunggah</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
            {pesanFoto ??
              "Koneksi terputus saat mengunggah. Listing tetap tayang, jadi kamu tidak perlu mengisi ulang formulir."}
          </p>
          <Button
            varian="outline"
            memuat={sedangUlang}
            onClick={onCobaUlang}
            className="mt-3 w-full"
          >
            {sedangUlang ? "Mencoba unggah…" : "Coba Unggah Foto Lagi"}
          </Button>
        </div>
      )}

      {/* Ringkasan barang */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
            Yang tayang
          </h2>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {data.isFree ? (
              <Badge varian="gratis">GRATIS</Badge>
            ) : (
              <span className="font-display text-[16px] font-bold text-ink">
                {formatRupiah(data.price)}
              </span>
            )}
            <Badge varian="kondisi">
              {LABEL_KONDISI[data.condition] ?? data.condition}
            </Badge>
          </div>

          <h3 className="font-display text-[16px] font-bold leading-snug text-ink">
            {data.title}
          </h3>

          <dl className="space-y-2 text-[13px]">
            <Baris label="Kluster" nilai={data.clusterName} />
            <Baris label="Patokan" nilai={data.pickupLandmark} />
            <Baris label="Batas ambil" nilai={formatTanggalID(data.deadlineDate)} />
            <Baris
              label="Foto"
              nilai={data.jumlahFoto > 0 ? `${data.jumlahFoto} foto` : "Belum ada foto"}
            />
          </dl>
        </div>
      </div>

      {/* Tautan rahasia */}
      <div className="rounded-md border border-primary/25 bg-primary-soft p-4">
        <h2 className="text-[13.5px] font-bold text-primary-dark">Simpan tautan ini</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
          Tautan ini satu-satunya cara kamu menandai barang sudah diambil atau
          menghapusnya. Simpan di catatan, atau salin dan kirim ke WhatsApp sendiri.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={manageUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Tautan pengelolaan"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-[11.5px] text-ink-secondary focus:border-primary focus:outline-none"
          />
          <Button
            varian={tersalin ? "outline" : "primary"}
            onClick={() => void salin()}
            className="shrink-0"
          >
            {tersalin ? <IconCheck size={15} /> : <IconCopy size={15} />}
            {tersalin ? "Tersalin" : "Salin"}
          </Button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/manage/${data.id}?token=${encodeURIComponent(data.token)}`}
            className="sm:flex-1"
          >
            <Button penuh>
              <IconEye size={15} />
              Buka Dashboard
            </Button>
          </Link>
          <Link href={`/listing/${data.id}`} className="sm:flex-1">
            <Button varian="outline" penuh>
              Lihat Halaman Publik
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-center text-[11.5px] leading-relaxed text-ink-secondary">
        Listing otomatis kedaluwarsa pada 00:01 WIB sehari setelah batas pengambilan.
      </p>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[104px] shrink-0 text-ink-secondary">{label}</dt>
      <dd className="flex-1 font-medium text-ink">{nilai}</dd>
    </div>
  );
}
