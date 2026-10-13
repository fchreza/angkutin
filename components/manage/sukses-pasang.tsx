"use client";

import Link, { useLinkStatus } from "next/link";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { AppleBreathe } from "@/components/shared/apple-breathe";
import { TombolSalin } from "@/components/shared/tombol-salin";
import { IconCheck, IconAlert, IconEye, IconPlus } from "@/components/shared/icons";
import { formatRupiah, formatTanggalID } from "@/lib/format";
import { LABEL_KONDISI } from "@/lib/urgency";
import { useToast } from "@/components/shared/toast";
import { urlPasangKeLapak } from "@/lib/konteks-lapak";
import { cn } from "@/lib/cn";

export type RingkasanListing = {
  id: string;
  token: string;
  title: string;
  price: string;
  isFree: boolean;
  condition: string;
  wilayahNama: string;
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
/**
 * Isi tautan yang berganti jadi loader saat tautannya sedang dibuka.
 *
 * `useLinkStatus` membaca status tautan terdekat di atasnya, jadi umpan
 * baliknya muncul sejak ditekan — sebelum halaman tujuan siap.
 */
function IsiTautan({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return (
    <>
      <AppleBreathe ukuran={16} />
      <span className="sr-only">Membuka {label}…</span>
    </>
  );
}

export function SuksesPasang({
  data,
  manageUrl,
  publicUrl,
  stallUrl,
  stallId,
  stallToken,
  fotoGagal,
  pesanFoto,
  onCobaUlang,
  sedangUlang,
  onTambahLagi,
}: {
  data: RingkasanListing;
  manageUrl: string;
  /** Tautan PUBLIK — untuk dibagikan, tanpa akses kelola. */
  publicUrl: string;
  /** Tautan RAHASIA lapak — mengelola semua barang. */
  stallUrl: string;
  /** Id + token lapak, untuk menyusun tautan "tambah barang lagi". */
  stallId: string;
  stallToken: string;
  fotoGagal: boolean;
  pesanFoto?: string;
  onCobaUlang: () => void;
  sedangUlang: boolean;
  /**
   * Dipanggil saat penjual memilih memasang barang berikutnya.
   *
   * KENAPA LEWAT CALLBACK, BUKAN `<Link>` BIASA:
   * Tautan "Tambah Barang Lagi" menuju `/pasang` — halaman yang SAMA dengan
   * layar sukses ini. Karena pathnamenya tidak berubah, Next.js tidak
   * memasang ulang komponennya, sehingga state `hasil` tetap terisi dan layar
   * sukses terus yang tampil. Penjual menekan tombolnya dan tidak terjadi
   * apa-apa. Jadi selain berpindah, form-nya juga harus diminta mereset diri.
   */
  onTambahLagi: () => void;
}) {
  const { tampilkan } = useToast();

  return (
    <div className="mx-auto max-w-[620px] space-y-4">
      {/* Kepala */}
      <div
        className={cn(
          "animate-slide-up flex items-start gap-3 rounded-md border p-4",
          fotoGagal
            ? "border-accent-bright bg-accent-soft"
            : "border-primary/25 bg-primary-soft",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            fotoGagal ? "bg-accent text-white" : "bg-primary text-primary-teks",
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
              ? "Barangnya sudah bisa dilihat orang. Fotonya gagal terunggah. Coba sekali lagi di bawah."
              : `Sudah bisa dilihat orang di ${data.wilayahNama}.`}
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
      <div
        className="animate-slide-up overflow-hidden rounded-md border border-line bg-surface"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
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
            <Baris label="Lokasi" nilai={data.wilayahNama} />
            <Baris label="Patokan" nilai={data.pickupLandmark} />
            <Baris label="Batas ambil" nilai={formatTanggalID(data.deadlineDate)} />
            <Baris
              label="Foto"
              nilai={data.jumlahFoto > 0 ? `${data.jumlahFoto} foto` : "Belum ada foto"}
            />
          </dl>
        </div>
      </div>

      {/* === TAUTAN PUBLIK — untuk dibagikan === */}
      <div
        className="animate-slide-up rounded-md border border-line bg-surface p-4"
        style={{ "--d": "140ms" } as React.CSSProperties}
      >
        <h2 className="text-[13.5px] font-bold text-ink">
          1. Tautan publik, bagikan barang ini
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
          Aman disebar ke grup WhatsApp mana pun. Tautan ini hanya menampilkan
          iklan, tidak bisa mengubah atau menghapus apa pun.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={publicUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Tautan publik barang"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 font-mono text-[11.5px] text-ink-secondary focus:border-primary focus:outline-none"
          />
          <TombolSalin
            nilai={publicUrl}
            varian="primary"
            onTersalin={() => tampilkan("Tautan publik disalin.")}
          />
        </div>

        <Link href={`/listing/${data.id}`} className="mt-3 block">
          <Button varian="outline" penuh>
            <IsiTautan label="halaman publik">
              <IconEye size={15} />
              Lihat Halaman Publik
            </IsiTautan>
          </Button>
        </Link>
      </div>

      {/* === TAUTAN RAHASIA LAPAK — untuk mengelola === */}
      <div
        className="animate-slide-up rounded-md border border-primary/25 bg-primary-soft p-4"
        style={{ "--d": "200ms" } as React.CSSProperties}
      >
        <h2 className="text-[13.5px] font-bold text-primary-dark">
          2. Tautan rahasia lapak, jangan dibagikan
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
          Tautan ini mengelola <strong>semua</strong> barangmu, sekarang dan
          yang kamu tambah nanti. Simpan di catatan, kalau hilang, barang-barang
          ini tidak bisa dikelola lagi.
        </p>

        <div className="mt-3 flex gap-2">
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

        {/*
          Tombol utama di sini adalah "Tambah Barang Lagi", bukan "Buka
          Dashboard".

          KENAPA: setelah memasang satu barang, keinginan berikutnya yang
          paling wajar adalah memasang barang KEDUA. Dulu tombol yang tersedia
          hanya "Buka Dashboard" — dan itu mengarah ke dashboard SATU BARANG
          yang tidak punya tombol tambah apa pun, jadi penjual buntu.

          Sekarang: tombol pertama langsung membawa konteks lapak, jadi barang
          berikutnya otomatis masuk ke lapak yang sama.
        */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href={urlPasangKeLapak(stallId, stallToken)}
            className="sm:flex-1"
            onClick={onTambahLagi}
          >
            <Button penuh>
              <IsiTautan label="form pasang">
                <IconPlus size={15} />
                Tambah Barang Lagi
              </IsiTautan>
            </Button>
          </Link>
          <Link href={stallUrl} className="sm:flex-1">
            <Button varian="outline" penuh>
              <IsiTautan label="Dashboard lapak">
                <IconEye size={15} />
                Buka Dashboard
              </IsiTautan>
            </Button>
          </Link>
        </div>

        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-mono">
          &ldquo;Tambah Barang Lagi&rdquo; memasukkan barang baru ke lapak yang
          sama. Tombol &ldquo;Pasang Barang&rdquo; di menu atas membuat lapak
          baru.
        </p>
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
