"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { useToast } from "@/components/shared/toast";
import {
  FormListingFields,
  GalatUmum,
  nilaiTenggatBaru,
  payloadDari,
  rapikanGalatServer,
  validasiForm,
  WILAYAH_KOSONG,
  type Galat,
  type NilaiForm,
} from "@/components/form/form-fields";
import { PhotoManager, type FotoTersimpan } from "./photo-manager";
import type { Kategori } from "@/components/feed/filter-pills";
import type { DataKelola } from "./kelola-client";

/**
 * Form ubah listing di halaman kelola (FR-4).
 *
 * KENAPA TERPISAH DARI TAMPILAN DETAIL:
 * Halaman kelola dipakai untuk dua hal yang berbeda sifatnya — memantau
 * (statistik, status) dan mengubah. Menggabungkan keduanya membuat halaman
 * penuh isian padahal sebagian besar waktu penjual hanya ingin melihat.
 * Jadi mode ubah dibuka lewat tombol, dan formnya muncul menggantikan kartu
 * detail.
 *
 * Isian memakai `FormListingFields` yang sama dengan form pasang, jadi aturan
 * validasinya tidak mungkin menyimpang.
 */
export function FormEdit({
  data,
  token,
  kategori,
  onSimpan,
  onBatal,
  nonaktif,
  tenggatLewat = false,
}: {
  data: DataKelola;
  token: string;
  kategori: Kategori[];
  onSimpan: (baru: Partial<DataKelola>) => void;
  onBatal: () => void;
  /** true = status listing tidak memungkinkan diubah (mis. sudah diambil). */
  nonaktif?: boolean;
  /**
   * true = tenggat sudah lewat, jadi penjual sedang memperpanjang waktu tayang.
   *
   * Ini satu-satunya jalan keluar untuk listing kedaluwarsa: server menolak
   * tenggat di masa lalu, jadi tanpa memperpanjang tanggal, listing itu tidak
   * akan pernah bisa tampil lagi — walaupun statusnya dikembalikan ke
   * AVAILABLE.
   */
  tenggatLewat?: boolean;
}) {
  const { tampilkan } = useToast();

  // Untuk listing kedaluwarsa, tenggat lama sudah tidak valid (di masa lalu).
  // Isi dengan tanggal yang masuk akal supaya penjual tidak harus menebak.
  const [foto, setFoto] = useState<FotoTersimpan[]>(data.images);
  const [nilai, setNilai] = useState<NilaiForm>({
    judul: data.title,
    deskripsi: data.description,
    kategoriId: data.categoryId ?? "",
    kondisi: data.condition,
    gratis: data.isFree,
    harga: data.isFree ? "" : String(Math.round(Number(data.price))),
    wilayah: {
      ...WILAYAH_KOSONG,
      province_code: data.provinceCode ?? "",
      province_name: data.provinceName ?? "",
      regency_code: data.regencyCode ?? "",
      regency_name: data.regencyName ?? "",
      district_code: data.districtCode ?? "",
      district_name: data.districtName ?? "",
    },
    patokan: data.pickup_landmark,
    tenggat: tenggatLewat ? nilaiTenggatBaru(7) : data.deadline_date,
    catatan: data.access_notes ?? "",
    nama: data.sellerName,
    wa: data.sellerWhatsapp,
  });

  const [galat, setGalat] = useState<Galat>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const ubah = <K extends keyof NilaiForm>(k: K, v: NilaiForm[K]) =>
    setNilai((s) => ({ ...s, [k]: v }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat({});
    setGalatUmum(null);

    const g = validasiForm(nilai);

    if (Object.keys(g).length > 0) {
      setGalat(g);
      setGalatUmum("Masih ada isian yang perlu diperbaiki.");
      document
        .querySelector("[data-galat='1']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setMenyimpan(true);
    try {
      const r = await fetch(`/api/v1/listings/manage/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payloadDari(nilai), token }),
      });

      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as {
          error?: string;
          detail?: Galat;
        };
        if (j.detail) setGalat(rapikanGalatServer(j.detail));
        setGalatUmum(j.error ?? "Gagal menyimpan perubahan. Coba lagi.");
        return;
      }

      // Sukses: kirim nilai baru ke induk supaya tampilan detail ikut berubah
      // tanpa perlu memuat ulang halaman.
      //
      // `status` ikut dikirim untuk kasus perpanjang tenggat: server
      // mengembalikan EXPIRED ke AVAILABLE, dan tanpa meneruskannya di sini
      // penjual tetap melihat "Waktu Habis" walaupun listingnya sudah tayang
      // lagi — dia harus refresh untuk tahu bahwa berhasil.
      onSimpan({
        title: nilai.judul.trim(),
        description: nilai.deskripsi.trim(),
        categoryId: nilai.kategoriId,
        categoryName:
          kategori.find((k) => k.id === nilai.kategoriId)?.name ?? null,
        condition: nilai.kondisi,
        isFree: nilai.gratis,
        price: nilai.gratis
          ? "0"
          : String(Number((nilai.harga || "0").replace(/\./g, ""))),
        provinceCode: nilai.wilayah.province_code,
        provinceName: nilai.wilayah.province_name,
        regencyCode: nilai.wilayah.regency_code,
        regencyName: nilai.wilayah.regency_name,
        districtCode: nilai.wilayah.district_code,
        districtName: nilai.wilayah.district_name,
        wilayahNama: [nilai.wilayah.district_name, nilai.wilayah.regency_name]
          .filter(Boolean)
          .join(", "),
        pickup_landmark: nilai.patokan.trim(),
        deadline_date: nilai.tenggat,
        access_notes: nilai.catatan.trim() || null,
        sellerName: nilai.nama.trim(),
        images: foto,
        status: tenggatLewat ? "AVAILABLE" : undefined,
      });

      tampilkan(
        tenggatLewat ? "Listing tayang lagi dengan tenggat baru." : "Perubahan tersimpan.",
      );
      onBatal(); // keluar dari mode ubah
    } catch {
      setGalatUmum("Gagal menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary-soft p-4">
        <div>
          <h2 className="font-display text-[15px] font-bold text-primary-dark">
            {tenggatLewat ? "Perpanjang waktu tayang" : "Ubah listing"}
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-secondary">
            {tenggatLewat
              ? "Waktu tayang listing ini sudah habis. Ubah batas pengambilannya, lalu simpan — listing langsung tayang lagi di katalog."
              : "Perubahan langsung terlihat di katalog setelah disimpan. Perubahan foto tersimpan otomatis saat kamu menekan tombol di bagian foto."}
          </p>
        </div>
      </div>

      {galatUmum && <GalatUmum pesan={galatUmum} />}

      <section className="rounded-md border border-line bg-surface p-4">
        <PhotoManager
          listingId={data.id}
          token={token}
          foto={foto}
          onBerubah={setFoto}
          nonaktif={nonaktif}
        />
      </section>

      <FormListingFields
        nilai={nilai}
        onUbah={ubah}
        galat={galat}
        kategori={kategori}
      />

      <div className="sticky bottom-[76px] z-10 flex flex-col gap-2 md:static md:flex-row">
        <Button type="submit" ukuran="lg" penuh memuat={menyimpan}>
          {menyimpan ? "Menyimpan…" : "Simpan Perubahan"}
        </Button>
        <Button
          type="button"
          varian="outline"
          ukuran="lg"
          penuh
          onClick={onBatal}
          disabled={menyimpan}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
