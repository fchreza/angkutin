"use client";

import { useState } from "react";
import Link from "next/link";
import { SecretLinkBox, StatusControls } from "./manage-controls";
import { FormEdit } from "./form-edit";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { MediaCarousel } from "@/components/detail/media-carousel";
import {
  IconCheck,
  IconEye,
  IconChat,
  IconAlert,
  IconEdit,
  IconClock,
} from "@/components/shared/icons";
import { formatRupiah, formatTanggalID, waktuRelatif } from "@/lib/format";
import {
  LABEL_KONDISI,
  LABEL_STATUS_PENJUAL,
  keteranganSisaWaktu,
  hariTersisaID,
} from "@/lib/urgency";
import { cn } from "@/lib/cn";
import type { Kategori } from "@/components/feed/filter-pills";

export type DataKelola = {
  id: string;
  title: string;
  description: string;
  price: string;
  isFree: boolean;
  condition: string;
  /** Status yang berlaku SEKARANG (tenggat lewat sudah dihitung). */
  status: string;
  /** Kolom status apa adanya di database — untuk membedakan pesan. */
  statusDb: string;
  /** Tanggal hari ini menurut WIB, dihitung server-side. */
  hariIni: string;
  deadline_date: string;
  pickup_landmark: string;
  access_notes: string | null;
  sellerName: string;
  sellerWhatsapp: string;
  provinceCode: string | null;
  provinceName: string | null;
  regencyCode: string | null;
  regencyName: string | null;
  districtCode: string | null;
  districtName: string | null;
  wilayahNama: string | null;
  categoryId: string | null;
  categoryName: string | null;
  created_at: string;
  images: { image_url: string; display_order: number }[];
  stat: { view: number; wa_click: number; ctr: number };
};

/**
 * Layar 4: Kelola Listing (Seller Secret Dashboard).
 *
 * Dua mode:
 *  - LIHAT  : statistik, detail barang, tombol status (bawaan)
 *  - UBAH   : form isian penuh, menggantikan kartu detail
 *
 * Mode ubah dibuka lewat tombol, bukan selalu tampil. Alasannya: sebagian
 * besar waktu penjual hanya ingin memantau, jadi menampilkan form penuh
 * terus-menerus membuat halaman terasa berat.
 *
 * Semua perubahan dilakukan tanpa memuat ulang halaman — state lokal
 * diperbarui supaya umpan balik instan.
 */
export function KelolaClient({
  data: dataAwal,
  token,
  manageUrl,
  kategori,
  fotoGagal,
}: {
  data: DataKelola;
  token: string;
  manageUrl: string;
  kategori: Kategori[];
  fotoGagal: boolean;
}) {
  const [data, setData] = useState(dataAwal);
  const [status, setStatus] = useState(dataAwal.status);
  const [modeUbah, setModeUbah] = useState(false);

  // Catatan: notifikasi perubahan status TIDAK dibuat di sini.
  // StatusControls yang memunculkannya lewat toast bersama. Sebelumnya
  // keduanya jalan sendiri-sendiri, jadi satu aksi memunculkan dua pesan.
  const ubahStatus = (s: string) => setStatus(s);

  const dihapus = status === "DELETED";
  const sudahDiambil = status === "TAKEN";
  /**
   * Listing yang tenggatnya sudah lewat tidak boleh diubah.
   *
   * Alasannya: validasi server menolak tenggat di masa lalu, jadi menyimpan
   * perubahan akan selalu gagal dengan pesan yang membingungkan. Lebih baik
   * tombolnya dimatikan dan penjual diberi tahu jalan keluarnya.
   */
  const sudahLewatTenggat = status === "EXPIRED";
  const bisaDiubahSekarang = status === "AVAILABLE";

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

  // Mode ubah: form penuh menggantikan seluruh tampilan kelola.
  if (modeUbah) {
    return (
      <div className="mx-auto max-w-[760px]">
        <FormEdit
          data={data}
          token={token}
          kategori={kategori}
          nonaktif={sudahDiambil}
          tenggatLewat={sudahLewatTenggat}
          onSimpan={(baru) => {
            setData((s) => ({ ...s, ...baru }));
            // Status adalah state terpisah dari data, jadi harus disetel
            // sendiri — kalau tidak, perpanjangan tenggat berhasil di server
            // tapi layar masih menampilkan "Waktu Habis".
            if (baru.status) setStatus(baru.status);
          }}
          onBatal={() => setModeUbah(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      {/* Banner utama — berubah sesuai keadaan listing.
          Sebelumnya selalu "berhasil tayang", padahal listing bisa sudah
          kedaluwarsa atau sudah diambil. */}
      {status === "AVAILABLE" ? (
        <div className="animate-slide-up flex items-start gap-3 rounded-md border border-primary/25 bg-primary-soft p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-teks">
            <IconCheck size={18} />
          </div>
          <div>
            <h1 className="font-display text-[15px] font-bold text-primary-dark">
              Listing tayang di katalog
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
              Barangmu sudah bisa dilihat orang di {data.wilayahNama ?? "—"}.
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-slide-up flex items-start gap-3 rounded-md border border-line bg-surface p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-appbg text-ink-secondary">
            {sudahDiambil ? <IconCheck size={18} /> : <IconClock size={18} />}
          </div>
          <div>
            <h1 className="font-display text-[15px] font-bold text-ink">
              {sudahDiambil
                ? "Barang ini sudah ditandai diambil"
                : "Waktu tayang listing ini sudah habis"}
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
              {sudahDiambil
                ? "Listing tidak lagi muncul di katalog."
                : "Listing otomatis hilang dari katalog setelah tenggatnya lewat."}
            </p>
          </div>
        </div>
      )}

      {/* Penjelasan kenapa listing tidak bisa diubah + jalan keluarnya.
          Tanpa ini, tombol "Ubah Listing" hanya terlihat mati tanpa sebab. */}
      {!bisaDiubahSekarang && (
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-appbg px-3.5 py-3">
          <IconAlert size={16} className="mt-[1px] shrink-0 text-ink-secondary" />
          <div className="text-[12.5px] leading-relaxed text-ink-secondary">
            {sudahDiambil ? (
              <>
                Tekan <b>Tandai Tersedia Lagi</b> kalau barangnya batal terjual —
                setelah itu listing bisa diubah kembali.
              </>
            ) : (
              <>
                <b>Barangnya masih ada?</b> Ubah batas pengambilan untuk
                menayangkannya lagi. Tekan <b>Tandai Tersedia Lagi</b>, lalu
                ubah tanggalnya.
              </>
            )}
          </div>
        </div>
      )}

      {/* Peringatan kalau foto gagal diunggah */}
      {fotoGagal && (
        <div className="flex items-start gap-2.5 rounded-md border border-accent-bright bg-accent-soft px-3.5 py-3">
          <IconAlert size={16} className="mt-[1px] shrink-0 text-accent" />
          <div className="text-[12.5px] leading-relaxed text-accent-text">
            <b>Listing tetap tayang</b>, tapi fotonya gagal terunggah. Buka
            &quot;Ubah Listing&quot; untuk menambahkan fotonya.
          </div>
        </div>
      )}

      {/* Tautan rahasia */}
      <SecretLinkBox manageUrl={manageUrl} sellerWhatsapp={data.sellerWhatsapp} />

      {/* Statistik KPI (wajib tampil menurut PRD §3.2 ENHANCED) */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Dilihat" nilai={data.stat.view} ikon={<IconEye size={15} />} urutan={0} />
        <StatTile
          label="Klik WhatsApp"
          nilai={data.stat.wa_click}
          ikon={<IconChat size={15} />}
          urutan={1}
        />
        <StatTile
          label="CTR"
          nilai={`${data.stat.ctr}%`}
          ikon={null}
          catatan="target 35%"
          menyorot={data.stat.ctr >= 35}
          urutan={2}
        />
      </div>

      {/* Kartu listing */}
      <div className="animate-slide-up overflow-hidden rounded-md border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              varian={sudahDiambil ? "taken" : status === "EXPIRED" ? "netral" : "wilayah"}
            >
              {LABEL_STATUS_PENJUAL[status] ?? status}
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
            <Baris label="Batas ambil" nilai={formatTanggalID(data.deadline_date)} />
            <Baris
              label="Sisa waktu"
              nilai={keteranganSisaWaktu(data.deadline_date, new Date(`${data.hariIni}T00:00:00Z`))}
            />
            <Baris label="Ditayangkan" nilai={waktuRelatif(data.created_at)} />
          </dl>
        </div>

        {/* Aksi utama: ubah isi listing.
            Tetap aktif untuk listing kedaluwarsa — itu satu-satunya jalan
            keluar untuk memperpanjang tenggat. Dimatikan hanya kalau sudah
            diambil, karena status TAKEN adalah keputusan sadar penjual. */}
        <div className="border-t border-line px-4 py-3">
          <Button
            varian="outline"
            penuh
            onClick={() => setModeUbah(true)}
            disabled={sudahDiambil}
          >
            <IconEdit size={15} />
            {sudahLewatTenggat ? "Perpanjang Waktu Tayang" : "Ubah Listing"}
          </Button>
          <p className="mt-2 text-center text-[11.5px] leading-relaxed text-ink-secondary">
            {sudahDiambil
              ? "Tandai tersedia lagi dulu untuk mengubah isinya."
              : sudahLewatTenggat
                ? "Perbarui batas pengambilan supaya barangmu tayang lagi di katalog."
                : "Salah harga, deskripsi, atau foto? Ubah di sini tanpa perlu memasang ulang."}
          </p>
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
  urutan = 0,
}: {
  label: string;
  nilai: number | string;
  ikon: React.ReactNode;
  catatan?: string;
  menyorot?: boolean;
  /** Posisi untuk animasi masuk berurutan. */
  urutan?: number;
}) {
  return (
    <div
      className="animate-list-in rounded-md border border-line bg-surface p-3.5"
      style={{ "--d": `${urutan * 60}ms` } as React.CSSProperties}
    >
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
      {catatan && <div className="text-[11px] text-ink-secondary">{catatan}</div>}
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
