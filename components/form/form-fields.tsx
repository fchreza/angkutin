"use client";

import { IconAlert } from "@/components/shared/icons";
import { KalenderTenggat } from "./kalender-tenggat";
import { Select } from "@/components/shared/select";
import { cn } from "@/lib/cn";
import { keYMD } from "@/lib/format";
import { WilayahPicker, type PilihanWilayah } from "./wilayah-picker";
import { ConditionSegmented } from "./condition-segmented";
import { PriceWithGiveaway } from "./price-with-giveaway";
import type { Kategori } from "@/components/feed/filter-pills";

/**
 * Isian bersama untuk MEMBUAT dan MENGUBAH listing.
 *
 * KENAPA DIPISAH:
 * Form pasang dan form edit memakai isian yang sama persis. Kalau markup-nya
 * ditulis dua kali, keduanya akan menyimpang — aturan validasi berbeda,
 * panjang maksimum berbeda, atau ada isian yang tertinggal di salah satunya.
 * Dengan satu komponen, setiap perbaikan berlaku untuk kedua alur.
 *
 * Yang TIDAK ada di sini: unggah foto (form pasang memakai pemilih berkas,
 * form edit memakai pengelola foto yang sudah tersimpan) dan tombol kirim
 * (teksnya berbeda: "Tayangkan" vs "Simpan Perubahan").
 */

export const MAKS_HARI = 14;

export type Galat = Record<string, string>;

export type NilaiForm = {
  judul: string;
  deskripsi: string;
  kategoriId: string;
  kondisi: string;
  gratis: boolean;
  harga: string;
  wilayah: PilihanWilayah;
  patokan: string;
  tenggat: string;
  catatan: string;
  nama: string;
  wa: string;
};

export const WILAYAH_KOSONG: PilihanWilayah = {
  province_code: "",
  province_name: "",
  regency_code: "",
  regency_name: "",
  district_code: "",
  district_name: "",
};

/** Nilai awal untuk form pasang baru: tenggat 7 hari dari sekarang. */
export function nilaiAwal(kategoriId: string): NilaiForm {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return {
    judul: "",
    deskripsi: "",
    kategoriId,
    kondisi: "",
    gratis: false,
    harga: "",
    wilayah: { ...WILAYAH_KOSONG },
    patokan: "",
    tenggat: keYMD(d),
    catatan: "",
    nama: "",
    wa: "",
  };
}

/** Batas tanggal untuk input tenggat. */
export function batasTenggat() {
  const d = new Date();
  const maks = new Date();
  maks.setDate(maks.getDate() + MAKS_HARI);
  return { hariIni: keYMD(d), maksTenggat: keYMD(maks) };
}

/**
 * Tanggal tenggat yang masuk akal untuk listing yang sudah kedaluwarsa.
 *
 * Dipakai saat penjual memperpanjang waktu tayang: tanggal lama sudah di masa
 * lalu dan akan ditolak server, jadi form diisi dengan tanggal baru supaya
 * penjual tidak perlu menebak dari nol.
 */
export function nilaiTenggatBaru(hari = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  return keYMD(d);
}

/**
 * Validasi di sisi klien supaya umpan balik instan.
 * Server tetap memvalidasi ulang — ini hanya untuk kenyamanan, bukan pengaman.
 */
export function validasiForm(v: NilaiForm, opsi?: { wajibFoto?: boolean; jumlahFoto?: number }): Galat {
  const g: Galat = {};

  if (opsi?.wajibFoto && (opsi.jumlahFoto ?? 0) === 0) {
    g.foto = "Pilih minimal 1 foto.";
  }
  if (v.judul.trim().length < 3) g.judul = "Judul minimal 3 karakter.";
  else if (v.judul.trim().length > 50) g.judul = "Judul maksimal 50 karakter.";

  if (v.deskripsi.trim().length < 10) g.deskripsi = "Deskripsi minimal 10 karakter.";

  if (!v.kondisi) g.kondisi = "Pilih kondisi barang.";

  const angka = Number((v.harga || "0").replace(/\./g, ""));
  if (!v.gratis && angka <= 0) g.harga = "Isi harga, atau aktifkan Berikan Gratis.";

  if (!v.wilayah.province_code) g.wilayah = "Pilih provinsi.";
  else if (!v.wilayah.regency_code) g.wilayah = "Pilih kabupaten/kota.";
  else if (!v.wilayah.district_code) g.wilayah = "Pilih kecamatan.";

  if (v.patokan.trim().length < 5) g.patokan = "Patokan lokasi minimal 5 karakter.";

  if (!v.tenggat) g.tenggat = "Pilih batas pengambilan.";

  if (v.nama.trim().length < 2) g.nama = "Nama minimal 2 karakter.";

  if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(v.wa.replace(/[\s-]/g, ""))) {
    g.wa = "Nomor WhatsApp tidak valid. Gunakan 08xx atau +62.";
  }

  return g;
}

/** Ubah pesan galat per-field dari server menjadi bentuk yang dipakai form. */
export function rapikanGalatServer(detail: Galat): Galat {
  // Server memakai kunci province_code/regency_code/district_code. Form
  // menampilkannya di satu tempat (bawah pilihan kecamatan), jadi digabung
  // dulu — kalau tidak, galatnya tidak terlihat sama sekali.
  const d: Galat = { ...detail };
  const w = d.district_code ?? d.regency_code ?? d.province_code ?? undefined;
  if (w) {
    d.wilayah = w;
    delete d.district_code;
    delete d.regency_code;
    delete d.province_code;
  }
  return d;
}

/** Payload yang dikirim ke API. Bentuknya sama untuk create dan edit. */
export function payloadDari(v: NilaiForm) {
  const angka = Number((v.harga || "0").replace(/\./g, ""));
  return {
    title: v.judul.trim(),
    description: v.deskripsi.trim(),
    category_id: v.kategoriId,
    condition: v.kondisi,
    is_free: v.gratis,
    price: v.gratis ? 0 : angka,
    province_code: v.wilayah.province_code,
    regency_code: v.wilayah.regency_code,
    district_code: v.wilayah.district_code,
    pickup_landmark: v.patokan.trim(),
    deadline_date: v.tenggat,
    access_notes: v.catatan.trim(),
    seller_name: v.nama.trim(),
    seller_whatsapp: v.wa.trim(),
  };
}

export function FormListingFields({
  nilai,
  onUbah,
  galat,
  kategori,
  sembunyikanKontak = false,
}: {
  nilai: NilaiForm;
  onUbah: <K extends keyof NilaiForm>(k: K, v: NilaiForm[K]) => void;
  galat: Galat;
  kategori: Kategori[];
  /** true = bagian kontak disembunyikan (dipakai alur tertentu saja). */
  sembunyikanKontak?: boolean;
}) {
  const { hariIni, maksTenggat } = batasTenggat();

  return (
    <>
      {/* Detail barang */}
      <section
        id="bagian-barang"
        className="scroll-mt-[116px] space-y-4 rounded-md border border-line bg-surface p-4"
      >
        <h2 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-secondary">
          Detail barang
        </h2>

        <div>
          <label htmlFor="judul" className="mb-2 block text-[14px] font-semibold text-ink">
            Judul barang <span className="text-danger">*</span>
          </label>
          <input
            id="judul"
            value={nilai.judul}
            onChange={(e) => onUbah("judul", e.target.value.slice(0, 50))}
            placeholder="Contoh: Kasur spring bed 120x200"
            className={cn(
              "h-11 w-full rounded-md border px-3 text-[16px] focus:outline-none",
              galat.judul ? "border-danger" : "border-line focus:border-primary",
            )}
          />
          <div className="mt-1 flex justify-between">
            {galat.judul ? (
              <p className="text-[14px] text-danger">{galat.judul}</p>
            ) : (
              <span />
            )}
            <span className="text-[14px] text-ink-secondary">{nilai.judul.length}/50</span>
          </div>
        </div>

        <div>
          <label htmlFor="kategori" className="mb-2 block text-[14px] font-semibold text-ink">
            Kategori <span className="text-danger">*</span>
          </label>
          <Select
            id="kategori"
            nilai={nilai.kategoriId}
            onUbah={(v) => onUbah("kategoriId", v)}
            opsi={kategori.map((k) => ({ value: k.id, label: k.name }))}
          />
        </div>

        <ConditionSegmented
          nilai={nilai.kondisi}
          onUbah={(v) => onUbah("kondisi", v)}
          galat={galat.kondisi}
        />

        <PriceWithGiveaway
          gratis={nilai.gratis}
          harga={nilai.harga}
          onGratis={(v) => onUbah("gratis", v)}
          onHarga={(v) => onUbah("harga", v)}
          galat={galat.harga}
        />

        <div>
          <label htmlFor="deskripsi" className="mb-2 block text-[14px] font-semibold text-ink">
            Deskripsi &amp; kondisi jujur <span className="text-danger">*</span>
          </label>
          <textarea
            id="deskripsi"
            rows={4}
            value={nilai.deskripsi}
            onChange={(e) => onUbah("deskripsi", e.target.value.slice(0, 500))}
            placeholder="Sebutkan minusnya apa adanya, mis. ada noda kecil di sudut, rangka masih kokoh."
            className={cn(
              "w-full resize-y rounded-md border px-3 py-2.5 text-[16px] leading-relaxed focus:outline-none",
              galat.deskripsi ? "border-danger" : "border-line focus:border-primary",
            )}
          />
          <div className="mt-1 flex justify-between">
            {galat.deskripsi ? (
              <p className="text-[14px] text-danger">{galat.deskripsi}</p>
            ) : (
              <span />
            )}
            <span className="text-[14px] text-ink-secondary">
              {nilai.deskripsi.length}/500
            </span>
          </div>
        </div>
      </section>

      {/* Penjemputan */}
      <section
        id="bagian-penjemputan"
        className="scroll-mt-[116px] space-y-4 rounded-md border border-line bg-surface p-4"
      >
        <h2 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-secondary">
          Penjemputan
        </h2>

        <div data-galat={galat.wilayah ? "1" : "0"}>
          <WilayahPicker
            nilai={nilai.wilayah}
            onUbah={(w) => onUbah("wilayah", w)}
            galat={galat.wilayah}
          />
        </div>

        <div>
          <label htmlFor="patokan" className="mb-2 block text-[14px] font-semibold text-ink">
            Patokan lokasi penjemputan <span className="text-danger">*</span>
          </label>
          <input
            id="patokan"
            value={nilai.patokan}
            onChange={(e) => onUbah("patokan", e.target.value.slice(0, 150))}
            placeholder="Contoh: Dekat Indomaret Point, gang sebelah warung Bu Ida"
            className={cn(
              "h-11 w-full rounded-md border px-3 text-[16px] focus:outline-none",
              galat.patokan ? "border-danger" : "border-line focus:border-primary",
            )}
          />
          {galat.patokan ? (
            <p className="mt-1.5 text-[14px] text-danger">{galat.patokan}</p>
          ) : (
            <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
              Cukup patokan umum, jangan tulis nomor kamar atau alamat lengkap.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="tenggat" className="mb-2 block text-[14px] font-semibold text-ink">
            Batas pengambilan <span className="text-danger">*</span>
          </label>
          <KalenderTenggat
            nilai={nilai.tenggat}
            onUbah={(ymd) => onUbah("tenggat", ymd)}
            hariIni={hariIni}
            maksTenggat={maksTenggat}
            adaGalat={Boolean(galat.tenggat)}
            maksHari={MAKS_HARI}
          />
          {galat.tenggat ? (
            <p className="mt-1.5 text-[14px] text-danger">{galat.tenggat}</p>
          ) : (
            <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
              Maksimal {MAKS_HARI} hari. Listing otomatis kedaluwarsa pada 00:01 WIB
              setelah tanggal ini.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="catatan" className="mb-2 block text-[14px] font-semibold text-ink">
            Catatan akses logistik{" "}
            <span className="text-ink-secondary">(opsional)</span>
          </label>
          <input
            id="catatan"
            value={nilai.catatan}
            onChange={(e) => onUbah("catatan", e.target.value.slice(0, 200))}
            placeholder="Contoh: Kamar lantai 3, tangga sempit, butuh 2 orang"
            className={cn(
              "h-11 w-full rounded-md border border-line px-3 text-[16px] focus:border-primary focus:outline-none",
              galat.catatan ? "border-danger" : "border-line",
            )}
          />
        </div>
      </section>

      {/* Kontak */}
      {!sembunyikanKontak && (
        <section
          id="bagian-kontak"
          className="scroll-mt-[116px] space-y-4 rounded-md border border-line bg-surface p-4"
        >
          <h2 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-secondary">
            Kontak penjual
          </h2>

          <div>
            <label htmlFor="nama" className="mb-2 block text-[14px] font-semibold text-ink">
              Nama panggilan <span className="text-danger">*</span>
            </label>
            <input
              id="nama"
              value={nilai.nama}
              onChange={(e) => onUbah("nama", e.target.value.slice(0, 50))}
              placeholder="Contoh: Rina"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[16px] focus:outline-none",
                galat.nama ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.nama && <p className="mt-1.5 text-[14px] text-danger">{galat.nama}</p>}
          </div>

          <div>
            <label htmlFor="wa" className="mb-2 block text-[14px] font-semibold text-ink">
              Nomor WhatsApp <span className="text-danger">*</span>
            </label>
            <input
              id="wa"
              inputMode="tel"
              value={nilai.wa}
              onChange={(e) => onUbah("wa", e.target.value.slice(0, 20))}
              placeholder="0812 3456 7890"
              className={cn(
                "h-11 w-full rounded-md border px-3 text-[16px] focus:outline-none",
                galat.wa ? "border-danger" : "border-line focus:border-primary",
              )}
            />
            {galat.wa ? (
              <p className="mt-1.5 text-[14px] text-danger">{galat.wa}</p>
            ) : (
              <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-secondary">
                Nomor ini tidak ditampilkan di halaman publik, hanya dipakai
                saat pembeli menekan tombol WhatsApp.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

/** Kotak peringatan umum di atas form (dipakai create & edit). */
export function GalatUmum({ pesan }: { pesan: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft px-3.5 py-3 text-[14px] text-danger">
      <IconAlert size={16} className="mt-[1px] shrink-0" />
      <span>{pesan}</span>
    </div>
  );
}
