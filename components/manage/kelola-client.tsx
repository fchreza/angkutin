"use client";

import { useState } from "react";
import Link from "next/link";
import { SecretLinkBox, StatusControls } from "./manage-controls";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { MediaCarousel } from "@/components/detail/media-carousel";
import { IconCheck, IconEye, IconChat, IconAlert } from "@/components/shared/icons";
import { formatRupiah, formatTanggalID, waktuRelatif } from "@/lib/format";
import { LABEL_KONDISI, LABEL_STATUS } from "@/lib/urgency";
import { cn } from "@/lib/cn";

export type DataKelola = {
  id: string;
  title: string;
  description: string;
  price: string;
  isFree: boolean;
  condition: string;
  status: string;
  deadline_date: string;
  pickup_landmark: string;
  access_notes: string | null;
  sellerName: string;
  sellerWhatsapp: string;
  wilayahNama: string | null;
  categoryName: string | null;
  created_at: string;
  images: { image_url: string; display_order: number }[];
  stat: { view: number; wa_click: number; ctr: number };
};

/**
 * Layar 4: Kelola Listing (Seller Secret Dashboard).
 *
 * Semua perubahan status dilakukan tanpa reload halaman — state lokal
 * diperbarui supaya umpan balik instan, dan tidak ada kedip.
 */
export function KelolaClient({
  data,
  token,
  manageUrl,
  fotoGagal,
}: {
  data: DataKelola;
  token: string;
  manageUrl: string;
  fotoGagal: boolean;
}) {
  const [status, setStatus] = useState(data.status);
  const [banner, setBanner] = useState<string | null>(null);

  const ubahStatus = (s: string) => {
    setStatus(s);
    setBanner(
      s === "TAKEN"
        ? "Barang ditandai sudah diambil"
        : s === "AVAILABLE"
          ? "Barang ditandai tersedia lagi"
          : "Postingan dihapus",
    );
    setTimeout(() => setBanner(null), 3200);
  };

  const dihapus = status === "DELETED";
  const sudahDiambil = status === "TAKEN";

  if (dihapus) {
    return (
      <div className="mx-auto max-w-[560px] py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-appbg">
          <IconCheck size={24} className="text-ink-secondary" />
        </div>
        <h1 className="font-display text-[20px] font-bold text-ink">
          Postingan sudah dihapus
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          Barang ini tidak lagi tampil di katalog.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button varian="outline">Kembali ke Katalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      {/* Banner sukses */}
      <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary-soft p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <IconCheck size={18} />
        </div>
        <div>
          <h1 className="font-display text-[15px] font-bold text-primary-dark">
            Listing berhasil tayang
          </h1>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
            Barangmu sudah bisa dilihat orang di {data.wilayahNama ?? "—"}.
          </p>
        </div>
      </div>

      {/* Peringatan kalau foto gagal diunggah */}
      {fotoGagal && (
        <div className="flex items-start gap-2.5 rounded-md border border-accent-bright bg-accent-soft px-3.5 py-3">
          <IconAlert size={16} className="mt-[1px] shrink-0 text-accent" />
          <div className="text-[12.5px] leading-relaxed text-accent-text">
            <b>Listing tetap tayang</b>, tapi fotonya gagal terunggah. Coba
            pasang ulang barang ini supaya pembeli bisa melihat fotonya.
          </div>
        </div>
      )}

      {/* Tautan rahasia */}
      <SecretLinkBox manageUrl={manageUrl} sellerWhatsapp={data.sellerWhatsapp} />

      {/* Statistik KPI (wajib tampil menurut PRD §3.2 ENHANCED) */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Dilihat"
          nilai={data.stat.view}
          ikon={<IconEye size={15} />}
        />
        <StatTile
          label="Klik WhatsApp"
          nilai={data.stat.wa_click}
          ikon={<IconChat size={15} />}
        />
        <StatTile
          label="CTR"
          nilai={`${data.stat.ctr}%`}
          ikon={null}
          catatan="target 35%"
          menyorot={data.stat.ctr >= 35}
        />
      </div>

      {/* Kartu listing */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              varian={
                sudahDiambil ? "taken" : status === "EXPIRED" ? "netral" : "wilayah"
              }
            >
              {LABEL_STATUS[status] ?? status}
            </Badge>
            {data.isFree ? (
              <Badge varian="gratis">GRATIS</Badge>
            ) : (
              <span className="text-[14px] font-bold text-ink">
                {formatRupiah(data.price)}
              </span>
            )}
          </div>
          <h2 className="mt-2 font-display text-[17px] font-bold leading-snug text-ink">
            {data.title}
          </h2>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr]">
          <div className={cn(sudahDiambil && "opacity-70")}>
            {data.images.length > 0 ? (
              <MediaCarousel foto={data.images} judul={data.title} />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-md border border-line bg-appbg text-[12px] text-ink-secondary">
                Tanpa foto
              </div>
            )}
          </div>

          <dl className="space-y-2.5 text-[13px]">
            <Baris label="Kondisi" nilai={LABEL_KONDISI[data.condition] ?? data.condition} />
            <Baris label="Kategori" nilai={data.categoryName ?? "—"} />
            <Baris label="Lokasi" nilai={data.wilayahNama ?? "—"} />
            <Baris label="Patokan" nilai={data.pickup_landmark} />
            {data.access_notes && <Baris label="Catatan akses" nilai={data.access_notes} />}
            <Baris
              label="Batas ambil"
              nilai={formatTanggalID(data.deadline_date)}
            />
            <Baris label="Ditayangkan" nilai={waktuRelatif(data.created_at)} />
          </dl>
        </div>

        <div className="border-t border-line bg-appbg px-4 py-4">
          <StatusControls
            listingId={data.id}
            token={token}
            status={status}
            onBerubah={ubahStatus}
          />
        </div>
      </div>

      {/* Toast perubahan status */}
      {banner && (
        <div className="animate-fade-up fixed bottom-[80px] left-1/2 z-40 -translate-x-1/2 md:bottom-8">
          <div className="flex items-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-modal">
            <IconCheck size={15} />
            {banner}
          </div>
        </div>
      )}

      <div className="pt-2 text-center">
        <Link href="/" className="text-[13px] font-medium text-primary hover:underline">
          ← Kembali ke katalog
        </Link>
      </div>
    </div>
  );
}

function StatTile({
  label,
  nilai,
  ikon,
  catatan,
  menyorot = false,
}: {
  label: string;
  nilai: number | string;
  ikon: React.ReactNode;
  catatan?: string;
  menyorot?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-secondary">
        {ikon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-display text-[20px] font-bold",
          menyorot ? "text-primary" : "text-ink",
        )}
      >
        {nilai}
      </div>
      {catatan && (
        <div className="text-[11px] text-ink-secondary">{catatan}</div>
      )}
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
